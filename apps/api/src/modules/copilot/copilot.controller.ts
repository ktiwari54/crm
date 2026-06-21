import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CopilotService } from './copilot.service';

@Controller('copilot')
@UseGuards(JwtAuthGuard)
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Get('insights')
  getInsights(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('insightType') insightType?: string,
  ) {
    return this.copilotService.getInsights(entityType, entityId, insightType);
  }

  @Get('next-best-actions')
  getNextBestActions(@Req() req: { user: { id: string } }) {
    return this.copilotService.getNextBestActions(req.user.id);
  }

  @Get('reorder-predictions')
  getReorderPredictions() {
    return this.copilotService.generateReorderPredictions();
  }

  @Post('summarize/:accountId')
  summarizeAccount(@Param('accountId') accountId: string) {
    return this.copilotService.summarizeAccount(accountId);
  }

  @Post('chat')
  chat(
    @Req() req: { user: { id: string } },
    @Body() body: { message: string; sessionId?: string },
  ) {
    return this.copilotService.chat(req.user.id, body.message, body.sessionId);
  }

  @Get('sessions')
  getSessions(@Req() req: { user: { id: string } }) {
    return this.copilotService.getSessions(req.user.id);
  }
}