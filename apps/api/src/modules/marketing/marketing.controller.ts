import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MarketingService } from './marketing.service';

@Controller('marketing/campaigns')
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.marketingService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketingService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.marketingService.create(body as never);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body() body: { accountIds: string[] }) {
    return this.marketingService.enrollAccounts(id, body.accountIds ?? []);
  }
}