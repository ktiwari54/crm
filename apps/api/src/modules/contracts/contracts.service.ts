import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.contract.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: { account: true, deal: true, owner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: { account: true, deal: true, owner: true, documents: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async create(data: Prisma.ContractCreateInput) {
    const count = await this.prisma.contract.count();
    const contractNumber = `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.contract.create({
      data: { ...data, contractNumber },
      include: { account: true, deal: true, owner: true },
    });
  }

  async update(id: string, data: Prisma.ContractUpdateInput) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data,
      include: { account: true, deal: true, owner: true },
    });
  }

  findClauses() {
    return this.prisma.contractClause.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
  }

  createClause(data: Prisma.ContractClauseCreateInput) {
    return this.prisma.contractClause.create({ data });
  }

  findTemplates() {
    return this.prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createFromTemplate(
    templateId: string,
    data: { accountId: string; title: string; ownerId?: string; dealId?: string },
  ) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Contract template not found');

    const clauseIds = (template.clauseIds as string[] | null) ?? [];
    const clauses = clauseIds.length
      ? await this.prisma.contractClause.findMany({ where: { id: { in: clauseIds } } })
      : [];

    const termsAndConditions = [
      template.body,
      ...clauses.map((c) => `\n\n## ${c.name}\n${c.body}`),
    ].join('\n');

    const count = await this.prisma.contract.count();
    const contractNumber = `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.contract.create({
      data: {
        contractNumber,
        title: data.title,
        termsAndConditions,
        status: 'draft',
        account: { connect: { id: data.accountId } },
        owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
        deal: data.dealId ? { connect: { id: data.dealId } } : undefined,
      },
      include: { account: true, deal: true, owner: true },
    });
  }
}