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