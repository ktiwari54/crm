import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentsService } from './payments.service';

/** Build a prisma mock whose $transaction runs the callback against `tx`. */
function makePrisma(invoice: { total: number; status?: string; paidAt?: Date | null }) {
  const inv = { id: 'inv1', status: invoice.status ?? 'sent', total: invoice.total, paidAt: invoice.paidAt ?? null };
  const payments: { amount: number; refundedAmount: number; status: string }[] = [];
  const tx = {
    invoice: {
      findFirst: jest.fn().mockResolvedValue(inv),
      findUniqueOrThrow: jest.fn().mockResolvedValue(inv),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(inv, data);
        return Promise.resolve(inv);
      }),
    },
    payment: {
      create: jest.fn().mockImplementation(({ data }) => {
        const p = { id: `p${payments.length + 1}`, refundedAmount: 0, ...data };
        payments.push(p);
        return Promise.resolve(p);
      }),
      findMany: jest.fn().mockImplementation(() =>
        Promise.resolve(payments.filter((p) => ['succeeded', 'partially_refunded'].includes(p.status))),
      ),
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    payment: { findFirst: jest.fn() },
  };
  return { prisma, tx, inv };
}

describe('PaymentsService.record', () => {
  it('marks an invoice paid when the full balance is paid', async () => {
    const { prisma, inv } = makePrisma({ total: 100 });
    const svc = new PaymentsService(prisma as never);
    await svc.record('inv1', { amount: 100 });
    expect(inv.status).toBe('paid');
    expect(inv.paidAt).toBeInstanceOf(Date);
  });

  it('marks an invoice partial on an underpayment', async () => {
    const { prisma, inv } = makePrisma({ total: 100 });
    const svc = new PaymentsService(prisma as never);
    await svc.record('inv1', { amount: 40 });
    expect(inv.status).toBe('partial');
  });

  it('rejects a non-positive amount', async () => {
    const { prisma } = makePrisma({ total: 100 });
    const svc = new PaymentsService(prisma as never);
    await expect(svc.record('inv1', { amount: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PaymentsService.handleStripeWebhook', () => {
  const secret = 'whsec_unit';
  const payload = JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } });

  function sign(body: string, ts = Math.floor(Date.now() / 1000)) {
    const v1 = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
    return `t=${ts},v1=${v1}`;
  }

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  });
  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('rejects an invalid signature', async () => {
    const { prisma } = makePrisma({ total: 100 });
    const svc = new PaymentsService(prisma as never);
    await expect(
      svc.handleStripeWebhook(Buffer.from(payload), 't=1,v1=deadbeef'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid signature and acks the event', async () => {
    const { prisma } = makePrisma({ total: 100 });
    prisma.payment.findFirst.mockResolvedValue(null); // no matching payment → warn + ack
    const svc = new PaymentsService(prisma as never);
    const res = await svc.handleStripeWebhook(Buffer.from(payload), sign(payload));
    expect(res).toEqual({ received: true });
  });
});
