import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GdprService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.gdprRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    body: {
      requestType: string;
      email: string;
      contactId?: string;
      notes?: string;
    },
    requestedById?: string,
  ) {
    const contact = body.contactId
      ? await this.prisma.contact.findFirst({ where: { id: body.contactId, deletedAt: null } })
      : await this.prisma.contact.findFirst({
          where: { email: { equals: body.email, mode: 'insensitive' }, deletedAt: null },
        });

    const request = await this.prisma.gdprRequest.create({
      data: {
        requestType: body.requestType as never,
        email: body.email,
        contactId: contact?.id ?? body.contactId ?? null,
        notes: body.notes,
        requestedById: requestedById ?? null,
        status: 'pending',
      },
      include: { contact: true },
    });

    if (body.requestType === 'export') {
      return this.processExport(request.id);
    }
    if (body.requestType === 'delete') {
      return this.processDelete(request.id);
    }

    return request;
  }

  async processExport(id: string) {
    const req = await this.prisma.gdprRequest.findUnique({
      where: { id },
      include: { contact: { include: { account: { select: { name: true } } } } },
    });
    if (!req) throw new NotFoundException('GDPR request not found');

    let exportPayload: Record<string, unknown> = { email: req.email };

    if (req.contact) {
      const contact = req.contact;
      const [activities, cases] = await Promise.all([
        this.prisma.activity.findMany({
          where: { relatedType: 'contact', relatedId: contact.id },
          take: 20,
          select: { subject: true, activityType: true, createdAt: true },
        }),
        this.prisma.serviceCase.findMany({
          where: { contactId: contact.id },
          take: 10,
          select: { caseNumber: true, subject: true, status: true },
        }),
      ]);

      exportPayload = {
        contact: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
          account: contact.account.name,
        },
        activities,
        cases,
        exportedAt: new Date().toISOString(),
      };
    }

    return this.prisma.gdprRequest.update({
      where: { id },
      data: {
        status: 'completed',
        exportPayload: exportPayload as never,
        completedAt: new Date(),
      },
    });
  }

  async processDelete(id: string) {
    const req = await this.prisma.gdprRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('GDPR request not found');

    if (req.contactId) {
      await this.prisma.contact.update({
        where: { id: req.contactId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          firstName: 'Redacted',
          lastName: 'Contact',
          email: null,
          phone: null,
          mobile: null,
        },
      });
    }

    return this.prisma.gdprRequest.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: (req.notes ?? '') + ' — contact data redacted per right-to-delete',
      },
    });
  }
}