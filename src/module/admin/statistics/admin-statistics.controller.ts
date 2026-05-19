import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ActiveAdminAccessGuard } from '../../../common/guards/active-admin-access.guard.js';
import { ADMIN_STATISTICS_ROUTES } from '../../../constants/apiRoutes.js';
import { AdminStatisticsService } from './admin-statistics.service.js';

@ApiTags('Admin Statistics')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard, ActiveAdminAccessGuard)
@Controller(ADMIN_STATISTICS_ROUTES.BASE)
export class AdminStatisticsController {
  constructor(
    private readonly adminStatisticsService: AdminStatisticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ description: 'Aggregated admin statistics' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Active admin access required' })
  getStatistics() {
    return this.adminStatisticsService.getStatistics();
  }
}
