import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.marketingCampaign.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: { account: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        owner: true,
        members: { include: { account: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  create(data: Prisma.MarketingCampaignCreateInput) {
    return this.prisma.marketingCampaign.create({
      data,
      include: {
        owner: true,
        members: { include: { account: true } },
      },
    });
  }

  async enrollAccounts(campaignId: string, accountIds: string[]) {
    await this.findOne(campaignId);
    await this.prisma.campaignMember.createMany({
      data: accountIds.map((accountId) => ({ campaignId, accountId })),
      skipDuplicates: true,
    });
    return this.findOne(campaignId);
  }
}