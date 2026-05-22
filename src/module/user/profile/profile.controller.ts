import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  UpdateProfileSchema,
  UpdateSettingsSchema,
  type UpdateProfileDto,
  type UpdateSettingsDto,
} from '../../../validation/profile/profile.schema.js';
import { ProfileService } from './profile.service.js';
import { PROFILE_ROUTES, USERS_ROUTES } from '../../../constants/apiRoutes.js';

@ApiTags('Profile')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(PROFILE_ROUTES.BASE)
  @ApiOperation({ summary: 'Fetch the authenticated user\'s full profile' })
  @ApiOkResponse({ description: 'User profile' })
  @ApiUnauthorizedResponse()
  getProfile(@CurrentUser() user: JwtUser) {
    return this.profileService.getProfile(user.id);
  }

  @Put(PROFILE_ROUTES.BASE)
  @ApiOperation({ summary: 'Update organization data' })
  @ApiOkResponse({ description: 'Updated profile' })
  @ApiUnauthorizedResponse()
  updateProfile(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Put(PROFILE_ROUTES.SETTINGS)
  @ApiOperation({ summary: 'Update app settings and notification preferences' })
  @ApiOkResponse({ description: 'Updated settings' })
  @ApiUnauthorizedResponse()
  updateSettings(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(UpdateSettingsSchema)) dto: UpdateSettingsDto,
  ) {
    return this.profileService.updateSettings(user.id, dto);
  }

  @Delete(USERS_ROUTES.ME)
  @HttpCode(204)
  @ApiOperation({ summary: 'Schedule account deletion (30-day grace period)' })
  @ApiNoContentResponse({ description: 'Account scheduled for deletion' })
  @ApiUnauthorizedResponse()
  scheduleDelete(@CurrentUser() user: JwtUser) {
    return this.profileService.scheduleDelete(user.id);
  }

  @Post(USERS_ROUTES.ME_RESTORE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a pending account deletion' })
  @ApiOkResponse({ description: 'Deletion cancelled' })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  restoreAccount(@CurrentUser() user: JwtUser) {
    return this.profileService.restoreAccount(user.id);
  }
}
