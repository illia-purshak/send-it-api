import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { SubscriptionService } from './subscription.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  BuySubscriptionSchema,
  UpdateBalanceSchema,
  type BuySubscriptionDto,
  type UpdateBalanceDto,
} from '../../../validation/subscription/subscription.schema.js';
import type { JwtUser } from '../../../types/auth.types.js';
import { SUBSCRIPTION_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Subscriptions')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get(SUBSCRIPTION_ROUTES.PLANS)
  @ApiOkResponse({ description: 'Available subscription plans for this user' })
  @ApiUnauthorizedResponse()
  getPlans(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.getPlans(user.id);
  }

  @Get(SUBSCRIPTION_ROUTES.ME)
  @ApiOkResponse({ description: 'All subscription balances for this user' })
  @ApiUnauthorizedResponse()
  getMySubscriptions(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.getMySubscriptions(user.id);
  }

  @Post(SUBSCRIPTION_ROUTES.BASE)
  @ApiCreatedResponse({ description: 'Subscription purchased' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  buySubscription(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(BuySubscriptionSchema)) dto: BuySubscriptionDto,
  ) {
    return this.subscriptionService.buySubscription(user.id, dto);
  }

  @Put(SUBSCRIPTION_ROUTES.BY_ID)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Subscription balance updated' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  updateBalance(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) balanceId: number,
    @Body(new ZodValidationPipe(UpdateBalanceSchema)) dto: UpdateBalanceDto,
  ) {
    return this.subscriptionService.updateBalance(user.id, balanceId, dto);
  }

  @Delete(SUBSCRIPTION_ROUTES.BY_ID)
  @HttpCode(200)
  @ApiOkResponse({ description: 'Subscription cancelled (autoRenew set to false)' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  cancelBalance(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) balanceId: number,
  ) {
    return this.subscriptionService.cancelBalance(user.id, balanceId);
  }
}
