import { Module } from '@nestjs/common';
import { ActiveAdminAccessGuard } from '../../../common/guards/active-admin-access.guard.js';
import { AdminAuthModule } from '../auth/auth.module.js';
import { AdminStatisticsController } from './admin-statistics.controller.js';
import { AdminStatisticsService } from './admin-statistics.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminStatisticsController],
  providers: [AdminStatisticsService, ActiveAdminAccessGuard],
})
export class AdminStatisticsModule {}
