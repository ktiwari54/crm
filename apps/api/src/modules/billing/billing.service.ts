import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  findSchedules(invoiceId?: string) {
    return this.prisma.billingSchedule.findMany({
      where: invoiceId ? { invoiceId } : undefined,
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, account: { select: { name: true } } },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.billingSchedule.findUnique({
      where: { id },
      include: {
        invoice: { include: { account: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!schedule) throw new NotFoundException('Billing schedule not found');
    return schedule;
  }

  async create(body: {
    invoiceId: string;
    name: string;
    installments: { dueDate: string; amount: number }[];
  }) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: body.invoiceId, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const totalAmount = body.installments.reduce((sum, i) => sum + i.amount, 0);

    return this.prisma.billingSchedule.create({
      data: {
        name: body.name,
        status: 'active',
        totalAmount,
        erpSyncStatus: 'pending',
        invoice: { connect: { id: body.invoiceId } },
        installments: {
          create: body.installments.map((inst, idx) => ({
            installmentNumber: idx + 1,
            dueDate: new Date(inst.dueDate),
            amount: inst.amount,
            status: 'pending',
          })),
        },
      },
      include: {
        invoice: { select: { invoiceNumber: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
  }

  async syncToErp(id: string) {
    const schedule = await this.findOne(id);
    return this.prisma.billingSchedule.update({
      where: { id },
      data: {
        erpSyncStatus: 'synced',
        erpSyncedAt: new Date(),
      },
      include: { installments: true, invoice: { select: { invoiceNumber: true } } },
    });
  }
}