import {
  Body,
  Controller,
  Get,
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
import { AdminUsersService } from './admin-users.service.js';

@ApiTags('Admin — Users')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller(ADMIN_USERS_ROUTES.BASE)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
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
}
