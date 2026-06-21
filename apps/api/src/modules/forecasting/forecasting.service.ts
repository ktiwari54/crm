import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ForecastingService {
  constructor(private readonly prisma: PrismaService) {}

  getPeriods() {
    return this.prisma.forecastPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { entries: true } } },
    });
  }

  async getRollup(periodId: string) {
    const period = await this.prisma.forecastPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Forecast period not found');

    const entries = await this.prisma.forecastEntry.findMany({
      where: { periodId },
      include: {
        user: true,
        deal: { include: { account: true, pipelineStage: true } },
      },
    });

    const byCategory = entries.reduce(
      (acc, e) => {
        const key = e.category;
        acc[key] = (acc[key] ?? 0) + Number(e.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const byRep = entries.reduce(
      (acc, e) => {
        const key = `${e.user.firstName} ${e.user.lastName}`;
        acc[key] = (acc[key] ?? 0) + Number(e.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    return { period, entries, byCategory, byRep };
  }

  async createEntry(data: Prisma.ForecastEntryCreateInput) {
    return this.prisma.forecastEntry.create({
      data,
      include: { user: true, deal: true, period: true },
    });
  }

  async syncFromPipeline(periodId: string, userId: string) {
    const period = await this.prisma.forecastPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Forecast period not found');

    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        ownerId: userId,
        pipelineStage: { isClosed: false },
        expectedCloseDate: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });

    await this.prisma.forecastEntry.deleteMany({
      where: { periodId, userId, dealId: { not: null } },
    });

    const entries = await Promise.all(
      deals.map((deal) =>
        this.prisma.forecastEntry.create({
          data: {
            period: { connect: { id: periodId } },
            user: { connect: { id: userId } },
            deal: { connect: { id: deal.id } },
            category: deal.forecastCategory ?? 'pipeline',
            amount: deal.amount ?? 0,
          },
          include: { deal: true },
        }),
      ),
    );

    return entries;
  }

  async simulate(
    periodId: string,
    adjustments: Array<{ dealId: string; probability: number }>,
  ) {
    const period = await this.prisma.forecastPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Forecast period not found');

    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        pipelineStage: { isClosed: false },
        expectedCloseDate: { gte: period.startDate, lte: period.endDate },
      },
      include: { pipelineStage: true, account: { select: { name: true } } },
    });

    const adjMap = new Map(adjustments.map((a) => [a.dealId, a.probability]));

    let baseline = 0;
    let adjusted = 0;
    const dealComparison = deals.map((deal) => {
      const amount = Number(deal.amount ?? 0);
      const baseProb = (deal.probability ?? deal.pipelineStage.defaultProbability) / 100;
      const adjProb = adjMap.has(deal.id)
        ? adjMap.get(deal.id)! / 100
        : baseProb;
      const baseWeighted = amount * baseProb;
      const adjWeighted = amount * adjProb;
      baseline += baseWeighted;
      adjusted += adjWeighted;
      return {
        dealId: deal.id,
        dealName: deal.name,
        accountName: deal.account.name,
        amount,
        baselineProbability: Math.round(baseProb * 100),
        adjustedProbability: Math.round(adjProb * 100),
        baselineWeighted: baseWeighted,
        adjustedWeighted: adjWeighted,
        delta: adjWeighted - baseWeighted,
      };
    });

    return {
      period,
      baseline: Math.round(baseline),
      adjusted: Math.round(adjusted),
      delta: Math.round(adjusted - baseline),
      deals: dealComparison.sort((a, b) => b.delta - a.delta),
    };
  }
}