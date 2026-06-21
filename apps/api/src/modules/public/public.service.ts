import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(body: {
    companyName: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    description?: string;
  }) {
    return this.prisma.lead.create({
      data: {
        companyName: body.companyName,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        title: body.title,
        description: body.description,
        source: 'web',
        status: 'new',
      },
    });
  }

  async createCase(body: {
    email: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    subject: string;
    description?: string;
    priority?: string;
  }) {
    let accountId: string;
    let contactId: string | undefined;

    const existingContact = await this.prisma.contact.findFirst({
      where: {
        email: { equals: body.email, mode: 'insensitive' },
        deletedAt: null,
      },
      include: { account: true },
    });

    if (existingContact) {
      accountId = existingContact.accountId;
      contactId = existingContact.id;
    } else {
      const account = await this.prisma.account.create({
        data: {
          name: body.companyName ?? body.email.split('@')[1] ?? 'Web Support',
          accountType: 'prospect',
        },
      });
      accountId = account.id;

      if (body.firstName || body.lastName || body.email) {
        const contact = await this.prisma.contact.create({
          data: {
            accountId,
            firstName: body.firstName ?? 'Web',
            lastName: body.lastName ?? 'User',
            email: body.email,
          },
        });
        contactId = contact.id;
      }
    }

    const count = await this.prisma.serviceCase.count();
    const caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const slaDueAt = new Date();
    slaDueAt.setHours(slaDueAt.getHours() + 24);

    return this.prisma.serviceCase.create({
      data: {
        caseNumber,
        accountId,
        contactId,
        subject: body.subject,
        description: body.description,
        priority: (body.priority ?? 'medium') as never,
        status: 'new',
        slaDueAt,
      },
      select: {
        id: true,
        caseNumber: true,
        subject: true,
        status: true,
        slaDueAt: true,
      },
    });
  }
}