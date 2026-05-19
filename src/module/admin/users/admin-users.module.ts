import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminUsersTestController } from './admin-users-test.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminUsersTestController, AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
