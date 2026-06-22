import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeTrackingService } from '../change-tracking/change-tracking.service';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: ChangeTrackingService,
  ) {}

  findAll(accountId?: string) {
    return this.prisma.contact.findMany({
      where: {
        deletedAt: null,
        ...(accountId ? { accountId } : {}),
      },
      include: { account: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: { account: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(data: Prisma.ContactCreateInput, userId?: string) {
    const contact = await this.prisma.contact.create({
      data,
      include: { account: true },
    });
    await this.tracking.recordCreate('contact', contact.id, contact as never, userId);
    return contact;
  }

  async update(id: string, data: Prisma.ContactUpdateInput, userId?: string) {
    const before = await this.findOne(id);
    const after = await this.prisma.contact.update({
      where: { id },
      data,
      include: { account: true },
    });
    await this.tracking.recordUpdate('contact', id, before as never, after as never, userId);
    return after;
  }

  /** Bulk-create contacts from parsed CSV rows. Resolves account by id or name. */
  async importRows(rows: Record<string, string>[], userId?: string) {
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const firstName = r.firstName || r['First Name'];
      const lastName = r.lastName || r['Last Name'];
      if (!firstName || !lastName) {
        errors.push({ row: i + 1, message: 'missing firstName/lastName' });
        continue;
      }
      let accountId: string | undefined = r.accountId;
      const accountName = r.accountName || r['Account Name'] || r.account || r.company;
      if (!accountId && accountName) {
        const acc = await this.prisma.account.findFirst({
          where: { deletedAt: null, name: { equals: accountName, mode: 'insensitive' } },
          select: { id: true },
        });
        accountId = acc?.id;
      }
      if (!accountId) {
        errors.push({ row: i + 1, message: `account not found: ${accountName || '(none provided)'}` });
        continue;
      }
      try {
        await this.create(
          {
            account: { connect: { id: accountId as string } },
            firstName,
            lastName,
            email: r.email || undefined,
            phone: r.phone || undefined,
            mobile: r.mobile || undefined,
            title: r.title || undefined,
            country: r.country || undefined,
          } as Prisma.ContactCreateInput,
          userId,
        );
        created.push(`${firstName} ${lastName}`);
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'failed' });
      }
    }
    return { imported: created.length, failed: errors.length, errors };
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    const removed = await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.tracking.recordDelete('contact', id, userId);
    return removed;
  }
}