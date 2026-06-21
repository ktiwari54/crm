import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MdfService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.mdfRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        partnerAccount: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.mdfRequest.findUnique({
      where: { id },
      include: { partnerAccount: true, requestedBy: true, reviewedBy: true },
    });
    if (!req) throw new NotFoundException('MDF request not found');
    return req;
  }

  async create(data: Prisma.MdfRequestCreateInput) {
    const count = await this.prisma.mdfRequest.count();
    const requestNumber = `MDF-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.mdfRequest.create({
      data: { ...data, requestNumber },
      include: { partnerAccount: true, requestedBy: true },
    });
  }

  async review(id: string, reviewerId: string, status: 'approved' | 'rejected', reviewNotes?: string) {
    await this.findOne(id);
    return this.prisma.mdfRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: reviewerId,
        reviewNotes,
        approvedAt: status === 'approved' ? new Date() : undefined,
      },
      include: { partnerAccount: true, requestedBy: true, reviewedBy: true },
    });
  }
}