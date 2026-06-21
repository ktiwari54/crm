import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

function makePrisma() {
  const captured: { data?: Record<string, unknown> } = {};
  const prisma = {
    subscription: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) => {
        captured.data = data;
        return Promise.resolve({ id: 's1', ...data });
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return { prisma, captured };
}

const baseInput = {
  accountId: 'a1',
  name: 'Test sub',
  startDate: '2026-01-15',
  items: [{ description: 'Seat', quantity: 2, unitPrice: 10 }],
};

describe('SubscriptionsService.create', () => {
  it('sets the first bill date to the start date and advances the period by one interval', async () => {
    const { prisma, captured } = makePrisma();
    const svc = new SubscriptionsService(prisma as never);
    await svc.create({ ...baseInput, interval: 'monthly' });
    expect((captured.data!.nextBillingDate as Date).toISOString().slice(0, 10)).toBe('2026-01-15');
    expect((captured.data!.currentPeriodEnd as Date).toISOString().slice(0, 10)).toBe('2026-02-15');
    expect(captured.data!.status).toBe('active');
  });

  it('starts in trialing and bills at trial end when a trial is set', async () => {
    const { prisma, captured } = makePrisma();
    const svc = new SubscriptionsService(prisma as never);
    await svc.create({ ...baseInput, interval: 'annual', trialEndsAt: '2026-02-01' });
    expect(captured.data!.status).toBe('trialing');
    expect((captured.data!.nextBillingDate as Date).toISOString().slice(0, 10)).toBe('2026-02-01');
    expect((captured.data!.currentPeriodEnd as Date).toISOString().slice(0, 10)).toBe('2027-02-01');
  });

  it('rejects a subscription with no items', async () => {
    const { prisma } = makePrisma();
    const svc = new SubscriptionsService(prisma as never);
    await expect(svc.create({ ...baseInput, items: [] })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SubscriptionsService.runBilling', () => {
  it('reports zero processed when nothing is due', async () => {
    const { prisma } = makePrisma();
    const svc = new SubscriptionsService(prisma as never);
    const result = await svc.runBilling();
    expect(result).toEqual({ processed: 0, generated: 0, results: [] });
  });
});
