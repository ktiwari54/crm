import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiTrustService } from '../ai/ai-trust.service';
import { LlmService } from '../ai/llm.service';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTrust: AiTrustService,
    private readonly llm: LlmService,
  ) {}

  findAll() {
    return this.prisma.agent.findMany({
      where: { isActive: true },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        runs: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        owner: true,
        runs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  create(body: {
    name: string;
    agentType: string;
    description?: string;
    config?: Record<string, unknown>;
    ownerId?: string;
  }) {
    return this.prisma.agent.create({
      data: {
        name: body.name,
        agentType: body.agentType as never,
        description: body.description,
        config: (body.config ?? {}) as never,
        owner: body.ownerId ? { connect: { id: body.ownerId } } : undefined,
      },
    });
  }

  async run(agentId: string, input: Record<string, unknown>, triggeredById?: string) {
    const agent = await this.findOne(agentId);

    const run = await this.prisma.agentRun.create({
      data: {
        agentId,
        status: 'running',
        input: input as never,
        triggeredById: triggeredById ?? null,
        startedAt: new Date(),
      },
    });

    try {
      const output = await this.executeAgent(agent.agentType, agent.config as Record<string, unknown>, input, triggeredById);

      await this.aiTrust.log({
        action: 'agent_run',
        entityType: 'agent',
        entityId: agentId,
        userId: triggeredById,
        promptPreview: `Agent ${agent.name} (${agent.agentType})`,
        metadata: { runId: run.id, agentType: agent.agentType },
      });

      return this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          output: output as never,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent run failed';
      return this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }

  private async executeAgent(
    agentType: string,
    config: Record<string, unknown>,
    input: Record<string, unknown>,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    if (agentType === 'quote_prep') return this.runQuotePrep(config, input);
    if (agentType === 'approval_route') return this.runApprovalRoute(config, input);
    if (agentType === 'email_send') return this.runEmailSend(config, input, userId);
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  private async runQuotePrep(config: Record<string, unknown>, input: Record<string, unknown>) {
    const quoteId = (input.quoteId ?? config.quoteId) as string | undefined;
    const quote = quoteId
      ? await this.prisma.quote.findFirst({
          where: { id: quoteId, deletedAt: null },
          include: { account: true, lineItems: { include: { product: true }, take: 5 } },
        })
      : await this.prisma.quote.findFirst({
          where: { status: 'draft', deletedAt: null },
          include: { account: true, lineItems: { include: { product: true }, take: 5 } },
          orderBy: { updatedAt: 'desc' },
        });

    if (!quote) throw new NotFoundException('No quote found for preparation');

    const lineSummary = quote.lineItems.map((l) => `${l.product.sku} × ${l.quantity}`).join(', ');
    const actions = [
      'Validate ATP for all line items',
      'Apply account-specific pricing rules',
      'Check export compliance for destination',
      'Route discount approval if margin < 25%',
    ];

    let summary = `Prepared quote ${quote.quoteNumber} for ${quote.account.name} — ${lineSummary}`;
    let source: 'llm' | 'rule-based' = 'rule-based';

    if (this.llm.isConfigured) {
      const llmSummary = await this.llm.complete(
        `Summarize quote prep for ${quote.quoteNumber}, account ${quote.account.name}, total ${quote.total}, lines: ${lineSummary}. List 4 prep actions.`,
        'Return 2-3 sentence executive summary for a sales rep.',
      );
      if (llmSummary) {
        summary = llmSummary;
        source = 'llm';
      }
    }

    return {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      account: quote.account.name,
      total: quote.total,
      lineSummary,
      recommendedActions: actions,
      readyToSend: quote.lineItems.every((l) => !l.atpWarning),
      summary,
      source,
    };
  }

  private async runApprovalRoute(config: Record<string, unknown>, input: Record<string, unknown>) {
    const approvalId = (input.approvalId ?? config.approvalId) as string | undefined;
    const approval = approvalId
      ? await this.prisma.approvalRequest.findUnique({ where: { id: approvalId } })
      : await this.prisma.approvalRequest.findFirst({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' },
        });

    if (!approval) throw new NotFoundException('No pending approval found');

    const actualValue = Number(approval.actualValue ?? 0);
    const reviewer = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        role: actualValue >= 10000 ? 'admin' : 'rep',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (reviewer && !approval.reviewedById) {
      await this.prisma.approvalRequest.update({
        where: { id: approval.id },
        data: { reviewedById: reviewer.id },
      });
    }

    return {
      approvalId: approval.id,
      entityType: approval.entityType,
      approvalType: approval.approvalType,
      actualValue,
      routedTo: reviewer
        ? { id: reviewer.id, name: `${reviewer.firstName} ${reviewer.lastName}`, email: reviewer.email }
        : null,
      reason:
        actualValue >= 10000
          ? 'High-value approval routed to admin'
          : 'Standard approval routed to sales rep',
    };
  }

  private async runEmailSend(
    config: Record<string, unknown>,
    input: Record<string, unknown>,
    userId?: string,
  ) {
    const dealId = (input.dealId ?? config.dealId) as string | undefined;
    const deal = dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dealId, deletedAt: null },
          include: { account: true },
        })
      : await this.prisma.deal.findFirst({
          where: { deletedAt: null, pipelineStage: { isClosed: false } },
          include: { account: true },
          orderBy: { updatedAt: 'desc' },
        });

    if (!deal) throw new NotFoundException('No deal found for email');
    if (!userId) throw new Error('User context required for email agent');

    const contact = await this.prisma.contact.findFirst({
      where: { accountId: deal.accountId, isPrimary: true, deletedAt: null },
    });

    let subject = `Following up: ${deal.name}`;
    let bodyPreview = `Hi ${contact?.firstName ?? 'there'},\n\nI wanted to follow up on ${deal.name} for ${deal.account.name}. Based on our latest pipeline review, I'd like to schedule a brief call to align on next steps.\n\nBest regards`;
    let source: 'llm' | 'rule-based' = 'rule-based';

    if (this.llm.isConfigured) {
      const draft = await this.llm.complete(
        `Write a short follow-up email for deal "${deal.name}" at ${deal.account.name}. Contact: ${contact?.firstName ?? 'customer'}.`,
        'Return JSON with keys subject and body only.',
      );
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as { subject?: string; body?: string };
          if (parsed.subject) subject = parsed.subject;
          if (parsed.body) bodyPreview = parsed.body;
          source = 'llm';
        } catch {
          bodyPreview = draft;
          source = 'llm';
        }
      }
    }

    const email = await this.prisma.email.create({
      data: {
        userId,
        subject,
        bodyPreview,
        fromAddress: 'admin@crm.local',
        toAddresses: contact?.email ? [contact.email] : [],
        relatedType: 'deal',
        relatedId: deal.id,
        isLogged: true,
      },
    });

    return {
      emailId: email.id,
      dealId: deal.id,
      dealName: deal.name,
      subject,
      to: contact?.email ?? null,
      status: 'draft_logged',
      source,
      message: 'Follow-up email drafted and logged to Email Hub',
    };
  }
}