import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Runs subscription billing automatically once a day. Set BILLING_CRON_DISABLED=true
 * to turn the job off (e.g. in tests, CI, or replicas where another node owns billing).
 */
@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'subscription-billing' })
  async handleDailyBilling() {
    if (process.env.BILLING_CRON_DISABLED === 'true') return;

    try {
      const result = await this.subscriptions.runBilling();
      if (result.processed > 0) {
        this.logger.log(
          `Subscription billing: ${result.generated}/${result.processed} invoices generated`,
        );
      } else {
        this.logger.debug('Subscription billing: no subscriptions due');
      }
    } catch (err) {
      this.logger.error(`Subscription billing run failed: ${(err as Error).message}`);
    }
  }
}
