import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationService } from '../integration/integration.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: IntegrationService,
  ) {}

  findAll(status?: string) {
    return this.prisma.order.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        account: true,
        quote: true,
        deal: true,
        owner: true,
        lineItems: { include: { product: true, warehouse: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: true,
        quote: true,
        deal: true,
        owner: true,
        lineItems: { include: { product: true, warehouse: true } },
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async createFromQuote(quoteId: string, ownerId?: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: { lineItems: { include: { product: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'accepted') {
      throw new BadRequestException('Quote must be accepted before creating an order');
    }

    const existing = await this.prisma.order.findFirst({
      where: { quoteId, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Order already exists for this quote');

    const count = await this.prisma.order.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        account: { connect: { id: quote.accountId } },
        quote: { connect: { id: quote.id } },
        deal: quote.dealId ? { connect: { id: quote.dealId } } : undefined,
        owner: ownerId ? { connect: { id: ownerId } } : undefined,
        status: 'submitted',
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        lineItems: {
          create: quote.lineItems.map((li, idx) => ({
            lineNumber: idx + 1,
            product: { connect: { id: li.productId } },
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
            warehouse: li.warehouseId
              ? { connect: { id: li.warehouseId } }
              : undefined,
          })),
        },
      },
      include: {
        account: true,
        lineItems: { include: { product: true } },
      },
    });

    await this.integration.emitWriteBack('order.create', {
      order_id: order.id,
      order_number: order.orderNumber,
      account_id: order.accountId,
      quote_id: quoteId,
      total: Number(order.total),
      line_items: order.lineItems.map((li) => ({
        sku: li.product.sku,
        quantity: Number(li.quantity),
        unit_price: Number(li.unitPrice),
      })),
    });

    return order;
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: {
        status: status as never,
        ...(status === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
      include: { account: true, lineItems: { include: { product: true } } },
    });
  }
}