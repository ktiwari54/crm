import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

type Level = {
  id: string;
  onHand: number;
  allocated: number;
  onOrder: number;
  inTransit: number;
};

function makePrisma(level: Partial<Level> = {}) {
  const base: Level = { id: 'l1', onHand: 10, allocated: 2, onOrder: 0, inTransit: 0, ...level };
  const tx = {
    product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
    inventoryLevel: {
      upsert: jest.fn().mockResolvedValue(base),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...base, ...data })),
    },
    stockMovement: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    inventoryLevel: { findMany: jest.fn() },
    stockMovement: { findMany: jest.fn() },
  };
  return { prisma, tx };
}

describe('InventoryService.adjust', () => {
  const input = { productId: 'p1', warehouseId: 'w1', quantity: 5 };

  it('increases on-hand for a receipt and records balanceAfter', async () => {
    const { prisma, tx } = makePrisma({ onHand: 10 });
    const svc = new InventoryService(prisma as never);
    const { level, movement } = await svc.adjust({ ...input, type: 'receipt' });
    expect(level.onHand).toBe(15);
    expect(movement.balanceAfter).toBe(15);
    expect(tx.stockMovement.create).toHaveBeenCalled();
  });

  it('decreases on-hand for a shipment', async () => {
    const { prisma } = makePrisma({ onHand: 10 });
    const svc = new InventoryService(prisma as never);
    const { level } = await svc.adjust({ ...input, type: 'shipment', quantity: 4 });
    expect(level.onHand).toBe(6);
  });

  it('treats adjustment quantity as a signed delta', async () => {
    const { prisma } = makePrisma({ onHand: 10 });
    const svc = new InventoryService(prisma as never);
    const { level } = await svc.adjust({ ...input, type: 'adjustment', quantity: -3 });
    expect(level.onHand).toBe(7);
  });

  it('moves allocated (not on-hand) for a reservation and lowers ATP', async () => {
    const { prisma } = makePrisma({ onHand: 10, allocated: 2 });
    const svc = new InventoryService(prisma as never);
    const { level } = await svc.adjust({ ...input, type: 'reservation', quantity: 3 });
    expect(level.onHand).toBe(10);
    expect(level.allocated).toBe(5);
    expect(level.atp).toBe(5); // 10 + 0 + 0 - 5
  });

  it('rejects a movement that would drive on-hand below zero', async () => {
    const { prisma } = makePrisma({ onHand: 2 });
    const svc = new InventoryService(prisma as never);
    await expect(svc.adjust({ ...input, type: 'shipment', quantity: 10 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a zero quantity', async () => {
    const { prisma } = makePrisma();
    const svc = new InventoryService(prisma as never);
    await expect(svc.adjust({ ...input, type: 'receipt', quantity: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('InventoryService.lowStock', () => {
  it('returns only levels at or below reorder point with a suggested order qty', async () => {
    const { prisma } = makePrisma();
    prisma.inventoryLevel.findMany.mockResolvedValue([
      { productId: 'p1', warehouseId: 'w1', onHand: 5, atp: 5, reorderPoint: 10, reorderQuantity: 50, safetyStock: 2, product: { sku: 'A', name: 'A' }, warehouse: { name: 'Main', code: 'MAIN' } },
      { productId: 'p2', warehouseId: 'w1', onHand: 20, atp: 20, reorderPoint: 10, reorderQuantity: 0, safetyStock: 2, product: { sku: 'B', name: 'B' }, warehouse: { name: 'Main', code: 'MAIN' } },
    ]);
    const svc = new InventoryService(prisma as never);
    const result = await svc.lowStock();
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('A');
    expect(result[0].suggestedOrderQty).toBe(50); // uses reorderQuantity when set
  });
});
