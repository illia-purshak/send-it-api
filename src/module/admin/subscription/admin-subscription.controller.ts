import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminSubscriptionService } from './admin-subscription.service.js';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  AdminDiscountSchema,
  AdminGetSubscriptionsQuerySchema,
  ChangePlanSchema,
  type AdminDiscountDto,
  type AdminGetSubscriptionsQueryDto,
  type ChangePlanDto,
} from '../../../validation/subscription/subscription.schema.js';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Admin Subscriptions')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller(ADMIN_SUBSCRIPTION_ROUTES.BASE)
export class AdminSubscriptionController {
  constructor(private readonly adminSubscriptionService: AdminSubscriptionService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of all user subscriptions' })
  @ApiUnauthorizedResponse()
  getAll(
    @Query(new ZodValidationPipe(AdminGetSubscriptionsQuerySchema))
    query: AdminGetSubscriptionsQueryDto,
  ) {
    return this.adminSubscriptionService.getAll(query);
  }

  @Patch(':userId/plan')
  @ApiOkResponse({ description: 'Plan changed immediately (bypasses next-period logic)' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  changePlan(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(ChangePlanSchema)) dto: ChangePlanDto,
  ) {
    return this.adminSubscriptionService.changePlan(userId, dto.planId);
  }

  @Patch(':userId/extend')
  @ApiOkResponse({ description: 'Subscription extended by one month' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  extendSubscription(@Param('userId', ParseIntPipe) userId: number) {
    return this.adminSubscriptionService.extendSubscription(userId);
  }

  @Post(':userId/cancel')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Subscription force-cancelled' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  forceCancel(@Param('userId', ParseIntPipe) userId: number) {
    return this.adminSubscriptionService.forceCancel(userId);
  }

  @Patch(':userId/discount')
  @ApiOkResponse({ description: 'Individual discount set for next billing cycle' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  setDiscount(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(AdminDiscountSchema)) dto: AdminDiscountDto,
  ) {
    return this.adminSubscriptionService.setDiscount(userId, dto.amount, dto.discountType);
  }
}
