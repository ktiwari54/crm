import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.incident.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        accounts: { include: { account: { select: { id: true, name: true } } } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        owner: true,
        accounts: { include: { account: true } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async create(data: Prisma.IncidentCreateInput & { accountIds?: string[] }) {
    const { accountIds, ...incidentData } = data;
    const count = await this.prisma.incident.count();
    const incidentNumber = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const incident = await this.prisma.incident.create({
      data: { ...incidentData, incidentNumber },
      include: { owner: true, accounts: { include: { account: true } } },
    });
    if (accountIds?.length) {
      await this.prisma.incidentAccount.createMany({
        data: accountIds.map((accountId) => ({ incidentId: incident.id, accountId })),
        skipDuplicates: true,
      });
      return this.findOne(incident.id);
    }
    return incident;
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.incident.update({
      where: { id },
      data: {
        status: status as never,
        resolvedAt: status === 'resolved' ? new Date() : undefined,
      },
      include: {
        owner: true,
        accounts: { include: { account: true } },
      },
    });
  }

  async linkAccounts(id: string, accountIds: string[]) {
    await this.findOne(id);
    await this.prisma.incidentAccount.createMany({
      data: accountIds.map((accountId) => ({ incidentId: id, accountId })),
      skipDuplicates: true,
    });
    return this.findOne(id);
  }
}