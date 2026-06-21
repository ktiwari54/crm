import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RmaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.rmaRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        asset: {
          include: { product: { select: { sku: true, name: true } } },
        },
        account: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rma = await this.prisma.rmaRequest.findUnique({
      where: { id },
      include: {
        asset: { include: { product: true } },
        account: true,
      },
    });
    if (!rma) throw new NotFoundException('RMA not found');
    return rma;
  }

  async create(data: Prisma.RmaRequestCreateInput) {
    const count = await this.prisma.rmaRequest.count();
    const rmaNumber = `RMA-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.rmaRequest.create({
      data: { ...data, rmaNumber },
      include: {
        asset: { include: { product: true } },
        account: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.rmaRequest.update({
      where: { id },
      data: {
        status: status as never,
        resolvedAt: ['closed', 'replaced', 'repaired', 'rejected'].includes(status)
          ? new Date()
          : undefined,
      },
      include: { asset: true, account: true },
    });
  }
}