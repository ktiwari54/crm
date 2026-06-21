import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(accountId?: string) {
    return this.prisma.accountPlan.findMany({
      where: accountId ? { accountId } : undefined,
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        goals: { orderBy: { dueDate: 'asc' } },
        mutualActionPlans: {
          include: { milestones: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.accountPlan.findUnique({
      where: { id },
      include: {
        account: true,
        owner: true,
        goals: { include: { owner: true }, orderBy: { dueDate: 'asc' } },
        mutualActionPlans: {
          include: { milestones: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!plan) throw new NotFoundException('Account plan not found');
    return plan;
  }

  async createMap(
    planId: string,
    body: {
      title: string;
      customerContact?: string;
      milestones?: {
        title: string;
        description?: string;
        dueDate?: string;
        ownerParty?: string;
        sortOrder: number;
      }[];
    },
  ) {
    await this.findOne(planId);
    return this.prisma.mutualActionPlan.create({
      data: {
        title: body.title,
        customerContact: body.customerContact,
        status: 'active',
        accountPlan: { connect: { id: planId } },
        milestones: body.milestones?.length
          ? {
              create: body.milestones.map((m) => ({
                title: m.title,
                description: m.description,
                dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                ownerParty: m.ownerParty ?? 'vendor',
                sortOrder: m.sortOrder,
              })),
            }
          : undefined,
      },
      include: {
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  create(data: Prisma.AccountPlanCreateInput) {
    return this.prisma.accountPlan.create({
      data,
      include: {
        account: true,
        owner: true,
        goals: true,
      },
    });
  }

  async addGoal(planId: string, data: Prisma.AccountPlanGoalCreateInput) {
    await this.findOne(planId);
    return this.prisma.accountPlanGoal.create({
      data: { ...data, accountPlan: { connect: { id: planId } } },
      include: { owner: true },
    });
  }
}