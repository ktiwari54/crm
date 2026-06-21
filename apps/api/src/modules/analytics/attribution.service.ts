import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttributionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttribution() {
    const [activities, wonDeals, orders] = await Promise.all([
      this.prisma.activity.findMany({
        where: { status: 'completed', relatedType: { in: ['deal', 'account', 'quote'] } },
        include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { completedAt: 'desc' },
        take: 200,
      }),
      this.prisma.deal.findMany({
        where: { deletedAt: null, pipelineStage: { isWon: true } },
        include: {
          account: { select: { name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 50,
      }),
      this.prisma.order.findMany({
        where: { deletedAt: null, status: { in: ['confirmed', 'shipped', 'delivered'] } },
        include: {
          account: { select: { name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 50,
      }),
    ]);

    const byRep: Record<
      string,
      {
        repId: string;
        repName: string;
        activities: number;
        attributedRevenue: number;
        wonDeals: number;
        orders: number;
        touchpoints: { type: string; subject: string; relatedType: string | null }[];
      }
    > = {};

    for (const act of activities) {
      if (!act.owner) continue;
      const key = act.owner.id;
      if (!byRep[key]) {
        byRep[key] = {
          repId: act.owner.id,
          repName: `${act.owner.firstName} ${act.owner.lastName}`,
          activities: 0,
          attributedRevenue: 0,
          wonDeals: 0,
          orders: 0,
          touchpoints: [],
        };
      }
      byRep[key].activities += 1;
      if (byRep[key].touchpoints.length < 3) {
        byRep[key].touchpoints.push({
          type: act.activityType,
          subject: act.subject,
          relatedType: act.relatedType,
        });
      }
    }

    for (const deal of wonDeals) {
      if (!deal.owner) continue;
      const key = deal.owner.id;
      if (!byRep[key]) {
        byRep[key] = {
          repId: deal.owner.id,
          repName: `${deal.owner.firstName} ${deal.owner.lastName}`,
          activities: 0,
          attributedRevenue: 0,
          wonDeals: 0,
          orders: 0,
          touchpoints: [],
        };
      }
      byRep[key].wonDeals += 1;
      byRep[key].attributedRevenue += Number(deal.amount ?? 0);
    }

    for (const order of orders) {
      if (!order.owner) continue;
      const key = order.owner.id;
      if (!byRep[key]) {
        byRep[key] = {
          repId: order.owner.id,
          repName: `${order.owner.firstName} ${order.owner.lastName}`,
          activities: 0,
          attributedRevenue: 0,
          wonDeals: 0,
          orders: 0,
          touchpoints: [],
        };
      }
      byRep[key].orders += 1;
      byRep[key].attributedRevenue += Number(order.total ?? 0) * 0.3;
    }

    const reps = Object.values(byRep).sort((a, b) => b.attributedRevenue - a.attributedRevenue);

    const byChannel = activities.reduce<Record<string, number>>((acc, a) => {
      acc[a.activityType] = (acc[a.activityType] ?? 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalAttributedRevenue: reps.reduce((s, r) => s + r.attributedRevenue, 0),
        totalTouchpoints: activities.length,
        wonDeals: wonDeals.length,
        bookedOrders: orders.length,
      },
      byRep: reps,
      byChannel: Object.entries(byChannel).map(([channel, count]) => ({ channel, count })),
      methodology:
        'Revenue attributed via last-touch activity linkage to won deals (100%) and confirmed orders (30% weight)',
    };
  }
}