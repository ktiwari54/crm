import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkqueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkqueue(ownerId?: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const activityWhere = {
      status: 'open' as const,
      ...(ownerId ? { ownerId } : {}),
    };

    const [todayTasks, overdueTasks, staleDeals] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          ...activityWhere,
          dueAt: { lte: today, gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        include: { owner: true },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.activity.findMany({
        where: {
          ...activityWhere,
          dueAt: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        include: { owner: true },
        orderBy: { dueAt: 'asc' },
        take: 50,
      }),
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          pipelineStage: { isClosed: false },
          ...(ownerId ? { ownerId } : {}),
          updatedAt: { lt: fourteenDaysAgo },
        },
        include: {
          account: true,
          pipelineStage: true,
          owner: true,
        },
        take: 20,
      }),
    ]);

    return {
      todayTasks,
      overdueTasks,
      staleDeals,
      summary: {
        todayCount: todayTasks.length,
        overdueCount: overdueTasks.length,
        staleDealsCount: staleDeals.length,
      },
    };
  }
}