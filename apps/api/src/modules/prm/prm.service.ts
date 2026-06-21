import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrmService {
  constructor(private readonly prisma: PrismaService) {}

  findEnablement(partnerAccountId?: string) {
    return this.prisma.enablementPath.findMany({
      where: {
        isActive: true,
        ...(partnerAccountId
          ? { OR: [{ partnerAccountId }, { partnerAccountId: null }] }
          : {}),
      },
      include: {
        partnerAccount: { select: { id: true, name: true } },
        modules: { orderBy: { sortOrder: 'asc' } },
        enrollments: partnerAccountId
          ? { where: { partnerAccountId } }
          : { include: { partnerAccount: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createEnablement(body: {
    name: string;
    tier?: string;
    description?: string;
    partnerAccountId?: string;
    modules?: { title: string; description?: string; sortOrder: number; durationMinutes?: number }[];
  }) {
    const { modules, ...pathData } = body;
    return this.prisma.enablementPath.create({
      data: {
        name: pathData.name,
        tier: (pathData.tier ?? 'silver') as never,
        description: pathData.description,
        partnerAccount: pathData.partnerAccountId
          ? { connect: { id: pathData.partnerAccountId } }
          : undefined,
        modules: modules?.length
          ? {
              create: modules.map((m) => ({
                title: m.title,
                description: m.description,
                sortOrder: m.sortOrder,
                durationMinutes: m.durationMinutes ?? 30,
              })),
            }
          : undefined,
      },
      include: {
        partnerAccount: { select: { id: true, name: true } },
        modules: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async enrollPartner(pathId: string, partnerAccountId: string) {
    const path = await this.prisma.enablementPath.findUnique({
      where: { id: pathId },
      include: { modules: true },
    });
    if (!path) throw new Error('Enablement path not found');

    return this.prisma.enablementEnrollment.upsert({
      where: {
        pathId_partnerAccountId: { pathId, partnerAccountId },
      },
      update: { status: 'in_progress', startedAt: new Date() },
      create: {
        path: { connect: { id: pathId } },
        partnerAccount: { connect: { id: partnerAccountId } },
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        path: { include: { modules: { orderBy: { sortOrder: 'asc' } } } },
        partnerAccount: { select: { id: true, name: true } },
      },
    });
  }

  async getAnalytics() {
    const partnerAccounts = await this.prisma.account.findMany({
      where: { accountType: 'partner', deletedAt: null },
      select: { id: true, name: true },
    });
    const partnerIds = partnerAccounts.map((a) => a.id);

    const [
      dealRegs,
      mdfRequests,
      enrollments,
      partnerDeals,
    ] = await Promise.all([
      this.prisma.dealRegistration.groupBy({
        by: ['status'],
        where: { partnerAccountId: { in: partnerIds } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.mdfRequest.groupBy({
        by: ['status'],
        where: { partnerAccountId: { in: partnerIds } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.enablementEnrollment.findMany({
        where: { partnerAccountId: { in: partnerIds } },
        include: {
          path: { select: { name: true, tier: true } },
          partnerAccount: { select: { name: true } },
        },
      }),
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          accountId: { in: partnerIds },
        },
        select: {
          amount: true,
          pipelineStage: { select: { isWon: true, isClosed: true } },
        },
      }),
    ]);

    const openPipeline = partnerDeals
      .filter((d) => !d.pipelineStage.isClosed)
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const wonDeals = partnerDeals.filter((d) => d.pipelineStage.isWon);
    const closedDeals = partnerDeals.filter((d) => d.pipelineStage.isClosed);
    const winRate =
      closedDeals.length > 0
        ? Math.round((wonDeals.length / closedDeals.length) * 100)
        : 0;

    const approvedMdf = mdfRequests
      .filter((m) => m.status === 'approved')
      .reduce((sum, m) => sum + Number(m._sum.amount ?? 0), 0);
    const totalMdf = mdfRequests.reduce(
      (sum, m) => sum + Number(m._sum.amount ?? 0),
      0,
    );

    return {
      partnerCount: partnerAccounts.length,
      pipeline: {
        openValue: openPipeline,
        dealCount: partnerDeals.filter((d) => !d.pipelineStage.isClosed).length,
        winRate,
      },
      dealRegistrations: dealRegs.map((r) => ({
        status: r.status,
        count: r._count,
        amount: Number(r._sum.amount ?? 0),
      })),
      mdf: {
        byStatus: mdfRequests.map((m) => ({
          status: m.status,
          count: m._count,
          amount: Number(m._sum.amount ?? 0),
        })),
        approvedTotal: approvedMdf,
        totalRequested: totalMdf,
        roiEstimate: approvedMdf > 0 ? Math.round((openPipeline / approvedMdf) * 100) / 100 : 0,
      },
      enablement: {
        enrolled: enrollments.length,
        completed: enrollments.filter((e) => e.status === 'completed').length,
        inProgress: enrollments.filter((e) => e.status === 'in_progress').length,
        byPartner: enrollments.map((e) => ({
          partner: e.partnerAccount.name,
          path: e.path.name,
          tier: e.path.tier,
          status: e.status,
          progress: e.completedModules,
        })),
      },
      partners: partnerAccounts,
    };
  }
}