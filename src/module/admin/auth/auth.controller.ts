import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminAuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator.js';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';
import { ADMIN_AUTH_ROUTES } from '../../../constants/apiRoutes.js';
import {
  SetPasswordSchema,
  Setup2faWithTokenSchema,
  VerifySetup2faSchema,
  AdminLoginSchema,
  AdminVerify2faSchema,
  AdminRefreshSchema,
  AdminLogoutSchema,
  Admin2faCodeSchema,
  type SetPasswordDto,
  type Setup2faWithTokenDto,
  type VerifySetup2faDto,
  type AdminLoginDto,
  type AdminVerify2faDto,
  type AdminRefreshDto,
  type AdminLogoutDto,
  type Admin2faCodeDto,
} from '../../../validation/auth/admin.schema.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';
import {
  adminLoginResponseSchema,
  adminEnable2faResponseSchema,
  badRequestErrorSchema,
  conflictErrorSchema,
  disable2faResponseSchema,
  loginBodySchema,
  logoutBodySchema,
  logoutResponseSchema,
  refreshBodySchema,
  setPasswordBodySchema,
  setPasswordResponseSchema,
  setup2faResponseSchema,
  setup2faWithTokenBodySchema,
  tokenPairResponseSchema,
  totpCodeBodySchema,
  unauthorizedErrorSchema,
  verify2faBodySchema,
  verifySetup2faBodySchema,
  verifySetup2faResponseSchema,
} from '../../../common/swagger/auth.swagger.js';

@ApiTags('Admin Auth')
@Controller(ADMIN_AUTH_ROUTES.BASE)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get(ADMIN_AUTH_ROUTES.VALIDATE_INVITE)
  @ApiOperation({ summary: 'Validate an admin invite token before showing the registration form' })
  @ApiParam({ name: 'token', description: 'Invite token from the email link' })
  @ApiOkResponse({ description: 'Token is valid — returns the invited email' })
  @ApiBadRequestResponse({ description: 'Token is invalid, expired, or already used', schema: badRequestErrorSchema })
  validateInvite(@Param('token') token: string) {
    return this.adminAuthService.validateInvite(token);
  }

  @Post(ADMIN_AUTH_ROUTES.SET_PASSWORD)
  @ApiOperation({ summary: 'Step 1 of onboarding: set password using a valid invite token' })
  @ApiBody({ schema: setPasswordBodySchema })
  @ApiOkResponse({ description: 'Password set — proceed to 2FA setup', schema: setPasswordResponseSchema })
  @ApiBadRequestResponse({ description: 'Invite token is invalid, expired, or admin not in PENDING state', schema: badRequestErrorSchema })
  setPassword(
    @Body(new ZodValidationPipe(SetPasswordSchema)) dto: SetPasswordDto,
  ) {
    return this.adminAuthService.setPassword(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.TWO_FA_SETUP)
  @ApiOperation({ summary: 'Step 2 of onboarding: generate TOTP secret and QR code using invite token' })
  @ApiBody({ schema: setup2faWithTokenBodySchema })
  @ApiOkResponse({ description: 'TOTP setup payload', schema: setup2faResponseSchema })
  @ApiBadRequestResponse({ description: 'Invite token is invalid or expired', schema: badRequestErrorSchema })
  setup2faWithToken(
    @Body(new ZodValidationPipe(Setup2faWithTokenSchema)) dto: Setup2faWithTokenDto,
  ) {
    return this.adminAuthService.setup2faWithToken(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.TWO_FA_VERIFY_SETUP)
  @ApiOperation({ summary: 'Step 3 of onboarding: verify TOTP, activate admin, and receive token pair' })
  @ApiBody({ schema: verifySetup2faBodySchema })
  @ApiOkResponse({ description: 'Admin activated and token pair issued', schema: verifySetup2faResponseSchema })
  @ApiBadRequestResponse({ description: 'Invalid invite token or TOTP code', schema: badRequestErrorSchema })
  verifySetupWithToken(
    @Body(new ZodValidationPipe(VerifySetup2faSchema)) dto: VerifySetup2faDto,
  ) {
    return this.adminAuthService.verifySetupWithToken(dto);
  }

  @Post(ADMIN_AUTH_ROUTES.LOGIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in an admin account' })
  @ApiBody({ schema: loginBodySchema })
  @ApiOkResponse({
    description:
      'Returns tokens directly, a pending token for admin 2FA verification, or a setup token for first-time admin onboarding',
    schema: adminLoginResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials', schema: unauthorizedErrorSchema })
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
  @Post(ADMIN_AUTH_ROUTES.TWO_FA_ENABLE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable admin 2FA (for already-authenticated admins reconfiguring 2FA)' })
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
