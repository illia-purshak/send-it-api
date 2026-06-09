import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminServicesController } from './admin-services.controller.js';
import { AdminServicesService } from './admin-services.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminServicesController],
  providers: [AdminServicesService],
})
export class AdminServicesModule {}
