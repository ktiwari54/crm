import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlueprintsService } from '../blueprints/blueprints.service';
import { FieldHistoryService } from '../field-history/field-history.service';
import { PlaybooksService } from '../playbooks/playbooks.service';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldHistory: FieldHistoryService,
    private readonly blueprints: BlueprintsService,
    private readonly playbooks: PlaybooksService,
  ) {}

  findAll(stageId?: string, pipelineId?: string) {
    return this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        ...(stageId ? { pipelineStageId: stageId } : {}),
        ...(pipelineId
          ? { pipelineStage: { pipelineId } }
          : {}),
      },
      include: {
        account: true,
        owner: true,
        pipelineStage: true,
        dealContacts: { include: { contact: true } },
        teamMembers: { include: { user: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: true,
        owner: true,
        pipelineStage: true,
        quotes: true,
        dealContacts: { include: { contact: true } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  create(data: Prisma.DealCreateInput) {
    return this.prisma.deal.create({
      data,
      include: { account: true, pipelineStage: true, owner: true },
    });
  }

  async update(
    id: string,
    data: Prisma.DealUpdateInput,
    changedById?: string,
  ) {
    const existing = await this.findOne(id);
    const newStageId =
      data.pipelineStage &&
      typeof data.pipelineStage === 'object' &&
      'connect' in data.pipelineStage &&
      data.pipelineStage.connect &&
      typeof data.pipelineStage.connect === 'object' &&
      'id' in data.pipelineStage.connect
        ? String(data.pipelineStage.connect.id)
        : undefined;

    if (newStageId && newStageId !== existing.pipelineStageId) {
      await this.blueprints.enforceDealStageMove(id, newStageId);
    }

    const updated = await this.prisma.deal.update({
      where: { id },
      data,
      include: { account: true, pipelineStage: true, owner: true },
    });

    if (newStageId && newStageId !== existing.pipelineStageId) {
      await this.prisma.dealStageHistory.create({
        data: {
          deal: { connect: { id } },
          fromStageId: existing.pipelineStageId,
          toStageId: newStageId,
          changedBy: changedById ? { connect: { id: changedById } } : undefined,
          amount: updated.amount,
          probability: updated.probability,
        },
      });
    }

    await this.fieldHistory.recordDealChanges(
      id,
      {
        name: existing.name,
        amount: existing.amount,
        probability: existing.probability,
        forecastCategory: existing.forecastCategory,
        expectedCloseDate: existing.expectedCloseDate,
      },
      {
        name: updated.name,
        amount: updated.amount,
        probability: updated.probability,
        forecastCategory: updated.forecastCategory,
        expectedCloseDate: updated.expectedCloseDate,
      },
      changedById,
    );

    return updated;
  }

  getInspection(id: string) {
    return this.prisma.deal.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: true,
        pipelineStage: true,
        owner: true,
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20,
          include: { changedBy: true },
        },
        teamMembers: { include: { user: true } },
        quotes: true,
      },
    });
  }

  getPlaybookForDeal(id: string) {
    return this.prisma.deal.findFirst({
      where: { id, deletedAt: null },
      include: { pipelineStage: true },
    }).then(async (deal) => {
      if (!deal) return null;
      return this.playbooks.forDealStage(deal.pipelineStage.name);
    });
  }

  async addContact(
    dealId: string,
    data: { contactId: string; role?: string; isPrimary?: boolean },
  ) {
    await this.findOne(dealId);
    return this.prisma.dealContact.create({
      data: {
        deal: { connect: { id: dealId } },
        contact: { connect: { id: data.contactId } },
        role: (data.role as never) ?? 'other',
        isPrimary: data.isPrimary ?? false,
      },
      include: { contact: true },
    });
  }

  getPipeline(pipelineId?: string) {
    if (pipelineId) {
      return this.prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
          stages: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }
    return this.prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async addTeamMember(
    dealId: string,
    data: { userId: string; role?: string; revenueSplitPercent?: number },
  ) {
    await this.findOne(dealId);
    return this.prisma.dealTeamMember.upsert({
      where: {
        dealId_userId: { dealId, userId: data.userId },
      },
      create: {
        deal: { connect: { id: dealId } },
        user: { connect: { id: data.userId } },
        role: (data.role as never) ?? 'sales_rep',
        revenueSplitPercent: data.revenueSplitPercent,
      },
      update: {
        role: (data.role as never) ?? undefined,
        revenueSplitPercent: data.revenueSplitPercent,
      },
      include: { user: true },
    });
  }
}