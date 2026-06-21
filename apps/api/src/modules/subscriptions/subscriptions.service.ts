import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingInterval, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type ItemInput = {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type CreateInput = {
  accountId: string;
  name: string;
  interval?: BillingInterval;
  intervalCount?: number;
  startDate: string;
  trialEndsAt?: string;
  contractId?: string;
  ownerId?: string;
  autoRenew?: boolean;
  notes?: string;
  items: ItemInput[];
};

/** Advance a date by N billing intervals. */
function addInterval(date: Date, interval: BillingInterval, count: number): Date {
  const d = new Date(date);
  switch (interval) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * count);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + count);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * count);
      break;
    case 'semiannual':
      d.setMonth(d.getMonth() + 6 * count);
      break;
    case 'annual':
      d.setFullYear(d.getFullYear() + count);
      break;
  }
  return d;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.subscription.findMany({
      where: { deletedAt: null, ...(status ? { status: status as never } : {}) },
      include: {
        account: { select: { id: true, name: true } },
        items: { include: { product: { select: { sku: true, name: true } } } },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
        contract: { select: { id: true, contractNumber: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: { select: { sku: true, name: true } } } },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async create(input: CreateInput) {
    if (!input.items?.length) {
      throw new BadRequestException('At least one subscription item is required');
    }

    const interval = input.interval ?? 'monthly';
    const intervalCount = input.intervalCount ?? 1;
    const startDate = new Date(input.startDate);
    const trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
    // First bill date is the trial end (if any) otherwise the start date.
    const nextBillingDate = trialEndsAt ?? startDate;

    const count = await this.prisma.subscription.count();
    const subscriptionNumber = `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.subscription.create({
      data: {
        subscriptionNumber,
        name: input.name,
        status: trialEndsAt ? 'trialing' : 'active',
        interval,
        intervalCount,
        startDate,
        trialEndsAt,
        nextBillingDate,
        currentPeriodEnd: addInterval(nextBillingDate, interval, intervalCount),
        autoRenew: input.autoRenew ?? true,
        notes: input.notes,
        account: { connect: { id: input.accountId } },
        ...(input.contractId ? { contract: { connect: { id: input.contractId } } } : {}),
        ...(input.ownerId ? { owner: { connect: { id: input.ownerId } } } : {}),
        items: {
          create: input.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        },
      },
      include: { items: true, account: { select: { name: true } } },
    });
  }

  async setStatus(id: string, status: 'active' | 'paused' | 'canceled') {
    const sub = await this.prisma.subscription.findFirst({ where: { id, deletedAt: null } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const data: Prisma.SubscriptionUpdateInput = { status };
    if (status === 'canceled') {
      data.canceledAt = new Date();
      data.autoRenew = false;
      data.nextBillingDate = null;
    }
    if (status === 'active' && !sub.nextBillingDate) {
      // Resuming a paused/canceled sub — bill from today.
      data.nextBillingDate = new Date();
    }
    return this.prisma.subscription.update({ where: { id }, data });
  }

  /** Generate one invoice for a subscription and advance its billing cycle. */
  async generateInvoice(id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, deletedAt: null },
      include: { items: { include: { product: true } } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!sub.items.length) throw new BadRequestException('Subscription has no items');

    const subtotal = sub.items.reduce(
      (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice),
      0,
    );

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const periodStart = sub.nextBillingDate ?? new Date();
    const nextBillingDate = addInterval(periodStart, sub.interval, sub.intervalCount);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          status: 'sent',
          subtotal,
          taxAmount: 0,
          total: subtotal,
          dueDate,
          account: { connect: { id: sub.accountId } },
          subscription: { connect: { id: sub.id } },
          lineItems: {
            create: sub.items.map((it) => ({
              description: it.product
                ? `${it.product.sku} — ${it.description}`
                : it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: Number(it.quantity) * Number(it.unitPrice),
            })),
          },
        },
        include: { lineItems: true },
      });

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: sub.status === 'trialing' ? 'active' : sub.status,
          nextBillingDate,
          currentPeriodEnd: addInterval(nextBillingDate, sub.interval, sub.intervalCount),
        },
      });

      return invoice;
    });
  }

  /** Bill every active subscription whose nextBillingDate is due (cron-friendly). */
  async runBilling(asOf?: string) {
    const cutoff = asOf ? new Date(asOf) : new Date();
    const due = await this.prisma.subscription.findMany({
      where: {
        deletedAt: null,
        status: { in: ['active', 'trialing'] },
        nextBillingDate: { lte: cutoff },
      },
      select: { id: true, subscriptionNumber: true },
    });

    const results: { subscriptionNumber: string; invoiceNumber?: string; error?: string }[] = [];
    for (const sub of due) {
      try {
        const inv = await this.generateInvoice(sub.id);
        results.push({ subscriptionNumber: sub.subscriptionNumber, invoiceNumber: inv.invoiceNumber });
      } catch (err) {
        results.push({
          subscriptionNumber: sub.subscriptionNumber,
          error: err instanceof Error ? err.message : 'failed',
        });
      }
    }

    return { processed: results.length, generated: results.filter((r) => r.invoiceNumber).length, results };
  }
}
