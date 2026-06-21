import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        account: true,
        order: true,
        lineItems: true,
        billingSchedules: { include: { installments: { orderBy: { installmentNumber: 'asc' } } } },
        payments: { orderBy: { receivedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: true,
        order: true,
        lineItems: true,
        billingSchedules: { include: { installments: { orderBy: { installmentNumber: 'asc' } } } },
        payments: { orderBy: { receivedAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async createFromOrder(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { lineItems: { include: { product: true } }, account: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        account: { connect: { id: order.accountId } },
        order: { connect: { id: order.id } },
        status: 'sent',
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        total: order.total,
        dueDate,
        lineItems: {
          create: order.lineItems.map((li) => ({
            description: `${li.product.sku} — ${li.product.name}`,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
          })),
        },
      },
      include: { account: true, order: true, lineItems: true },
    });
  }
}