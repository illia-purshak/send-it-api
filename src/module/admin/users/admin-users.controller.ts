import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_USERS_ROUTES } from '../../../constants/apiRoutes.js';
import {
  AdminListUsersQuerySchema,
  AdminUpdateUserSchema,
  type AdminListUsersQueryDto,
  type AdminUpdateUserDto,
} from '../../../validation/admin/admin-users.schema.js';
import {
  AdminUpdateBalanceSchema,
  AdminGetUserSubscriptionHistoryQuerySchema,
  type AdminUpdateBalanceDto,
  type AdminGetUserSubscriptionHistoryQueryDto,
} from '../../../validation/subscription/subscription.schema.js';
import { AdminUsersService } from './admin-users.service.js';

@ApiTags('Admin — Users')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get(ADMIN_USERS_ROUTES.BASE)
  @ApiOperation({ summary: 'Paginated list of all client accounts' })
  @ApiOkResponse({ description: 'User list' })
  @ApiUnauthorizedResponse()
  getAll(
    @Query(new ZodValidationPipe(AdminListUsersQuerySchema)) query: AdminListUsersQueryDto,
  ) {
    return this.adminUsersService.getAll(query);
  }

  @Get(ADMIN_USERS_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Full details of a single client (profile, subscription, connections)' })
  @ApiOkResponse({ description: 'User detail' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.getById(id);
  }

  @Put(ADMIN_USERS_ROUTES.BY_ID)
  @ApiOperation({ summary: 'Update client account status (ACTIVE, BANNED, INACTIVE)' })
  @ApiOkResponse({ description: 'Updated user' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminUpdateUserSchema)) dto: AdminUpdateUserDto,
  ) {
    return this.adminUsersService.updateStatus(id, dto);
  }

  @Get(ADMIN_USERS_ROUTES.SUBSCRIPTION)
  @ApiOperation({ summary: "Get user's active subscription balances" })
  @ApiOkResponse({ description: 'Subscription balances' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getUserSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.getUserSubscription(id);
  }

  @Get(ADMIN_USERS_ROUTES.SUBSCRIPTION_HISTORY)
  @ApiOperation({ summary: "Get user's billing history" })
  @ApiOkResponse({ description: 'Paginated billing history' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  getUserSubscriptionHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodValidationPipe(AdminGetUserSubscriptionHistoryQuerySchema))
    query: AdminGetUserSubscriptionHistoryQueryDto,
  ) {
    return this.adminUsersService.getUserSubscriptionHistory(id, query);
  }

  @Put(ADMIN_USERS_ROUTES.SUBSCRIPTION_BY_BALANCE)
  @ApiOperation({ summary: "Apply admin action to a user's subscription balance" })
  @ApiOkResponse({ description: 'Updated subscription balance' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  updateUserSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Param('balanceId', ParseIntPipe) balanceId: number,
    @Body(new ZodValidationPipe(AdminUpdateBalanceSchema)) dto: AdminUpdateBalanceDto,
  ) {
    return this.adminUsersService.updateUserSubscription(id, balanceId, dto);
  }

  @Delete(ADMIN_USERS_ROUTES.POSTAL_CONNECTION_BY_ID)
  @HttpCode(200)
  @ApiOperation({ summary: "Force-disconnect a user's postal operator" })
  @ApiOkResponse({ description: 'Connection removed' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  removePostalConnection(
    @Param('id', ParseIntPipe) id: number,
    @Param('connectionId', ParseIntPipe) connectionId: number,
  ) {
    return this.adminUsersService.removePostalConnection(id, connectionId);
  }
}
