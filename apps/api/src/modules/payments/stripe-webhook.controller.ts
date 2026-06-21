import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

/**
 * Public, unauthenticated endpoint for Stripe to POST events to.
 * Security is provided by webhook signature verification (STRIPE_WEBHOOK_SECRET),
 * not JWT — so this controller intentionally has no JwtAuthGuard.
 */
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, signature);
  }
}
