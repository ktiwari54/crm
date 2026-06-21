import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentMethod } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

type AuthReq = { user: { id: string } };

@Controller('invoices/:invoiceId/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.list(invoiceId);
  }

  @Post()
  record(
    @Param('invoiceId') invoiceId: string,
    @Body()
    body: {
      amount: number;
      method?: PaymentMethod;
      reference?: string;
      notes?: string;
      receivedAt?: string;
    },
    @Req() req: AuthReq,
  ) {
    return this.paymentsService.record(invoiceId, { ...body, userId: req.user.id });
  }

  @Post('stripe-intent')
  stripeIntent(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.createStripeIntent(invoiceId);
  }

  @Post(':paymentId/refund')
  refund(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number },
  ) {
    return this.paymentsService.refund(paymentId, body.amount);
  }
}
