import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiTrustService } from './ai-trust.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiTrust: AiTrustService,
  ) {}

  @Get('deal-score/:dealId')
  getDealScore(@Param('dealId') dealId: string) {
    return this.aiService.getDealScore(dealId);
  }

  @Get('deal-scores')
  getDealScores(@Query('pipelineId') pipelineId?: string) {
    return this.aiService.getDealScores(pipelineId);
  }

  @Get('churn-risk')
  getChurnRisk() {
    return this.aiService.getChurnRisk();
  }

  @Get('audit')
  getAudit(@Query('limit') limit?: string) {
    return this.aiTrust.findAuditLogs(limit ? Number(limit) : 50);
  }

  @Get('settings')
  getSettings() {
    return this.aiTrust.getSettings();
  }
}