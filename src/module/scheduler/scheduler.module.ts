import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { BillingModule } from '../user/billing/billing.module.js';

@Module({
  imports: [BillingModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
