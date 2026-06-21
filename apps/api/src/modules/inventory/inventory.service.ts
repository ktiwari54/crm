import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AdjustInput = {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  userId?: string;
};

// Movement types that change physical on-hand stock vs. only the allocated reserve.
const ON_HAND_INCREASE: StockMovementType[] = ['receipt', 'transfer_in', 'return'];
const ON_HAND_DECREASE: StockMovementType[] = ['shipment', 'transfer_out'];

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply a single stock movement transactionally: update the inventory level
   * and append an immutable ledger row with the resulting balance.
   * `quantity` is a magnitude for typed movements; for `adjustment` it is a
   * signed delta (negative allowed).
   */
  async adjust(input: AdjustInput) {
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      throw new BadRequestException('quantity must be a non-zero number');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: input.productId, deletedAt: null },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Product not found');

      const level = await tx.inventoryLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: input.productId,
            warehouseId: input.warehouseId,
          },
        },
        create: { productId: input.productId, warehouseId: input.warehouseId },
        update: {},
      });

      let onHand = Number(level.onHand);
      let allocated = Number(level.allocated);
      const onOrder = Number(level.onOrder);
      const inTransit = Number(level.inTransit);

      if (ON_HAND_INCREASE.includes(input.type)) {
        onHand += Math.abs(qty);
      } else if (ON_HAND_DECREASE.includes(input.type)) {
        onHand -= Math.abs(qty);
      } else if (input.type === 'reservation') {
        allocated += Math.abs(qty);
      } else if (input.type === 'release') {
        allocated = Math.max(0, allocated - Math.abs(qty));
      } else {
        // adjustment — signed delta
        onHand += qty;
      }

      if (onHand < 0) {
        throw new BadRequestException('Movement would drive on-hand below zero');
      }

      const atp = onHand + onOrder + inTransit - allocated;

      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { onHand, allocated, atp, lastSyncedAt: new Date() },
        include: { warehouse: true, product: { select: { sku: true, name: true } } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          type: input.type,
          quantity: qty,
          balanceAfter: onHand,
          reason: input.reason,
          reference: input.reference,
          userId: input.userId,
        },
      });

      return { level: updated, movement };
    });
  }

  /** Move stock between two warehouses as a paired out/in movement. */
  async transfer(input: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reason?: string;
    reference?: string;
    userId?: string;
  }) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }
    const qty = Math.abs(Number(input.quantity));
    const out = await this.adjust({
      productId: input.productId,
      warehouseId: input.fromWarehouseId,
      type: 'transfer_out',
      quantity: qty,
      reason: input.reason,
      reference: input.reference ?? `transfer:${input.toWarehouseId}`,
      userId: input.userId,
    });
    const into = await this.adjust({
      productId: input.productId,
      warehouseId: input.toWarehouseId,
      type: 'transfer_in',
      quantity: qty,
      reason: input.reason,
      reference: input.reference ?? `transfer:${input.fromWarehouseId}`,
      userId: input.userId,
    });
    return { from: out.level, to: into.level };
  }

  /** Set reorder policy (reorder point / quantity / safety stock) for a level. */
  async setReorderPolicy(
    productId: string,
    warehouseId: string,
    policy: { reorderPoint?: number; reorderQuantity?: number; safetyStock?: number },
  ) {
    const data: Prisma.InventoryLevelUncheckedUpdateInput = {};
    if (policy.reorderPoint != null) data.reorderPoint = policy.reorderPoint;
    if (policy.reorderQuantity != null) data.reorderQuantity = policy.reorderQuantity;
    if (policy.safetyStock != null) data.safetyStock = policy.safetyStock;

    return this.prisma.inventoryLevel.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: { productId, warehouseId, ...data } as Prisma.InventoryLevelUncheckedCreateInput,
      update: data,
      include: { warehouse: true, product: { select: { sku: true, name: true } } },
    });
  }

  /** Levels at or below their reorder point, with a suggested reorder quantity. */
  async lowStock() {
    const levels = await this.prisma.inventoryLevel.findMany({
      where: { reorderPoint: { gt: 0 } },
      include: {
        warehouse: true,
        product: { select: { id: true, sku: true, name: true, isActive: true } },
      },
      orderBy: { onHand: 'asc' },
    });

    return levels
      .filter((l) => Number(l.onHand) <= Number(l.reorderPoint))
      .map((l) => ({
        productId: l.productId,
        warehouseId: l.warehouseId,
        sku: l.product.sku,
        name: l.product.name,
        warehouse: l.warehouse.name,
        warehouseCode: l.warehouse.code,
        onHand: Number(l.onHand),
        atp: Number(l.atp),
        reorderPoint: Number(l.reorderPoint),
        safetyStock: Number(l.safetyStock),
        suggestedOrderQty:
          Number(l.reorderQuantity) > 0
            ? Number(l.reorderQuantity)
            : Math.max(0, Number(l.reorderPoint) + Number(l.safetyStock) - Number(l.onHand)),
      }));
  }

  /** Ledger history for a product (optionally scoped to a warehouse). */
  movements(productId: string, warehouseId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId, ...(warehouseId ? { warehouseId } : {}) },
      include: {
        warehouse: { select: { name: true, code: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
