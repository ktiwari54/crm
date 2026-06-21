import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrmService } from './prm.service';

@Controller('prm')
@UseGuards(JwtAuthGuard)
export class PrmController {
  constructor(private readonly prmService: PrmService) {}

  @Get('enablement')
  findEnablement(@Query('partnerAccountId') partnerAccountId?: string) {
    return this.prmService.findEnablement(partnerAccountId);
  }

  @Post('enablement')
  createEnablement(@Body() body: Record<string, unknown>) {
    return this.prmService.createEnablement(body as never);
  }

  @Post('enablement/enroll')
  enroll(
    @Body() body: { pathId: string; partnerAccountId: string },
  ) {
    return this.prmService.enrollPartner(body.pathId, body.partnerAccountId);
  }

  @Get('analytics')
  analytics() {
    return this.prmService.getAnalytics();
  }
}