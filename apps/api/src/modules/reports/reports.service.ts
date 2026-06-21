import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const REPORT_KEYS = [
  'pipeline-by-stage',
  'quotes-summary',
  'rep-activity',
  'account-list',
  'inventory-low-stock',
] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(reportKey: string) {
    if (!REPORT_KEYS.includes(reportKey as (typeof REPORT_KEYS)[number])) {
      throw new NotFoundException(`Report '${reportKey}' not found`);
    }

    switch (reportKey) {
      case 'pipeline-by-stage':
        return this.pipelineByStage();
      case 'quotes-summary':
        return this.quotesSummary();
      case 'rep-activity':
        return this.repActivity();
      case 'account-list':
        return this.accountList();
      case 'inventory-low-stock':
        return this.inventoryLowStock();
      default:
        throw new NotFoundException(`Report '${reportKey}' not found`);
    }
  }

  private async pipelineByStage() {
    const stages = await this.prisma.pipelineStage.findMany({
      include: {
        pipeline: { select: { id: true, name: true } },
        _count: { select: { deals: { where: { deletedAt: null } } } },
        deals: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
      orderBy: [{ pipeline: { isDefault: 'desc' } }, { sortOrder: 'asc' }],
    });

    return stages.map((stage) => ({
      stageId: stage.id,
      pipelineName: stage.pipeline.name,
      stageName: stage.name,
      dealCount: stage._count.deals,
      totalAmount: stage.deals.reduce(
        (sum, d) => sum + Number(d.amount ?? 0),
        0,
      ),
      defaultProbability: stage.defaultProbability,
    }));
  }

  private async quotesSummary() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [byStatus, recent] = await Promise.all([
      this.prisma.quote.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.quote.findMany({
        where: {
          deletedAt: null,
          updatedAt: { gte: thirtyDaysAgo },
          status: { in: ['accepted', 'rejected'] },
        },
        select: { status: true, total: true },
      }),
    ]);

    const won = recent.filter((q) => q.status === 'accepted');
    const lost = recent.filter((q) => q.status === 'rejected');

    return {
      byStatus,
      last30Days: {
        won: won.length,
        lost: lost.length,
        wonValue: won.reduce((s, q) => s + Number(q.total), 0),
        lostValue: lost.reduce((s, q) => s + Number(q.total), 0),
      },
    };
  }

  private async repActivity() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.activity.groupBy({
      by: ['ownerId', 'activityType'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    });
  }

  private async accountList() {
    return this.prisma.account.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        accountType: true,
        healthScore: true,
        territory: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
        _count: { select: { deals: true, contacts: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  private async inventoryLowStock() {
    return this.prisma.inventoryLevel.findMany({
      where: { atp: { lte: 10 } },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: { atp: 'asc' },
      take: 50,
    });
  }
}