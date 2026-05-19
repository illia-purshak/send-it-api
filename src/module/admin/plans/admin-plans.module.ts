import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminPlansController } from './admin-plans.controller.js';
import { AdminPlansService } from './admin-plans.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminPlansController],
  providers: [AdminPlansService],
})
export class AdminPlansModule {}
