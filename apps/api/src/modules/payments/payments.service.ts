import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentMethod, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }

  /** Record a (manual) payment against an invoice and reconcile its status. */
  async record(
    invoiceId: string,
    input: {
      amount: number;
      method?: PaymentMethod;
      reference?: string;
      notes?: string;
      receivedAt?: string;
      gateway?: string;
      gatewayPaymentId?: string;
      userId?: string;
    },
  ) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          method: input.method ?? 'other',
          status: 'succeeded',
          reference: input.reference,
          notes: input.notes,
          gateway: input.gateway ?? 'manual',
          gatewayPaymentId: input.gatewayPaymentId,
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
          userId: input.userId,
        },
      });

      await this.reconcile(tx, invoiceId);
      return payment;
    });
  }

  /** Refund part or all of a recorded payment and reconcile the invoice. */
  async refund(paymentId: string, amount?: number) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');

      const already = Number(payment.refundedAmount);
      const refundable = Number(payment.amount) - already;
      const refund = amount != null ? Number(amount) : refundable;
      if (refund <= 0 || refund > refundable) {
        throw new BadRequestException('Invalid refund amount');
      }

      const newRefunded = already + refund;
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: newRefunded,
          status: newRefunded >= Number(payment.amount) ? 'refunded' : 'partially_refunded',
        },
      });

      await this.reconcile(tx, payment.invoiceId);
      return updated;
    });
  }

  /**
   * Create a Stripe PaymentIntent for an invoice's outstanding balance via the
   * REST API (no SDK dependency). Falls back to manual mode when STRIPE_SECRET_KEY
   * is not configured.
   */
  async createStripeIntent(invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: { account: { select: { name: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const outstanding = Number(invoice.total) - Number(invoice.amountPaid);
    if (outstanding <= 0) {
      throw new BadRequestException('Invoice has no outstanding balance');
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY not set — returning manual-payment fallback');
      return { gateway: 'manual', outstanding, message: 'Stripe not configured; record payment manually.' };
    }

    const body = new URLSearchParams({
      amount: String(Math.round(outstanding * 100)),
      currency: 'usd',
      'metadata[invoiceId]': invoice.id,
      'metadata[invoiceNumber]': invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber} — ${invoice.account.name}`,
    });

    try {
      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const intent = (await res.json()) as { id?: string; client_secret?: string; error?: unknown };
      if (!res.ok) throw new Error(JSON.stringify(intent.error));

      // Track as a pending payment so reconciliation can complete on webhook.
      await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: outstanding,
          method: 'card',
          status: 'pending',
          gateway: 'stripe',
          gatewayPaymentId: intent.id,
        },
      });

      return { gateway: 'stripe', clientSecret: intent.client_secret, paymentIntentId: intent.id, outstanding };
    } catch (err) {
      this.logger.error(`Stripe intent failed: ${(err as Error).message}`);
      throw new BadRequestException('Failed to create Stripe payment intent');
    }
  }

  /**
   * Verify a Stripe webhook signature and process the event. Confirms or fails
   * the pending Payment created by createStripeIntent, then reconciles the invoice.
   */
  async handleStripeWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = rawBody?.toString('utf8') ?? '';

    if (secret) {
      if (!this.verifyStripeSignature(payload, signature, secret)) {
        throw new BadRequestException('Invalid Stripe signature');
      }
    } else {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set — processing webhook unverified (dev only)');
    }

    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      event = JSON.parse(payload);
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const intent = event.data?.object ?? {};
    const intentId = intent.id as string | undefined;

    switch (event.type) {
      case 'payment_intent.succeeded':
        if (intentId) await this.settleStripePayment(intentId, 'succeeded');
        break;
      case 'payment_intent.payment_failed':
        if (intentId) await this.settleStripePayment(intentId, 'failed');
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  /** Constant-time check of the Stripe-Signature header against the raw payload. */
  private verifyStripeSignature(payload: string, header: string | undefined, secret: string): boolean {
    if (!header) return false;
    const parts = Object.fromEntries(
      header.split(',').map((kv) => kv.split('=') as [string, string]),
    );
    const timestamp = parts.t;
    const sig = parts.v1;
    if (!timestamp || !sig) return false;

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Flip a pending Stripe payment to its final status and reconcile the invoice. */
  private async settleStripePayment(intentId: string, outcome: 'succeeded' | 'failed') {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayPaymentId: intentId, gateway: 'stripe' },
    });
    if (!payment) {
      this.logger.warn(`Stripe webhook: no payment found for intent ${intentId}`);
      return;
    }
    if (payment.status !== 'pending') return; // idempotent — already processed

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: outcome, receivedAt: outcome === 'succeeded' ? new Date() : payment.receivedAt },
      });
      if (outcome === 'succeeded') {
        await this.reconcile(tx, payment.invoiceId);
      }
    });
    this.logger.log(`Stripe payment ${intentId} → ${outcome} (invoice ${payment.invoiceId})`);
  }

  /** Recompute invoice amountPaid + status from its non-failed payments. */
  private async reconcile(tx: Prisma.TransactionClient, invoiceId: string) {
    const payments = await tx.payment.findMany({
      where: { invoiceId, status: { in: ['succeeded', 'partially_refunded'] } },
    });
    const amountPaid = payments.reduce(
      (sum, p) => sum + (Number(p.amount) - Number(p.refundedAmount)),
      0,
    );

    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const total = Number(invoice.total);

    let status = invoice.status;
    let paidAt = invoice.paidAt;
    if (amountPaid >= total && total > 0) {
      status = 'paid';
      paidAt = paidAt ?? new Date();
    } else if (amountPaid > 0) {
      status = 'partial';
      paidAt = null;
    } else if (invoice.status === 'paid' || invoice.status === 'partial') {
      status = 'sent';
      paidAt = null;
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid, status, paidAt },
    });
  }
}
