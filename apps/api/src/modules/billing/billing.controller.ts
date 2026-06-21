import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('schedules')
  findSchedules(@Query('invoiceId') invoiceId?: string) {
    return this.billingService.findSchedules(invoiceId);
  }

  @Get('schedules/:id')
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Post('schedules')
  create(@Body() body: Record<string, unknown>) {
    return this.billingService.create(body as never);
  }

  @Post('schedules/:id/sync')
  syncToErp(@Param('id') id: string) {
    return this.billingService.syncToErp(id);
  }
}