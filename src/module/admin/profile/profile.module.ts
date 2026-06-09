import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminProfileController } from './profile.controller.js';
import { AdminProfileService } from './profile.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminProfileController],
  providers: [AdminProfileService],
})
export class AdminProfileModule {}
