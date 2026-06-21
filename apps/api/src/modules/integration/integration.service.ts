import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async receiveEvent(body: {
    source?: string;
    event_type: string;
    payload: Record<string, unknown>;
  }) {
    const event = await this.prisma.integrationEvent.create({
      data: {
        source: body.source ?? 'erp',
        eventType: body.event_type,
        payload: body.payload as Prisma.InputJsonValue,
        status: 'received',
      },
    });

    try {
      await this.processEvent(event.id, body.event_type, body.payload);
      await this.prisma.integrationEvent.update({
        where: { id: event.id },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }

    return { id: event.id, status: 'received' };
  }

  private async processEvent(
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    switch (eventType) {
      case 'product.upsert':
        await this.upsertProduct(payload, eventId);
        break;
      case 'inventory.update':
        await this.updateInventory(payload, eventId);
        break;
      case 'account.upsert':
        await this.upsertAccount(payload);
        break;
      case 'sync.heartbeat':
        break;
      default:
        break;
    }
  }

  private async upsertProduct(
    payload: Record<string, unknown>,
    eventId: string,
  ) {
    const erpId = String(payload.erp_id ?? payload.erp_external_id ?? '');
    if (!erpId) return;

    await this.prisma.product.upsert({
      where: { erpExternalId: erpId },
      create: {
        erpExternalId: erpId,
        sku: String(payload.sku ?? erpId),
        name: String(payload.name ?? 'Unknown Product'),
        manufacturerPartNumber: payload.mpn
          ? String(payload.mpn)
          : undefined,
        listPrice: payload.list_price
          ? new Prisma.Decimal(Number(payload.list_price))
          : undefined,
        costPrice: payload.cost_price
          ? new Prisma.Decimal(Number(payload.cost_price))
          : undefined,
        isEol: Boolean(payload.is_eol),
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
      update: {
        name: payload.name ? String(payload.name) : undefined,
        listPrice: payload.list_price
          ? new Prisma.Decimal(Number(payload.list_price))
          : undefined,
        costPrice: payload.cost_price
          ? new Prisma.Decimal(Number(payload.cost_price))
          : undefined,
        isEol: payload.is_eol !== undefined ? Boolean(payload.is_eol) : undefined,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    });
  }

  private async updateInventory(
    payload: Record<string, unknown>,
    eventId: string,
  ) {
    const productErpId = String(payload.product_erp_id ?? '');
    const warehouseCode = String(payload.warehouse_code ?? 'MAIN');
    if (!productErpId) return;

    const product = await this.prisma.product.findFirst({
      where: { erpExternalId: productErpId },
    });
    if (!product) return;

    const warehouse = await this.prisma.warehouse.upsert({
      where: { code: warehouseCode },
      create: { code: warehouseCode, name: warehouseCode },
      update: {},
    });

    const onHand = new Prisma.Decimal(Number(payload.on_hand ?? 0));
    const allocated = new Prisma.Decimal(Number(payload.allocated ?? 0));
    const atp =
      payload.atp !== undefined
        ? new Prisma.Decimal(Number(payload.atp))
        : onHand.sub(allocated);

    await this.prisma.inventoryLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        onHand,
        allocated,
        onOrder: new Prisma.Decimal(Number(payload.on_order ?? 0)),
        inTransit: new Prisma.Decimal(Number(payload.in_transit ?? 0)),
        atp,
        backorderQty: new Prisma.Decimal(Number(payload.backorder_qty ?? 0)),
        lastSyncedAt: new Date(),
        syncEventId: eventId,
      },
      update: {
        onHand,
        allocated,
        onOrder: new Prisma.Decimal(Number(payload.on_order ?? 0)),
        inTransit: new Prisma.Decimal(Number(payload.in_transit ?? 0)),
        atp,
        backorderQty: new Prisma.Decimal(Number(payload.backorder_qty ?? 0)),
        lastSyncedAt: new Date(),
        syncEventId: eventId,
      },
    });
  }

  private async upsertAccount(payload: Record<string, unknown>) {
    const erpId = String(payload.erp_id ?? '');
    if (!erpId) return;

    await this.prisma.account.upsert({
      where: { erpExternalId: erpId },
      create: {
        erpExternalId: erpId,
        name: String(payload.name ?? 'Unknown Account'),
        taxId: payload.tax_id ? String(payload.tax_id) : undefined,
        creditLimit: payload.credit_limit
          ? new Prisma.Decimal(Number(payload.credit_limit))
          : undefined,
        paymentTerms: payload.payment_terms
          ? String(payload.payment_terms)
          : undefined,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
      update: {
        name: payload.name ? String(payload.name) : undefined,
        creditLimit: payload.credit_limit
          ? new Prisma.Decimal(Number(payload.credit_limit))
          : undefined,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    });
  }

  getSyncStatus() {
    return this.prisma.integrationEvent.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { status: 'asc' },
    });
  }

  async emitWriteBack(eventType: string, payload: Record<string, unknown>) {
    const event = await this.prisma.integrationEvent.create({
      data: {
        source: 'crm',
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'processed',
        processedAt: new Date(),
      },
    });

    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { isActive: true },
    });

    for (const sub of subscriptions) {
      const events = sub.events as string[];
      if (Array.isArray(events) && !events.includes(eventType)) continue;
      await this.prisma.webhookDelivery.create({
        data: {
          subscription: { connect: { id: sub.id } },
          eventType,
          payload: payload as Prisma.InputJsonValue,
          status: 'pending',
        },
      });
    }

    return event;
  }
}