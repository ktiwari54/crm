import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string, accountId?: string) {
    return this.prisma.serviceCase.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(accountId ? { accountId } : {}),
      },
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        asset: { select: { id: true, serialNumber: true } },
        knowledgeArticle: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const serviceCase = await this.prisma.serviceCase.findUnique({
      where: { id },
      include: {
        account: true,
        contact: true,
        owner: true,
        asset: { include: { product: true } },
        knowledgeArticle: true,
      },
    });
    if (!serviceCase) throw new NotFoundException('Case not found');
    return serviceCase;
  }

  classifySubject(subject: string, description?: string) {
    const text = `${subject} ${description ?? ''}`.toLowerCase();
    const rules: { queue: string; category: string; keywords: string[] }[] = [
      { queue: 'networking', category: 'Networking', keywords: ['network', 'switch', 'router', 'poe', 'vlan', 'connectivity', 'firmware', 'catalyst'] },
      { queue: 'returns', category: 'RMA / Returns', keywords: ['rma', 'return', 'defective', 'warranty claim', 'doa'] },
      { queue: 'billing', category: 'Billing', keywords: ['invoice', 'billing', 'payment', 'credit', 'overdue', 'purchase order'] },
      { queue: 'field_service', category: 'Field Service', keywords: ['on-site', 'install', 'technician', 'visit', 'upgrade', 'deployment'] },
      { queue: 'export', category: 'Export / Compliance', keywords: ['export', 'eccn', 'compliance', 'shipping', 'customs'] },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return {
          routingQueue: rule.queue,
          category: rule.category,
          confidence: 0.85,
          source: 'rule-based',
        };
      }
    }

    return {
      routingQueue: 'general',
      category: 'General Support',
      confidence: 0.5,
      source: 'rule-based',
    };
  }

  async create(data: Prisma.ServiceCaseCreateInput & { subject?: string; description?: string }) {
    const subject = typeof data.subject === 'string' ? data.subject : '';
    const description = typeof data.description === 'string' ? data.description : undefined;
    const classification = this.classifySubject(subject, description);

    const count = await this.prisma.serviceCase.count();
    const caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const slaDueAt = new Date();
    slaDueAt.setHours(slaDueAt.getHours() + 24);
    return this.prisma.serviceCase.create({
      data: {
        ...data,
        caseNumber,
        slaDueAt,
        category: classification.category,
        routingQueue: classification.routingQueue,
      },
      include: {
        account: true,
        contact: true,
        owner: true,
      },
    });
  }

  async findSimilar(id: string) {
    const serviceCase = await this.findOne(id);
    const terms = serviceCase.subject
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);

    const resolved = await this.prisma.serviceCase.findMany({
      where: {
        id: { not: id },
        status: { in: ['resolved', 'closed'] },
        OR: terms.map((term) => ({
          OR: [
            { subject: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
          ],
        })),
      },
      include: {
        account: { select: { name: true } },
        knowledgeArticle: { select: { title: true } },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    });

    return {
      caseId: id,
      caseNumber: serviceCase.caseNumber,
      similar: resolved.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        subject: c.subject,
        status: c.status,
        category: c.category,
        routingQueue: c.routingQueue,
        resolvedAt: c.resolvedAt,
        account: c.account.name,
        knowledgeArticle: c.knowledgeArticle?.title ?? null,
        matchReason: 'Subject keyword overlap',
      })),
    };
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.serviceCase.update({
      where: { id },
      data: {
        status: status as never,
        resolvedAt: status === 'resolved' || status === 'closed' ? new Date() : undefined,
      },
      include: { account: true, owner: true },
    });
  }

  async suggestArticles(subject: string) {
    const term = subject.split(' ')[0] ?? subject;
    return this.prisma.knowledgeArticle.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { body: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 3,
      select: { id: true, title: true, category: true, viewCount: true },
    });
  }
}