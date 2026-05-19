import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [UserAuthModule, NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
