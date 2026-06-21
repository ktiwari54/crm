import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiTrustService } from '../ai/ai-trust.service';
import { LlmService } from '../ai/llm.service';

@Injectable()
export class CopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly aiTrust: AiTrustService,
  ) {}

  async getInsights(entityType?: string, entityId?: string, insightType?: string) {
    return this.prisma.aiInsight.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(insightType ? { insightType: insightType as never } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getNextBestActions(userId: string) {
    const existing = await this.prisma.aiInsight.findMany({
      where: {
        insightType: 'next_best_action',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { score: 'desc' },
      take: 10,
    });
    if (existing.length > 0) return existing;

    const [atRiskAccounts, stalledDeals, overdueActivities] = await Promise.all([
      this.prisma.account.findMany({
        where: { healthScore: 'at_risk', deletedAt: null },
        take: 3,
        select: { id: true, name: true },
      }),
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          pipelineStage: { isClosed: false },
          updatedAt: { lt: new Date(Date.now() - 14 * 86400000) },
        },
        take: 3,
        include: { account: { select: { name: true } } },
      }),
      this.prisma.activity.findMany({
        where: {
          ownerId: userId,
          status: 'open',
          dueAt: { lt: new Date() },
        },
        take: 3,
        select: { id: true, subject: true, relatedType: true, relatedId: true },
      }),
    ]);

    const actions: Array<{
      entityType: string;
      entityId: string;
      title: string;
      content: string;
      score: number;
    }> = [];

    for (const acc of atRiskAccounts) {
      actions.push({
        entityType: 'account',
        entityId: acc.id,
        title: `Win-back: ${acc.name}`,
        content: 'Account health is at risk. Schedule a QBR and review recent order volume.',
        score: 0.85,
      });
    }
    for (const deal of stalledDeals) {
      actions.push({
        entityType: 'deal',
        entityId: deal.id,
        title: `Unstick deal: ${deal.name}`,
        content: `No activity in 14+ days for ${deal.account.name}. Send follow-up or escalate.`,
        score: 0.75,
      });
    }
    for (const act of overdueActivities) {
      actions.push({
        entityType: act.relatedType ?? 'activity',
        entityId: act.relatedId ?? act.id,
        title: `Overdue: ${act.subject}`,
        content: 'Complete or reschedule this overdue task today.',
        score: 0.9,
      });
    }

    const created = await Promise.all(
      actions.map((a) =>
        this.prisma.aiInsight.create({
          data: {
            entityType: a.entityType,
            entityId: a.entityId,
            insightType: 'next_best_action',
            title: a.title,
            content: a.content,
            score: a.score,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      ),
    );
    return created;
  }

  async generateReorderPredictions() {
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null, accountType: 'customer' },
      include: {
        orders: {
          where: { status: { in: ['delivered', 'shipped'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { lineItems: { include: { product: true } } },
        },
      },
    });

    const predictions = [];
    for (const account of accounts) {
      const lastOrder = account.orders[0];
      if (!lastOrder) continue;
      const daysSince = Math.floor(
        (Date.now() - lastOrder.createdAt.getTime()) / 86400000,
      );
      if (daysSince < 60) continue;

      const topProduct = lastOrder.lineItems[0]?.product;
      if (!topProduct) continue;

      const score = Math.min(0.95, 0.5 + daysSince / 180);
      const existing = await this.prisma.aiInsight.findFirst({
        where: {
          entityType: 'account',
          entityId: account.id,
          insightType: 'reorder_prediction',
        },
      });
      const payload = {
        title: `Reorder likely: ${account.name}`,
        content: `${account.name} last ordered ${daysSince} days ago (${topProduct.sku}). Suggest replenishment quote.`,
        score,
        metadata: { productSku: topProduct.sku, daysSince },
        expiresAt: new Date(Date.now() + 7 * 86400000),
      };
      const insight = existing
        ? await this.prisma.aiInsight.update({ where: { id: existing.id }, data: payload })
        : await this.prisma.aiInsight.create({
            data: {
              entityType: 'account',
              entityId: account.id,
              insightType: 'reorder_prediction',
              ...payload,
            },
          });
      predictions.push(insight);
    }
    return predictions;
  }

  async summarizeAccount(accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, deletedAt: null },
      include: {
        deals: { where: { deletedAt: null }, take: 5, orderBy: { amount: 'desc' } },
        orders: { where: { deletedAt: null }, take: 3, orderBy: { createdAt: 'desc' } },
        serviceCases: { take: 3, orderBy: { createdAt: 'desc' } },
        contacts: { where: { isPrimary: true }, take: 1 },
      },
    });
    if (!account) throw new NotFoundException('Account not found');

    const openDeals = account.deals.filter((d) => !d.deletedAt).length;
    const summary = [
      `${account.name} (${account.healthScore ?? 'unknown'} health)`,
      `Industry: ${account.industry ?? 'N/A'} | Payment: ${account.paymentTerms ?? 'N/A'}`,
      `Open deals: ${openDeals} | Recent orders: ${account.orders.length}`,
      `Open cases: ${account.serviceCases.length}`,
      account.contacts[0]
        ? `Primary contact: ${account.contacts[0].firstName} ${account.contacts[0].lastName}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.prisma.aiInsight.create({
      data: {
        entityType: 'account',
        entityId: accountId,
        insightType: 'account_summary',
        title: `Account summary: ${account.name}`,
        content: summary,
      },
    });
  }

  async chat(userId: string, message: string, sessionId?: string) {
    let session = sessionId
      ? await this.prisma.copilotSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      session = await this.prisma.copilotSession.create({
        data: {
          userId,
          title: message.slice(0, 60),
        },
      });
    }

    await this.prisma.copilotMessage.create({
      data: { sessionId: session.id, role: 'user', content: message },
    });

    const { reply, source } = await this.buildReply(message, userId);

    await this.prisma.copilotMessage.create({
      data: { sessionId: session.id, role: 'assistant', content: reply },
    });

    const messages = await this.prisma.copilotMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    return { sessionId: session.id, messages, reply, source };
  }

  private async buildReply(
    message: string,
    userId: string,
  ): Promise<{ reply: string; source: 'llm' | 'rule-based' }> {
    const lower = message.toLowerCase();

    const context = await this.buildContext(userId);

    if (this.llm.isConfigured) {
      const llmReply = await this.llm.complete(
        `User question: ${message}\n\nCRM context:\n${context}`,
        'You are a B2B electronics distribution CRM copilot. Answer concisely with bullet points when listing items. Use only the provided context.',
      );
      if (llmReply) {
        await this.aiTrust.log({
          action: 'copilot_chat',
          userId,
          promptPreview: message,
          metadata: { responseLength: llmReply.length },
        });
        return { reply: llmReply, source: 'llm' };
      }
    }

    const ruleReply = await this.buildRuleReply(message, userId);
    return { reply: ruleReply, source: 'rule-based' };
  }

  private async buildContext(userId: string): Promise<string> {
    const [actions, atRisk, openCases, pipelineTotal] = await Promise.all([
      this.getNextBestActions(userId),
      this.prisma.account.count({ where: { healthScore: { in: ['at_risk', 'dormant'] }, deletedAt: null } }),
      this.prisma.serviceCase.count({ where: { status: { in: ['new', 'working', 'escalated'] } } }),
      this.prisma.deal.aggregate({
        where: { deletedAt: null, pipelineStage: { isClosed: false } },
        _sum: { amount: true },
      }),
    ]);
    return [
      `Next best actions: ${actions.map((a) => a.title).join('; ') || 'none'}`,
      `At-risk accounts: ${atRisk}`,
      `Open cases: ${openCases}`,
      `Open pipeline value: $${Number(pipelineTotal._sum.amount ?? 0).toLocaleString()}`,
    ].join('\n');
  }

  private async buildRuleReply(message: string, userId: string): Promise<string> {
    const lower = message.toLowerCase();

    if (lower.includes('reorder') || lower.includes('prediction')) {
      const preds = await this.generateReorderPredictions();
      if (preds.length === 0) return 'No reorder predictions right now — all accounts ordered recently.';
      return preds
        .map((p) => `• ${p.title}: ${p.content} (${Math.round(Number(p.score) * 100)}% confidence)`)
        .join('\n');
    }

    if (lower.includes('next best') || lower.includes('what should')) {
      const actions = await this.getNextBestActions(userId);
      return actions.map((a) => `• ${a.title}: ${a.content}`).join('\n') || 'No actions queued.';
    }

    if (lower.includes('at risk') || lower.includes('churn')) {
      const accounts = await this.prisma.account.findMany({
        where: { healthScore: { in: ['at_risk', 'dormant'] }, deletedAt: null },
        select: { name: true, healthScore: true },
      });
      if (!accounts.length) return 'No at-risk accounts found.';
      return accounts.map((a) => `• ${a.name} (${a.healthScore})`).join('\n');
    }

    if (lower.includes('pipeline') || lower.includes('forecast')) {
      const deals = await this.prisma.deal.findMany({
        where: { deletedAt: null, pipelineStage: { isClosed: false } },
        include: { pipelineStage: true, account: { select: { name: true } } },
        take: 5,
        orderBy: { amount: 'desc' },
      });
      const total = deals.reduce((s, d) => s + Number(d.amount ?? 0), 0);
      const lines = deals.map(
        (d) => `• ${d.name} (${d.account.name}): $${Number(d.amount ?? 0).toLocaleString()} — ${d.pipelineStage.name}`,
      );
      return `Open pipeline top deals ($${total.toLocaleString()} total):\n${lines.join('\n')}`;
    }

    if (lower.includes('case') || lower.includes('support')) {
      const open = await this.prisma.serviceCase.count({
        where: { status: { in: ['new', 'working', 'escalated'] } },
      });
      return `You have ${open} open support cases. Visit Cases to triage by priority.`;
    }

    return `I can help with:\n• Reorder predictions — ask "show reorder predictions"\n• Next best actions — ask "what should I do today"\n• At-risk accounts — ask "show at risk accounts"\n• Pipeline summary — ask "pipeline forecast"\n• Support cases — ask "open cases"`;
  }

  getSessions(userId: string) {
    return this.prisma.copilotSession.findMany({
      where: { userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}