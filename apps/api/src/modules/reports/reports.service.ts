import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const REPORT_KEYS = [
  'pipeline-by-stage',
  'quotes-summary',
  'rep-activity',
  'account-list',
  'inventory-low-stock',
  'lead-source',
  'lead-funnel',
  'revenue-by-month',
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
      case 'lead-source':
        return this.leadSource();
      case 'lead-funnel':
        return this.leadFunnel();
      case 'revenue-by-month':
        return this.revenueByMonth();
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

  /** Lead count + conversion rate grouped by source. */
  private async leadSource() {
    const leads = await this.prisma.lead.groupBy({
      by: ['source', 'status'],
      where: { deletedAt: null },
      _count: true,
    });
    const sources = new Map<string, { source: string; total: number; converted: number }>();
    for (const row of leads) {
      const s = sources.get(row.source) ?? { source: row.source, total: 0, converted: 0 };
      s.total += row._count;
      if (row.status === 'converted') s.converted += row._count;
      sources.set(row.source, s);
    }
    return [...sources.values()].map((s) => ({
      ...s,
      conversionRate: s.total ? Math.round((s.converted / s.total) * 100) : 0,
    }));
  }

  /** Lead lifecycle funnel: counts per status. */
  private async leadFunnel() {
    const rows = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });
    const order = ['new', 'working', 'qualified', 'converted', 'disqualified'];
    const map = Object.fromEntries(rows.map((r) => [r.status, r._count]));
    return order.map((status) => ({ status, count: map[status] ?? 0 }));
  }

  /** Invoiced revenue per month for the last 12 months. */
  private async revenueByMonth() {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    const invoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { total: true, amountPaid: true, createdAt: true },
    });
    const buckets = new Map<string, { month: string; invoiced: number; collected: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const key = d.toISOString().slice(0, 7);
      buckets.set(key, { month: key, invoiced: 0, collected: 0 });
    }
    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().slice(0, 7);
      const b = buckets.get(key);
      if (b) {
        b.invoiced += Number(inv.total);
        b.collected += Number(inv.amountPaid);
      }
    }
    return [...buckets.values()];
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