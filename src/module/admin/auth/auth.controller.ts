import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator.js';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ADMIN_AUTH_ROUTES } from '../../../constants/apiRoutes.js';
import {
  AcceptInviteSchema,
  AdminLoginSchema,
  AdminVerify2faSchema,
  AdminRefreshSchema,
  AdminLogoutSchema,
  Admin2faCodeSchema,
  type AcceptInviteDto,
  type AdminLoginDto,
  type AdminVerify2faDto,
  type AdminRefreshDto,
  type AdminLogoutDto,
  type Admin2faCodeDto,
} from '../../../validation/auth/admin.schema.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';
import {
  acceptInviteBodySchema,
  acceptInviteResponseSchema,
  adminEnable2faResponseSchema,
  badRequestErrorSchema,
  conflictErrorSchema,
  disable2faResponseSchema,
  forbiddenErrorSchema,
  loginBodySchema,
  loginResponseSchema,
  logoutBodySchema,
  logoutResponseSchema,
  refreshBodySchema,
  setup2faResponseSchema,
  tokenPairResponseSchema,
  totpCodeBodySchema,
  unauthorizedErrorSchema,
  verify2faBodySchema,
} from '../../../common/swagger/auth.swagger.js';

@Public()
@ApiTags('Admin Auth')
@Controller(ADMIN_AUTH_ROUTES.BASE)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post(ADMIN_AUTH_ROUTES.ACCEPT_INVITE)
  @ApiOperation({ summary: 'Accept an admin invite and create admin credentials' })
  @ApiBody({ schema: acceptInviteBodySchema })
  @ApiOkResponse({ description: 'Invite accepted', schema: acceptInviteResponseSchema })
  @ApiBadRequestResponse({ description: 'Invite token is invalid or expired', schema: badRequestErrorSchema })
  @ApiConflictResponse({ description: 'Admin account already exists', schema: conflictErrorSchema })
  acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.adminAuthService.acceptInvite(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.LOGIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in an admin account' })
  @ApiBody({ schema: loginBodySchema })
  @ApiOkResponse({
    description: 'Returns tokens directly or a pending token when admin 2FA verification is required',
    schema: loginResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials', schema: unauthorizedErrorSchema })
  @ApiForbiddenResponse({ description: 'Admin account setup is incomplete', schema: forbiddenErrorSchema })
  login(@Body(new ZodValidationPipe(AdminLoginSchema)) dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.VERIFY_2FA)
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete an admin 2FA login challenge' })
  @ApiBody({ schema: verify2faBodySchema })
  @ApiOkResponse({ description: '2FA challenge completed', schema: tokenPairResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({
    description: 'Pending token or TOTP code is invalid',
    schema: unauthorizedErrorSchema,
  })
  verify2fa(
    @Body(new ZodValidationPipe(AdminVerify2faSchema)) dto: AdminVerify2faDto,
  ) {
    return this.adminAuthService.verify2fa(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.REFRESH)
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh an admin access token' })
  @ApiBody({ schema: refreshBodySchema })
  @ApiOkResponse({ description: 'New admin token pair', schema: tokenPairResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
    schema: unauthorizedErrorSchema,
  })
  refresh(
    @Body(new ZodValidationPipe(AdminRefreshSchema)) dto: AdminRefreshDto,
  ) {
    return this.adminAuthService.refresh(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete(ADMIN_AUTH_ROUTES.LOGOUT)
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out the current admin' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: logoutBodySchema })
  @ApiOkResponse({ description: 'Logout completed', schema: logoutResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token', schema: unauthorizedErrorSchema })
  logout(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(AdminLogoutSchema)) dto: AdminLogoutDto,
  ) {
    return this.adminAuthService.logout(admin, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post(ADMIN_AUTH_ROUTES.TWO_FA_SETUP)
  @ApiOperation({ summary: 'Generate a TOTP secret and QR code for the current admin' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'TOTP setup payload', schema: setup2faResponseSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token', schema: unauthorizedErrorSchema })
  @ApiConflictResponse({ description: '2FA is already enabled', schema: conflictErrorSchema })
  setup2fa(@CurrentAdmin() admin: AdminJwtUser) {
    return this.adminAuthService.setup2fa(admin);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post(ADMIN_AUTH_ROUTES.TWO_FA_ENABLE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable admin 2FA and activate the account' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: totpCodeBodySchema })
  @ApiOkResponse({
    description: '2FA enabled and admin token pair issued',
    schema: adminEnable2faResponseSchema,
  })
  @ApiBadRequestResponse({ description: '2FA has not been set up or request is invalid', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid TOTP code or access token', schema: unauthorizedErrorSchema })
  enable2fa(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(Admin2faCodeSchema)) dto: Admin2faCodeDto,
  ) {
    return this.adminAuthService.enable2fa(admin, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete(ADMIN_AUTH_ROUTES.TWO_FA_DISABLE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable admin 2FA and deactivate the account' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: totpCodeBodySchema })
  @ApiOkResponse({ description: '2FA disabled', schema: disable2faResponseSchema })
  @ApiBadRequestResponse({ description: '2FA is not enabled or request is invalid', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid TOTP code or access token', schema: unauthorizedErrorSchema })
  disable2fa(
    @CurrentAdmin() admin: AdminJwtUser,
    @Body(new ZodValidationPipe(Admin2faCodeSchema)) dto: Admin2faCodeDto,
  ) {
    return this.adminAuthService.disable2fa(admin, dto);
  }
}
