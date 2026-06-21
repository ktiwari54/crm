import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { IntegrationService } from './integration.service';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('events')
  receiveEvent(
    @Body()
    body: {
      source?: string;
      event_type: string;
      payload: Record<string, unknown>;
    },
  ) {
    return this.integrationService.receiveEvent(body);
  }

  @Get('sync-status')
  @UseGuards(JwtAuthGuard)
  getSyncStatus() {
    return this.integrationService.getSyncStatus();
  }
}