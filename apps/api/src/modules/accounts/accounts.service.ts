import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeTrackingService } from '../change-tracking/change-tracking.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: ChangeTrackingService,
  ) {}

  findAll(search?: string) {
    const where: Prisma.AccountWhereInput = {
      deletedAt: null,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    };
    return this.prisma.account.findMany({
      where,
      include: { owner: true, territory: true, priceBook: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: true,
        territory: true,
        priceBook: true,
        contacts: { where: { deletedAt: null } },
        childAccounts: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async create(data: Prisma.AccountCreateInput, userId?: string) {
    const account = await this.prisma.account.create({
      data,
      include: { owner: true, territory: true },
    });
    await this.tracking.recordCreate('account', account.id, account as never, userId);
    return account;
  }

  async update(id: string, data: Prisma.AccountUpdateInput, userId?: string) {
    const before = await this.findOne(id);
    const after = await this.prisma.account.update({
      where: { id },
      data,
      include: { owner: true, territory: true },
    });
    await this.tracking.recordUpdate('account', id, before as never, after as never, userId);
    return after;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    const removed = await this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.tracking.recordDelete('account', id, userId);
    return removed;
  }
}