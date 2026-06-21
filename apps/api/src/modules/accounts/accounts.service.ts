import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(data: Prisma.AccountCreateInput) {
    return this.prisma.account.create({
      data,
      include: { owner: true, territory: true },
    });
  }

  async update(id: string, data: Prisma.AccountUpdateInput) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data,
      include: { owner: true, territory: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}