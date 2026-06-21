import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  findRules(entityType?: string) {
    return this.prisma.routingRule.findMany({
      where: {
        isActive: true,
        ...(entityType ? { entityType } : {}),
      },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { currentLoad: 'asc' },
        },
      },
      orderBy: { priority: 'asc' },
    });
  }

  async createRule(body: {
    name: string;
    entityType: string;
    queue?: string;
    skills?: string[];
    priority?: number;
    memberUserIds: string[];
  }) {
    return this.prisma.routingRule.create({
      data: {
        name: body.name,
        entityType: body.entityType,
        queue: body.queue,
        skills: body.skills ?? [],
        priority: body.priority ?? 100,
        members: {
          create: body.memberUserIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async assign(body: {
    entityType: 'case' | 'lead';
    entityId: string;
    queue?: string;
    skill?: string;
  }) {
    const rules = await this.prisma.routingRule.findMany({
      where: {
        isActive: true,
        entityType: body.entityType,
        ...(body.queue ? { queue: body.queue } : {}),
      },
      include: {
        members: {
          include: { user: true },
          orderBy: [{ currentLoad: 'asc' }, { lastAssignedAt: 'asc' }],
        },
      },
      orderBy: { priority: 'asc' },
    });

    let matchedRule = rules[0];
    if (body.skill) {
      const skillMatch = rules.find((r) => {
        const skills = (r.skills as string[] | null) ?? [];
        return skills.includes(body.skill!);
      });
      if (skillMatch) matchedRule = skillMatch;
    }

    if (!matchedRule || matchedRule.members.length === 0) {
      const fallback = await this.prisma.user.findFirst({
        where: { isActive: true, role: { in: ['admin', 'rep'] } },
        orderBy: { createdAt: 'asc' },
      });
      if (!fallback) throw new NotFoundException('No agents available for routing');

      return this.applyAssignment(body.entityType, body.entityId, fallback.id, {
        ruleName: 'fallback',
        reason: 'No matching routing rule',
      });
    }

    const member = matchedRule.members[0];
    await this.prisma.routingRuleMember.update({
      where: { id: member.id },
      data: {
        currentLoad: { increment: 1 },
        lastAssignedAt: new Date(),
      },
    });

    return this.applyAssignment(body.entityType, body.entityId, member.userId, {
      ruleName: matchedRule.name,
      queue: matchedRule.queue,
      agentLoad: member.currentLoad + 1,
      reason: 'Lowest load among qualified agents',
    });
  }

  private async applyAssignment(
    entityType: string,
    entityId: string,
    userId: string,
    meta: Record<string, unknown>,
  ) {
    const agent = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (entityType === 'case') {
      await this.prisma.serviceCase.update({
        where: { id: entityId },
        data: { ownerId: userId },
      });
    } else if (entityType === 'lead') {
      await this.prisma.lead.update({
        where: { id: entityId },
        data: { ownerId: userId },
      });
    }

    return {
      entityType,
      entityId,
      assignedTo: agent,
      ...meta,
    };
  }
}