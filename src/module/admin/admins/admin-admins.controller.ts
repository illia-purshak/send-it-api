import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard.js';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_ADMINS_ROUTES } from '../../../constants/apiRoutes.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';
import {
  AdminInviteAdminSchema,
  AdminListAdminsQuerySchema,
  AdminUpdateAdminSchema,
  type AdminInviteAdminDto,
  type AdminListAdminsQueryDto,
  type AdminUpdateAdminDto,
} from '../../../validation/admin/admin-admins.schema.js';
import { AdminAdminsService } from './admin-admins.service.js';

@ApiTags('Admin — Admins')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminAdminsController {
  constructor(private readonly adminAdminsService: AdminAdminsService) {}

  @Get(ADMIN_ADMINS_ROUTES.BASE)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Paginated list of all admins (SUPER_ADMIN only)' })
  @ApiOkResponse({ description: 'Admins list' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Super admin access required' })
  getAll(
    @Query(new ZodValidationPipe(AdminListAdminsQuerySchema)) query: AdminListAdminsQueryDto,
  ) {
    return this.adminAdminsService.getAll(query);
  }

  @Get(ADMIN_ADMINS_ROUTES.BY_ID)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Get details of a single admin (SUPER_ADMIN only)' })
  @ApiOkResponse({ description: 'Admin detail' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Super admin access required' })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.adminAdminsService.getById(id);
  }

  @Post(ADMIN_ADMINS_ROUTES.INVITE)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Send an email invite to a new admin (SUPER_ADMIN only)' })
  @ApiCreatedResponse({ description: 'Invite created' })
  @ApiConflictResponse({ description: 'Email already registered or pending invite exists' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Super admin access required' })
  inviteAdmin(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(AdminInviteAdminSchema)) dto: AdminInviteAdminDto,
  ) {
    return this.adminAdminsService.inviteAdmin(admin, dto);
  }

  @Post(ADMIN_ADMINS_ROUTES.RESEND_INVITE)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Resend invite to a PENDING admin (SUPER_ADMIN only)' })
  @ApiOkResponse({ description: 'New invite created' })
  @ApiBadRequestResponse({ description: 'Admin is not in PENDING status' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Super admin access required' })
  resendInvite(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminAdminsService.resendInvite(admin, id);
  }

  @Put(ADMIN_ADMINS_ROUTES.BY_ID)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update admin status (SUPER_ADMIN only)' })
  @ApiOkResponse({ description: 'Admin updated' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Super admin access required' })
  @ApiNotFoundResponse()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AdminUpdateAdminSchema)) dto: AdminUpdateAdminDto,
  ) {
    return this.adminAdminsService.updateStatus(id, dto);
  }

  @Delete(ADMIN_ADMINS_ROUTES.BY_ID)
  @UseGuards(SuperAdminGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete an admin account (SUPER_ADMIN only)' })
  @ApiNoContentResponse({ description: 'Admin deleted' })
  @ApiForbiddenResponse({ description: 'Cannot delete self or a super admin' })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  deleteAdmin(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminAdminsService.deleteAdmin(admin, id);
  }
}
