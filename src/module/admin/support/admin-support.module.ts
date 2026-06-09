import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../../user/notifications/notifications.module.js';
import { AdminSupportController } from './admin-support.controller.js';
import { AdminSupportService } from './admin-support.service.js';

@Module({
  imports: [AdminAuthModule, NotificationsModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class AdminSupportModule {}
