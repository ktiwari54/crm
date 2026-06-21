import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FieldServiceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string, from?: string, to?: string) {
    const scheduledFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    return this.prisma.fieldWorkOrder.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(scheduledFilter ? { scheduledAt: scheduledFilter } : {}),
      },
      include: {
        account: { select: { id: true, name: true } },
        asset: { select: { id: true, serialNumber: true, product: { select: { sku: true, name: true } } } },
        technician: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.fieldWorkOrder.findUnique({
      where: { id },
      include: {
        account: true,
        asset: { include: { product: true } },
        technician: true,
      },
    });
    if (!order) throw new NotFoundException('Work order not found');
    return order;
  }

  async create(body: {
    accountId: string;
    assetId?: string;
    technicianId?: string;
    title: string;
    description?: string;
    scheduledAt?: string;
    serviceAddress?: string;
  }) {
    const count = await this.prisma.fieldWorkOrder.count();
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.fieldWorkOrder.create({
      data: {
        workOrderNumber,
        title: body.title,
        description: body.description,
        serviceAddress: body.serviceAddress,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: 'scheduled',
        account: { connect: { id: body.accountId } },
        asset: body.assetId ? { connect: { id: body.assetId } } : undefined,
        technician: body.technicianId ? { connect: { id: body.technicianId } } : undefined,
      },
      include: {
        account: { select: { name: true } },
        asset: { select: { serialNumber: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.fieldWorkOrder.update({
      where: { id },
      data: {
        status: status as never,
        completedAt: status === 'completed' ? new Date() : undefined,
      },
      include: {
        account: { select: { name: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    });
  }
}