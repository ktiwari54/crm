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

  /** Bulk-create accounts from parsed CSV rows. */
  async importRows(rows: Record<string, string>[], userId?: string) {
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r.name || r.accountName || r['Account Name'] || r.company || r['Company Name'];
      if (!name) {
        errors.push({ row: i + 1, message: 'missing name' });
        continue;
      }
      try {
        await this.create(
          {
            name,
            accountType: (r.accountType as never) || 'customer',
            industry: r.industry || undefined,
            country: r.country || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            website: r.website || undefined,
            vatNumber: r.vatNumber || r.vat || undefined,
            gstNumber: r.gstNumber || r.gst || undefined,
            tradeLicenseNumber: r.tradeLicenseNumber || r.tradeLicense || undefined,
            registrationNumber: r.registrationNumber || undefined,
            paymentTerms: r.paymentTerms || undefined,
          } as Prisma.AccountCreateInput,
          userId,
        );
        created.push(name);
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'failed' });
      }
    }
    return { imported: created.length, failed: errors.length, errors };
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