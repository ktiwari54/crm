import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.portalAccess.findMany({
      where: { isActive: true },
      include: {
        account: { select: { id: true, name: true, accountType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const access = await this.prisma.portalAccess.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!access) throw new NotFoundException('Portal access not found');
    return access;
  }

  async grantAccess(accountId: string, contactEmail: string) {
    const token = randomBytes(24).toString('hex');
    return this.prisma.portalAccess.upsert({
      where: {
        accountId_contactEmail: { accountId, contactEmail },
      },
      update: { accessToken: token, isActive: true },
      create: { accountId, contactEmail, accessToken: token },
      include: { account: true },
    });
  }

  async getPortalMe(access: { accountId: string; contactEmail: string }) {
    const summary = await this.getPortalSummary(access.accountId);
    return {
      contactEmail: access.contactEmail,
      ...summary,
    };
  }

  async getPortalSummary(accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, deletedAt: null },
      include: {
        quotes: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, quoteNumber: true, status: true, total: true },
        },
        orders: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, status: true, total: true },
        },
        invoices: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, invoiceNumber: true, status: true, total: true },
        },
        serviceCases: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, caseNumber: true, subject: true, status: true },
        },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    const { quotes, orders, invoices, serviceCases, ...rest } = account;
    return {
      account: rest,
      quotes,
      orders,
      invoices,
      cases: serviceCases,
      portalUrl: `http://localhost:3000/portal?account=${accountId}`,
    };
  }
}