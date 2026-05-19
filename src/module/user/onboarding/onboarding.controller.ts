import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { OnboardingService } from './onboarding.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { ONBOARDING_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Onboarding')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller(ONBOARDING_ROUTES.BASE)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get(ONBOARDING_ROUTES.CHECKLIST)
  @ApiOkResponse({
    description: 'Onboarding checklist state',
    schema: {
      type: 'object',
      properties: {
        profileCompleted: { type: 'boolean' },
        operatorConnected: { type: 'boolean' },
        firstShipmentCreated: { type: 'boolean' },
      },
    },
  })
  @ApiUnauthorizedResponse()
  getChecklist(@CurrentUser() user: JwtUser) {
    return this.onboardingService.getChecklist(user.id);
  }
}
