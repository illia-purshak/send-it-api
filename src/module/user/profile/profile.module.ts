import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [UserAuthModule, NotificationsModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
