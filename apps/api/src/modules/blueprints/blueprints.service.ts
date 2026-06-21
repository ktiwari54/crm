import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlueprintsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.blueprintRule.findMany({
      where: { isActive: true },
      include: { pipelineStage: { include: { pipeline: true } } },
      orderBy: { name: 'asc' },
    });
  }

  create(data: {
    name: string;
    entityType: string;
    pipelineStageId: string;
    requirement: string;
    message?: string;
  }) {
    return this.prisma.blueprintRule.create({
      data,
      include: { pipelineStage: { include: { pipeline: true } } },
    });
  }

  async getPipelineFlow(pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!pipeline) throw new BadRequestException('Pipeline not found');

    const rules = await this.prisma.blueprintRule.findMany({
      where: {
        isActive: true,
        pipelineStageId: { in: pipeline.stages.map((s) => s.id) },
      },
      include: { pipelineStage: true },
    });

    const rulesByStage = Object.fromEntries(
      pipeline.stages.map((stage) => [
        stage.id,
        rules.filter((r) => r.pipelineStageId === stage.id),
      ]),
    );

    return { pipeline, rulesByStage };
  }

  async validateDealStageMove(dealId: string, targetStageId: string) {
    const rules = await this.prisma.blueprintRule.findMany({
      where: {
        isActive: true,
        entityType: 'deal',
        pipelineStageId: targetStageId,
      },
    });

    if (rules.length === 0) return { valid: true, violations: [] as string[] };

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        quotes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!deal) return { valid: true, violations: [] as string[] };

    const violations: string[] = [];
    for (const rule of rules) {
      if (rule.requirement === 'quote_sent') {
        const hasSent = deal.quotes.some((q) =>
          ['sent', 'accepted'].includes(q.status),
        );
        if (!hasSent) {
          violations.push(
            rule.message ?? 'A quote must be sent before moving to this stage',
          );
        }
      }
      if (rule.requirement === 'quote_approved') {
        const hasApproved = await this.prisma.approvalRequest.findFirst({
          where: {
            entityType: 'quote',
            entityId: { in: deal.quotes.map((q) => q.id) },
            status: 'approved',
          },
        });
        if (!hasApproved) {
          violations.push(
            rule.message ?? 'Quote approval required before this stage',
          );
        }
      }
      if (rule.requirement === 'min_amount') {
        const min = 10000;
        if (!deal.amount || Number(deal.amount) < min) {
          violations.push(
            rule.message ?? `Deal amount must be at least ${min}`,
          );
        }
      }
    }

    return { valid: violations.length === 0, violations };
  }

  async enforceDealStageMove(dealId: string, targetStageId: string) {
    const result = await this.validateDealStageMove(dealId, targetStageId);
    if (!result.valid) {
      throw new BadRequestException(result.violations.join('; '));
    }
    return result;
  }
}