import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: { owner: true, territory: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { owner: true, territory: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  create(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({
      data,
      include: { owner: true, territory: true },
    });
  }

  async update(id: string, data: Prisma.LeadUpdateInput) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data,
      include: { owner: true, territory: true },
    });
  }

  async convert(id: string, body: { accountId?: string; createDeal?: boolean }) {
    const lead = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      let accountId = body.accountId;

      if (!accountId) {
        const account = await tx.account.create({
          data: {
            name: lead.companyName,
            accountType: 'prospect',
            owner: lead.ownerId ? { connect: { id: lead.ownerId } } : undefined,
            territory: lead.territoryId
              ? { connect: { id: lead.territoryId } }
              : undefined,
          },
        });
        accountId = account.id;
      }

      const contact = await tx.contact.create({
        data: {
          account: { connect: { id: accountId } },
          firstName: lead.firstName ?? 'Unknown',
          lastName: lead.lastName ?? lead.companyName,
          email: lead.email,
          phone: lead.phone,
          title: lead.title,
          isPrimary: true,
        },
      });

      let dealId: string | undefined;
      if (body.createDeal) {
        const stage = await tx.pipelineStage.findFirst({
          where: { name: 'RFQ Received' },
        });
        if (stage) {
          const deal = await tx.deal.create({
            data: {
              name: `${lead.companyName} - Opportunity`,
              account: { connect: { id: accountId } },
              owner: lead.ownerId ? { connect: { id: lead.ownerId } } : undefined,
              pipelineStage: { connect: { id: stage.id } },
              sourceLead: { connect: { id: lead.id } },
            },
          });
          dealId = deal.id;
        }
      }

      return tx.lead.update({
        where: { id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          convertedAccount: { connect: { id: accountId } },
          convertedContact: { connect: { id: contact.id } },
          ...(dealId ? { convertedDeal: { connect: { id: dealId } } } : {}),
        },
        include: {
          convertedAccount: true,
          convertedContact: true,
          convertedDeal: true,
        },
      });
    });
  }
}