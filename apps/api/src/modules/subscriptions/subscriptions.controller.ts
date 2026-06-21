import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BillingInterval } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

type AuthReq = { user: { id: string } };

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.subscriptionsService.findAll(status);
  }

  @Post('run-billing')
  runBilling(@Body() body: { asOf?: string }) {
    return this.subscriptionsService.runBilling(body?.asOf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      accountId: string;
      name: string;
      interval?: BillingInterval;
      intervalCount?: number;
      startDate: string;
      trialEndsAt?: string;
      contractId?: string;
      autoRenew?: boolean;
      notes?: string;
      items: { productId?: string; description: string; quantity: number; unitPrice: number }[];
    },
    @Req() req: AuthReq,
  ) {
    return this.subscriptionsService.create({ ...body, ownerId: req.user.id });
  }

  @Post(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'paused' | 'canceled' },
  ) {
    return this.subscriptionsService.setStatus(id, body.status);
  }

  @Post(':id/generate-invoice')
  generateInvoice(@Param('id') id: string) {
    return this.subscriptionsService.generateInvoice(id);
  }
}
