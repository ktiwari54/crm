import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PricingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [quoteLines, orderLines, quotes] = await Promise.all([
      this.prisma.quoteLineItem.findMany({
        where: { quote: { deletedAt: null, updatedAt: { gte: thirtyDaysAgo } } },
        include: {
          product: { select: { sku: true, name: true } },
          quote: {
            select: {
              account: { select: { name: true } },
              owner: { select: { firstName: true, lastName: true } },
              marginPercent: true,
              total: true,
            },
          },
        },
      }),
      this.prisma.orderLineItem.findMany({
        where: { order: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } },
        include: {
          product: { select: { sku: true, name: true } },
          order: {
            select: {
              account: { select: { name: true } },
              owner: { select: { firstName: true, lastName: true } },
              total: true,
            },
          },
        },
      }),
      this.prisma.quote.findMany({
        where: { deletedAt: null, updatedAt: { gte: thirtyDaysAgo } },
        select: { marginPercent: true, total: true, status: true },
      }),
    ]);

    const byProduct = this.aggregate(quoteLines, (li) => li.product.sku, (li) => Number(li.lineTotal));
    const byAccount = this.aggregate(quoteLines, (li) => li.quote.account.name, (li) => Number(li.lineTotal));
    const byRep = this.aggregate(
      quoteLines.filter((li) => li.quote.owner),
      (li) => `${li.quote.owner!.firstName} ${li.quote.owner!.lastName}`,
      (li) => Number(li.lineTotal),
    );

    const orderRevenue = orderLines.reduce((s, li) => s + Number(li.lineTotal), 0);
    const quoteRevenue = quotes.reduce((s, q) => s + Number(q.total), 0);
    const margins = quotes.filter((q) => q.marginPercent != null).map((q) => Number(q.marginPercent));
    const avgMargin = margins.length
      ? margins.reduce((a, b) => a + b, 0) / margins.length
      : 0;

    const topProducts = [...byProduct.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, revenue]) => {
        const line = quoteLines.find((l) => l.product.sku === sku);
        return { sku, name: line?.product.name, revenue };
      });

    return {
      period: 'Last 30 days',
      summary: {
        quoteRevenue,
        orderRevenue,
        avgMarginPercent: Math.round(avgMargin * 10) / 10,
        quoteCount: quotes.length,
        acceptedQuotes: quotes.filter((q) => q.status === 'accepted').length,
      },
      byProduct: topProducts,
      byAccount: [...byAccount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([account, revenue]) => ({ account, revenue })),
      byRep: [...byRep.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([rep, revenue]) => ({ rep, revenue })),
    };
  }

  private aggregate<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number) {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = keyFn(item);
      map.set(key, (map.get(key) ?? 0) + valueFn(item));
    }
    return map;
  }
}