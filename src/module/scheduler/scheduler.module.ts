import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { BillingModule } from '../user/billing/billing.module.js';
import { UserSubscriptionModule } from '../user/subscription/subscription.module.js';

@Module({
  imports: [BillingModule, UserSubscriptionModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
