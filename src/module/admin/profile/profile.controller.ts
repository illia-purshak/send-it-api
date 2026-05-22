import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { ADMIN_PROFILE_ROUTES } from '../../../constants/apiRoutes.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';
import {
  UpdateAdminProfileSchema,
  UpdateAdminSettingsSchema,
  type UpdateAdminProfileDto,
  type UpdateAdminSettingsDto,
} from '../../../validation/admin-profile/admin-profile.schema.js';
import { AdminProfileService } from './profile.service.js';

@ApiTags('Admin Profile')
@ApiBearerAuth('bearer')
@UseGuards(AdminJwtAuthGuard)
@Controller()
export class AdminProfileController {
  constructor(private readonly profileService: AdminProfileService) {}

  @Get(ADMIN_PROFILE_ROUTES.BASE)
  @ApiOperation({ summary: 'Fetch the authenticated admin\'s profile' })
  @ApiOkResponse({ description: 'Admin profile' })
  @ApiUnauthorizedResponse()
  getProfile(@CurrentAdmin() admin: AdminJwtUser) {
    return this.profileService.getProfile(admin.id);
  }

  @Put(ADMIN_PROFILE_ROUTES.BASE)
  @ApiOperation({ summary: 'Update admin personal info (firstName, lastName, avatarUrl)' })
  @ApiOkResponse({ description: 'Updated admin profile' })
  @ApiUnauthorizedResponse()
  updateProfile(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(UpdateAdminProfileSchema)) dto: UpdateAdminProfileDto,
  ) {
    return this.profileService.updateProfile(admin.id, dto);
  }

  @Put(ADMIN_PROFILE_ROUTES.SETTINGS)
  @ApiOperation({ summary: 'Update admin app settings (language, timezone, dateFormat)' })
  @ApiOkResponse({ description: 'Updated settings' })
  @ApiUnauthorizedResponse()
  updateSettings(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(UpdateAdminSettingsSchema)) dto: UpdateAdminSettingsDto,
  ) {
    return this.profileService.updateSettings(admin.id, dto);
  }
}
