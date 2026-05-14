import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ChangePlanSchema, type ChangePlanDto } from '../../../validation/subscription/subscription.schema.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { SUBSCRIPTION_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Subscriptions')
@Controller(SUBSCRIPTION_ROUTES.BASE)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Public()
  @Get(SUBSCRIPTION_ROUTES.PLANS)
  @ApiOkResponse({ description: 'List of active subscription plans' })
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @ApiBearerAuth('bearer')
  @Get(SUBSCRIPTION_ROUTES.ME)
  @ApiOkResponse({ description: 'Current user subscription' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getMySubscription(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.getMySubscription(user.id);
  }

  @ApiBearerAuth('bearer')
  @Post(SUBSCRIPTION_ROUTES.UPGRADE)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Upgrade scheduled for next billing period' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  upgrade(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(ChangePlanSchema)) dto: ChangePlanDto,
  ) {
    return this.subscriptionService.upgrade(user.id, dto.planId);
  }

  @ApiBearerAuth('bearer')
  @Post(SUBSCRIPTION_ROUTES.DOWNGRADE)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Downgrade scheduled for next billing period' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  downgrade(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(ChangePlanSchema)) dto: ChangePlanDto,
  ) {
    return this.subscriptionService.downgrade(user.id, dto.planId);
  }

  @ApiBearerAuth('bearer')
  @Post(SUBSCRIPTION_ROUTES.CANCEL)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Subscription cancelled, reverts to FREE at period end' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  cancel(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.cancel(user.id);
  }

  @ApiBearerAuth('bearer')
  @Delete(SUBSCRIPTION_ROUTES.CANCEL_SCHEDULED)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Pending plan change cancelled' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  cancelScheduled(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.cancelScheduled(user.id);
  }
}
