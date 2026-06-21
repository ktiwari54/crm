import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './llm.service';

type ScoreFactor = { factor: string; impact: number; detail: string };

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async getDealScore(dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, deletedAt: null },
      include: {
        account: { select: { name: true, healthScore: true } },
        pipelineStage: { select: { name: true, sortOrder: true, isClosed: true, isWon: true } },
        stageHistory: { orderBy: { changedAt: 'desc' }, take: 5 },
        quotes: { where: { deletedAt: null }, select: { status: true, total: true }, take: 3 },
        teamMembers: true,
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');

    const factors: ScoreFactor[] = [];
    let score = 50;

    const prob = deal.probability ?? 0;
    const probImpact = Math.round((prob - 50) * 0.4);
    score += probImpact;
    factors.push({ factor: 'Stage probability', impact: probImpact, detail: `${prob}%` });

    const stageBoost = Math.min(deal.pipelineStage.sortOrder * 4, 20);
    score += stageBoost;
    factors.push({ factor: 'Pipeline progress', impact: stageBoost, detail: deal.pipelineStage.name });

    const daysSinceUpdate = Math.floor((Date.now() - deal.updatedAt.getTime()) / 86400000);
    const stalenessPenalty = daysSinceUpdate > 14 ? -15 : daysSinceUpdate > 7 ? -8 : 5;
    score += stalenessPenalty;
    factors.push({
      factor: 'Engagement recency',
      impact: stalenessPenalty,
      detail: daysSinceUpdate === 0 ? 'Updated today' : `${daysSinceUpdate}d since last activity`,
    });

    const sentQuote = deal.quotes.find((q) => q.status === 'sent' || q.status === 'accepted');
    if (sentQuote) {
      score += 12;
      factors.push({ factor: 'Quote in play', impact: 12, detail: `Quote status: ${sentQuote.status}` });
    }

    if (deal.teamMembers.length > 1) {
      score += 5;
      factors.push({ factor: 'Team coverage', impact: 5, detail: `${deal.teamMembers.length} members` });
    }

    if (deal.account.healthScore === 'at_risk' || deal.account.healthScore === 'dormant') {
      score -= 10;
      factors.push({ factor: 'Account health', impact: -10, detail: deal.account.healthScore ?? 'unknown' });
    } else if (deal.account.healthScore === 'active') {
      score += 8;
      factors.push({ factor: 'Account health', impact: 8, detail: 'active' });
    }

    if (deal.stageHistory.length >= 2) {
      const recent = deal.stageHistory[0];
      const prior = deal.stageHistory[1];
      const daysInStage = Math.floor(
        (recent.changedAt.getTime() - prior.changedAt.getTime()) / 86400000,
      );
      if (daysInStage <= 10) {
        score += 6;
        factors.push({ factor: 'Stage velocity', impact: 6, detail: `Advanced in ${daysInStage}d` });
      }
    }

    score = Math.max(5, Math.min(95, Math.round(score)));
    const label = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';

    const insightData = {
      title: `Win score: ${score}`,
      content: factors.map((f) => `${f.factor}: ${f.detail}`).join('; '),
      score,
      metadata: { factors, label },
      expiresAt: new Date(Date.now() + 7 * 86400000),
    };
    const existing = await this.prisma.aiInsight.findFirst({
      where: { entityType: 'deal', entityId: dealId, insightType: 'deal_score' },
    });
    if (existing) {
      await this.prisma.aiInsight.update({ where: { id: existing.id }, data: insightData });
    } else {
      await this.prisma.aiInsight.create({
        data: { entityType: 'deal', entityId: dealId, insightType: 'deal_score', ...insightData },
      });
    }

    return {
      dealId,
      dealName: deal.name,
      account: deal.account.name,
      winScore: score,
      label,
      factors,
      source: this.llm.isConfigured ? 'hybrid' : 'rule-based',
    };
  }

  async getDealScores(pipelineId?: string) {
    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        pipelineStage: { isClosed: false, ...(pipelineId ? { pipelineId } : {}) },
      },
      select: { id: true },
      take: 50,
    });
    return Promise.all(deals.map((d) => this.getDealScore(d.id)));
  }

  async getChurnRisk() {
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null, accountType: { in: ['customer', 'prospect'] } },
      include: {
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { createdAt: true, total: true },
        },
        serviceCases: {
          where: { status: { in: ['new', 'working', 'escalated'] } },
          select: { id: true },
        },
      },
    });

    const results = accounts.map((account) => {
      const factors: ScoreFactor[] = [];
      let risk = 20;

      const lastOrder = account.orders[0];
      const daysSinceOrder = lastOrder
        ? Math.floor((Date.now() - lastOrder.createdAt.getTime()) / 86400000)
        : 999;

      if (daysSinceOrder > 90) {
        risk += 35;
        factors.push({ factor: 'Order dormancy', impact: 35, detail: `${daysSinceOrder}d since last order` });
      } else if (daysSinceOrder > 45) {
        risk += 20;
        factors.push({ factor: 'Order dormancy', impact: 20, detail: `${daysSinceOrder}d since last order` });
      } else {
        factors.push({ factor: 'Recent orders', impact: -10, detail: `${daysSinceOrder}d since last order` });
        risk -= 10;
      }

      if (account.orders.length >= 2) {
        const gap1 = account.orders[0].createdAt.getTime() - account.orders[1].createdAt.getTime();
        if (gap1 > 60 * 86400000) {
          risk += 15;
          factors.push({ factor: 'Slowing cadence', impact: 15, detail: 'Order gap widening' });
        }
      }

      if (account.healthScore === 'at_risk') {
        risk += 25;
        factors.push({ factor: 'Health score', impact: 25, detail: 'at_risk' });
      } else if (account.healthScore === 'dormant') {
        risk += 40;
        factors.push({ factor: 'Health score', impact: 40, detail: 'dormant' });
      } else if (account.healthScore === 'active') {
        risk -= 15;
        factors.push({ factor: 'Health score', impact: -15, detail: 'active' });
      }

      if (account.serviceCases.length > 0) {
        risk += 10;
        factors.push({
          factor: 'Open cases',
          impact: 10,
          detail: `${account.serviceCases.length} open case(s)`,
        });
      }

      risk = Math.max(0, Math.min(100, Math.round(risk)));
      const label = risk >= 60 ? 'high' : risk >= 35 ? 'medium' : 'low';

      return {
        accountId: account.id,
        accountName: account.name,
        healthScore: account.healthScore,
        churnRisk: risk,
        label,
        daysSinceLastOrder: daysSinceOrder === 999 ? null : daysSinceOrder,
        factors,
      };
    });

    return {
      summary: {
        highRisk: results.filter((r) => r.label === 'high').length,
        mediumRisk: results.filter((r) => r.label === 'medium').length,
        lowRisk: results.filter((r) => r.label === 'low').length,
      },
      accounts: results.sort((a, b) => b.churnRisk - a.churnRisk),
      source: this.llm.isConfigured ? 'hybrid' : 'rule-based',
    };
  }
}