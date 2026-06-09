import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { ANALYTICS_ROUTES } from '../../../constants/apiRoutes.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(ANALYTICS_ROUTES.DASHBOARD)
  @ApiOkResponse({ description: 'User analytics dashboard' })
  @ApiUnauthorizedResponse()
  getDashboard(@CurrentUser() user: JwtUser) {
    return this.analyticsService.getDashboard(user.id);
  }
}
