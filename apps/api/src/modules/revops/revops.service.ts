import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RevopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      pipelineDeals,
      quotesByStatus,
      ordersByStatus,
      invoicesByStatus,
      openCases,
      pendingApprovals,
      pendingRegistrations,
      pendingMdf,
      atRiskAccounts,
      forecastEntries,
    ] = await Promise.all([
      this.prisma.deal.findMany({
        where: { deletedAt: null, pipelineStage: { isClosed: false } },
        select: { amount: true, forecastCategory: true, pipelineStage: { select: { name: true } } },
      }),
      this.prisma.quote.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.serviceCase.count({ where: { status: { in: ['new', 'working', 'escalated'] } } }),
      this.prisma.approvalRequest.count({ where: { status: 'pending' } }),
      this.prisma.dealRegistration.count({ where: { status: 'pending' } }),
      this.prisma.mdfRequest.count({ where: { status: { in: ['submitted', 'draft'] } } }),
      this.prisma.account.count({ where: { healthScore: { in: ['at_risk', 'dormant'] }, deletedAt: null } }),
      this.prisma.forecastEntry.findMany({
        include: { period: true, deal: { select: { name: true } } },
        take: 20,
      }),
    ]);

    const pipelineValue = pipelineDeals.reduce((s, d) => s + Number(d.amount ?? 0), 0);
    const commitValue = pipelineDeals
      .filter((d) => d.forecastCategory === 'commit')
      .reduce((s, d) => s + Number(d.amount ?? 0), 0);

    const quotesSent = quotesByStatus.find((q) => q.status === 'sent');
    const quotesAccepted = quotesByStatus.find((q) => q.status === 'accepted');
    const sentCount = quotesSent?._count ?? 0;
    const acceptedCount = quotesAccepted?._count ?? 0;
    const conversionRate = sentCount + acceptedCount > 0
      ? Math.round((acceptedCount / (sentCount + acceptedCount)) * 100)
      : 0;

    const revenueBooked = ordersByStatus
      .filter((o) => ['shipped', 'delivered', 'confirmed'].includes(o.status))
      .reduce((s, o) => s + Number(o._sum.total ?? 0), 0);

    const outstandingAr = invoicesByStatus
      .filter((i) => ['sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + Number(i._sum.total ?? 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      pipeline: {
        openDeals: pipelineDeals.length,
        totalValue: pipelineValue,
        commitValue,
        byStage: this.groupBy(pipelineDeals, (d) => d.pipelineStage.name),
      },
      quotes: {
        byStatus: quotesByStatus.map((q) => ({
          status: q.status,
          count: q._count,
          total: Number(q._sum.total ?? 0),
        })),
        conversionRate,
      },
      revenue: {
        booked: revenueBooked,
        outstandingAr,
        ordersByStatus: ordersByStatus.map((o) => ({
          status: o.status,
          count: o._count,
          total: Number(o._sum.total ?? 0),
        })),
      },
      operations: {
        openCases,
        pendingApprovals,
        pendingDealRegistrations: pendingRegistrations,
        pendingMdfRequests: pendingMdf,
        atRiskAccounts,
      },
      forecast: forecastEntries.map((e) => ({
        period: e.period.name,
        category: e.category,
        amount: Number(e.amount),
        deal: e.deal?.name,
      })),
    };
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string) {
    const map = new Map<string, { count: number; value: number }>();
    for (const item of items) {
      const key = keyFn(item);
      const entry = map.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number((item as { amount?: number }).amount ?? 0);
      map.set(key, entry);
    }
    return Array.from(map.entries()).map(([stage, data]) => ({ stage, ...data }));
  }
}