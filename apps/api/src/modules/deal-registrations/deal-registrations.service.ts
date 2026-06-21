import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DealRegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.dealRegistration.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        partnerAccount: { select: { id: true, name: true } },
        registeredBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reg = await this.prisma.dealRegistration.findUnique({
      where: { id },
      include: {
        partnerAccount: true,
        registeredBy: true,
        reviewedBy: true,
      },
    });
    if (!reg) throw new NotFoundException('Deal registration not found');
    return reg;
  }

  async create(data: Prisma.DealRegistrationCreateInput) {
    const count = await this.prisma.dealRegistration.count();
    const registrationNumber = `DR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.dealRegistration.create({
      data: { ...data, registrationNumber },
      include: {
        partnerAccount: true,
        registeredBy: true,
      },
    });
  }

  async review(id: string, reviewerId: string, status: 'approved' | 'rejected', notes?: string) {
    await this.findOne(id);
    return this.prisma.dealRegistration.update({
      where: { id },
      data: {
        status,
        reviewedById: reviewerId,
        notes,
        approvedAt: status === 'approved' ? new Date() : undefined,
      },
      include: {
        partnerAccount: true,
        registeredBy: true,
        reviewedBy: true,
      },
    });
  }
}