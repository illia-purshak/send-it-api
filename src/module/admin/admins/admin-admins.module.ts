import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminAdminsController } from './admin-admins.controller.js';
import { AdminAdminsService } from './admin-admins.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminAdminsController],
  providers: [AdminAdminsService],
})
export class AdminAdminsModule {}
