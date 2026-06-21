import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({
      data,
      include: { account: true },
    });
  }

  async update(id: string, data: Prisma.ContactUpdateInput) {
    await this.findOne(id);
    return this.prisma.contact.update({
      where: { id },
      data,
      include: { account: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}