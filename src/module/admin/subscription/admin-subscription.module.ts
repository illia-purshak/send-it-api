import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminSubscriptionController } from './admin-subscription.controller.js';
import { AdminSubscriptionService } from './admin-subscription.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminSubscriptionController],
  providers: [AdminSubscriptionService],
})
export class AdminSubscriptionModule {}
