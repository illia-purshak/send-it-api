import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
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
  AdminGetSubscriptionsQuerySchema,
  AdminUpdateBalanceSchema,
  type AdminGetSubscriptionsQueryDto,
  type AdminUpdateBalanceDto,
} from '../../../validation/subscription/subscription.schema.js';
import { ADMIN_SUBSCRIPTION_ROUTES } from '../../../constants/apiRoutes.js';
import { DiscountType } from '../../../../generated/prisma/enums.js';

@ApiTags('Admin Subscriptions')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminSubscriptionController {
  constructor(private readonly adminSubscriptionService: AdminSubscriptionService) {}

  @Get(ADMIN_SUBSCRIPTION_ROUTES.BASE)
  @ApiOkResponse({ description: 'Paginated list of all subscription balances' })
  @ApiUnauthorizedResponse()
  getAll(
    @Query(new ZodValidationPipe(AdminGetSubscriptionsQuerySchema))
    query: AdminGetSubscriptionsQueryDto,
  ) {
    return this.adminSubscriptionService.getAll(query);
  }

  @Get(ADMIN_SUBSCRIPTION_ROUTES.BY_ID)
  @ApiOkResponse({ description: 'Subscription balance details' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminSubscriptionService.getById(id);
  }

  @Put(ADMIN_SUBSCRIPTION_ROUTES.BY_ID)
  @ApiOkResponse({ description: 'Subscription balance updated by admin action' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  updateBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminUpdateBalanceSchema)) dto: AdminUpdateBalanceDto,
  ) {
    switch (dto.action) {
      case 'changePlan':
        return this.adminSubscriptionService.changePlan(id, dto.planId!);
      case 'extend':
        return this.adminSubscriptionService.extendBalance(id, dto.days!);
      case 'cancel':
        return this.adminSubscriptionService.cancelBalance(id);
      case 'setDiscount':
        return this.adminSubscriptionService.setDiscount(
          id,
          dto.amount!,
          dto.discountType as DiscountType,
        );
      case 'suspend':
        return this.adminSubscriptionService.suspendBalance(id);
      case 'reactivate':
        return this.adminSubscriptionService.reactivateBalance(id);
    }
  }
}
