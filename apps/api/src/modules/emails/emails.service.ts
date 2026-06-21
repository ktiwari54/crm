import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../ai/llm.service';
import { EmailSyncService } from './email-sync.service';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly emailSync: EmailSyncService,
  ) {}

  getMailboxStatus() {
    return this.emailSync.getStatus();
  }

  findInbox(userId: string) {
    return this.emailSync.findInbox(userId);
  }

  syncInbox(userId: string) {
    return this.emailSync.syncInbox(userId);
  }

  findLogged(userId: string) {
    return this.prisma.email.findMany({
      where: { userId, isLogged: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  findTemplates() {
    return this.prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  createTemplate(data: Prisma.EmailTemplateCreateInput) {
    return this.prisma.emailTemplate.create({ data });
  }

  async logEmail(
    userId: string,
    data: {
      subject: string;
      bodyPreview?: string;
      fromAddress?: string;
      toAddresses?: string[];
      relatedType?: string;
      relatedId?: string;
    },
  ) {
    return this.prisma.email.create({
      data: {
        userId,
        subject: data.subject,
        bodyPreview: data.bodyPreview,
        fromAddress: data.fromAddress,
        toAddresses: data.toAddresses,
        relatedType: data.relatedType as never,
        relatedId: data.relatedId,
        isLogged: true,
        sentAt: new Date(),
      },
    });
  }

  async sendFromTemplate(
    userId: string,
    templateId: string,
    data: { toAddresses: string[]; relatedType?: string; relatedId?: string },
  ) {
    const template = await this.findTemplate(templateId);
    return this.logEmail(userId, {
      subject: template.subject,
      bodyPreview: template.body.slice(0, 200),
      toAddresses: data.toAddresses,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
    });
  }

  private mergeTemplate(body: string, vars: Record<string, string>) {
    return Object.entries(vars).reduce(
      (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
      body,
    );
  }

  async draftEmail(
    userId: string,
    body: {
      templateId?: string;
      dealId?: string;
      quoteId?: string;
      contactName?: string;
      prompt?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const repName = user ? `${user.firstName} ${user.lastName}` : 'Sales Rep';

    let template = body.templateId
      ? await this.findTemplate(body.templateId)
      : await this.prisma.emailTemplate.findFirst({ where: { isActive: true }, orderBy: { name: 'asc' } });

    if (!template) throw new NotFoundException('No email template available');

    const vars: Record<string, string> = {
      contact_name: body.contactName ?? 'there',
      rep_name: repName,
      quote_number: '—',
      deal_name: '—',
      product_sku: '—',
    };

    if (body.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: body.dealId, deletedAt: null },
        include: {
          account: { select: { name: true } },
          quotes: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: 'desc' } },
        },
      });
      if (deal) {
        vars.deal_name = deal.name;
        vars.contact_name = body.contactName ?? deal.account.name;
        if (deal.quotes[0]) vars.quote_number = deal.quotes[0].quoteNumber;
      }
    }

    if (body.quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: body.quoteId, deletedAt: null },
        include: { deal: { select: { name: true } }, account: { select: { name: true } } },
      });
      if (quote) {
        vars.quote_number = quote.quoteNumber;
        vars.deal_name = quote.deal?.name ?? quote.account.name;
        vars.contact_name = body.contactName ?? quote.account.name;
      }
    }

    let subject = this.mergeTemplate(template.subject, vars);
    let draftBody = this.mergeTemplate(template.body, vars);
    let source: 'rule-based' | 'llm' = 'rule-based';

    if (body.prompt && this.llm.isConfigured) {
      const llmDraft = await this.llm.complete(
        `Refine this sales email for a B2B electronics distributor. Context: ${body.prompt}\n\nSubject: ${subject}\n\nBody:\n${draftBody}`,
        'You write concise, professional B2B sales emails. Return JSON with keys "subject" and "body" only.',
      );
      if (llmDraft) {
        try {
          const parsed = JSON.parse(llmDraft) as { subject?: string; body?: string };
          if (parsed.subject) subject = parsed.subject;
          if (parsed.body) draftBody = parsed.body;
          source = 'llm';
        } catch {
          draftBody = llmDraft;
          source = 'llm';
        }
      }
    } else if (body.dealId) {
      const score = await this.prisma.aiInsight.findFirst({
        where: { entityType: 'deal', entityId: body.dealId, insightType: 'deal_score' },
      });
      if (score?.score) {
        draftBody += `\n\nP.S. Based on our engagement signals, this opportunity is tracking at a ${Math.round(Number(score.score))}% win likelihood — happy to align on next steps.`;
      }
    }

    return {
      templateId: template.id,
      templateName: template.name,
      subject,
      body: draftBody,
      variables: vars,
      source,
      llmAvailable: this.llm.isConfigured,
    };
  }
}