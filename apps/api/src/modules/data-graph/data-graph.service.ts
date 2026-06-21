import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DataGraphService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountGraph(accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
        territory: { select: { name: true } },
        contacts: { where: { deletedAt: null }, take: 10 },
        deals: {
          where: { deletedAt: null },
          take: 10,
          include: { pipelineStage: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        quotes: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        orders: { where: { deletedAt: null }, take: 10, orderBy: { createdAt: 'desc' } },
        invoices: { take: 10, orderBy: { createdAt: 'desc' } },
        serviceCases: { take: 10, orderBy: { createdAt: 'desc' } },
        installedAssets: { take: 10 },
        erpEvents: { orderBy: { occurredAt: 'desc' }, take: 20 },
      },
    });

    if (!account) throw new NotFoundException('Account not found');

    const activities = await this.prisma.activity.findMany({
      where: { relatedType: 'account', relatedId: accountId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { owner: { select: { firstName: true, lastName: true } } },
    });

    const timeline = [
      ...account.erpEvents.map((e) => ({
        source: 'erp' as const,
        type: e.eventType,
        title: e.title,
        description: e.description,
        amount: e.amount,
        occurredAt: e.occurredAt,
      })),
      ...activities.map((a) => ({
        source: 'crm' as const,
        type: a.activityType,
        title: a.subject,
        description: a.description,
        amount: null,
        occurredAt: a.createdAt,
        owner: a.owner ? `${a.owner.firstName} ${a.owner.lastName}` : null,
      })),
      ...account.orders.map((o) => ({
        source: 'crm' as const,
        type: 'order',
        title: `Order ${o.orderNumber}`,
        description: o.status,
        amount: o.total,
        occurredAt: o.createdAt,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const crmRevenue = account.orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const erpRevenue = account.erpEvents
      .filter((e) => e.eventType === 'payment_received' || e.eventType === 'invoice_posted')
      .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

    return {
      account: {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        healthScore: account.healthScore,
        industry: account.industry,
        owner: account.owner,
        territory: account.territory,
        erpExternalId: account.erpExternalId,
        syncStatus: account.syncStatus,
      },
      summary: {
        contacts: account.contacts.length,
        openDeals: account.deals.filter((d) => !d.pipelineStage.name.startsWith('Closed')).length,
        quotes: account.quotes.length,
        orders: account.orders.length,
        cases: account.serviceCases.length,
        assets: account.installedAssets.length,
        erpEvents: account.erpEvents.length,
        crmRevenue,
        erpRevenue,
      },
      contacts: account.contacts,
      deals: account.deals,
      quotes: account.quotes,
      orders: account.orders,
      invoices: account.invoices,
      cases: account.serviceCases,
      assets: account.installedAssets,
      erpEvents: account.erpEvents,
      timeline: timeline.slice(0, 30),
    };
  }
}