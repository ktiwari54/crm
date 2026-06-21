import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(period?: string) {
    const activePeriod = period ?? this.currentPeriod();

    const seeded = await this.prisma.gamificationScore.findMany({
      where: { period: activePeriod },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { points: 'desc' },
    });

    if (seeded.length > 0) {
      return {
        period: activePeriod,
        leaderboard: seeded.map((s, i) => ({
          rank: s.rank ?? i + 1,
          userId: s.userId,
          name: `${s.user.firstName} ${s.user.lastName}`,
          email: s.user.email,
          role: s.user.role,
          metric: s.metric,
          points: s.points,
        })),
        source: 'tracked',
      };
    }

    const reps = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ['admin', 'rep'] } },
      include: {
        ownedDeals: {
          where: { deletedAt: null, pipelineStage: { isWon: true } },
          select: { amount: true },
        },
        ownedActivities: {
          where: { status: 'completed' },
          select: { id: true },
        },
        ownedOrders: {
          where: { deletedAt: null },
          select: { total: true },
        },
      },
    });

    const leaderboard = reps
      .map((rep) => {
        const dealPoints = rep.ownedDeals.length * 100;
        const activityPoints = rep.ownedActivities.length * 10;
        const revenuePoints = Math.round(
          rep.ownedOrders.reduce((s, o) => s + Number(o.total ?? 0), 0) / 1000,
        );
        const points = dealPoints + activityPoints + revenuePoints;
        return {
          userId: rep.id,
          name: `${rep.firstName} ${rep.lastName}`,
          email: rep.email,
          role: rep.role,
          metric: 'composite',
          points,
          breakdown: { deals: dealPoints, activities: activityPoints, revenue: revenuePoints },
        };
      })
      .sort((a, b) => b.points - a.points)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return { period: activePeriod, leaderboard, source: 'computed' };
  }

  private currentPeriod() {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q}-${now.getFullYear()}`;
  }
}