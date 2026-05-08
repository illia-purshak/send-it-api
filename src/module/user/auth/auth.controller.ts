import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AUTH_ROUTES } from '../../../constants/apiRoutes.js';
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  LogoutSchema,
  TwoFactorEnableSchema,
  TwoFactorVerifySchema,
  type RegisterDto,
  type LoginDto,
  type RefreshDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type LogoutDto,
  type TwoFactorEnableDto,
  type TwoFactorVerifyDto,
} from '../../../validation/auth/user.schema.js';
import type { JwtUser } from '../../../types/auth.types.js';
import {
  badRequestErrorSchema,
  conflictErrorSchema,
  disable2faResponseSchema,
  enable2faResponseSchema,
  forbiddenErrorSchema,
  forgotPasswordBodySchema,
  forgotPasswordResponseSchema,
  loginBodySchema,
  loginResponseSchema,
  logoutBodySchema,
  logoutResponseSchema,
  refreshBodySchema,
  registerBodySchema,
  registerResponseSchema,
  resetPasswordBodySchema,
  resetPasswordResponseSchema,
  setup2faResponseSchema,
  tokenPairResponseSchema,
  totpCodeBodySchema,
  unauthorizedErrorSchema,
  verify2faBodySchema,
} from '../../../common/swagger/auth.swagger.js';

@ApiTags('User Auth')
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post(AUTH_ROUTES.REGISTER)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ schema: registerBodySchema })
  @ApiCreatedResponse({ description: 'User account created', schema: registerResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiConflictResponse({ description: 'Email already exists', schema: conflictErrorSchema })
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.LOGIN)
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ schema: loginBodySchema })
  @ApiOkResponse({
    description: 'Returns tokens directly or a pending token when 2FA is enabled',
    schema: loginResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials', schema: unauthorizedErrorSchema })
  @ApiForbiddenResponse({ description: 'Account is banned or inactive', schema: forbiddenErrorSchema })
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.REFRESH)
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiBody({ schema: refreshBodySchema })
  @ApiOkResponse({ description: 'New token pair', schema: tokenPairResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
    schema: unauthorizedErrorSchema,
  })
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.FORGOT_PASSWORD)
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ schema: forgotPasswordBodySchema })
  @ApiOkResponse({ description: 'Generic reset response', schema: forgotPasswordResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.RESET_PASSWORD)
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset a password with a reset token' })
  @ApiBody({ schema: resetPasswordBodySchema })
  @ApiOkResponse({ description: 'Password reset completed', schema: resetPasswordResponseSchema })
  @ApiBadRequestResponse({ description: 'Invalid or expired reset token', schema: badRequestErrorSchema })
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Post(AUTH_ROUTES.LOGOUT)
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out the current user' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: logoutBodySchema })
  @ApiOkResponse({ description: 'Logout completed', schema: logoutResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token', schema: unauthorizedErrorSchema })
  logout(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(LogoutSchema)) dto: LogoutDto,
  ) {
    return this.authService.logout(user, dto);
  }

  @Post(AUTH_ROUTES.TWO_FA_SETUP)
  @ApiOperation({ summary: 'Generate a TOTP secret and QR code for the current user' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'TOTP setup payload', schema: setup2faResponseSchema })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token', schema: unauthorizedErrorSchema })
  setup2fa(@CurrentUser() user: JwtUser) {
    return this.authService.setup2fa(user);
  }

  @Post(AUTH_ROUTES.TWO_FA_ENABLE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable 2FA for the current user' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: totpCodeBodySchema })
  @ApiOkResponse({ description: '2FA enabled', schema: enable2faResponseSchema })
  @ApiBadRequestResponse({ description: '2FA has not been set up or request is invalid', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid TOTP code or access token', schema: unauthorizedErrorSchema })
  enable2fa(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(TwoFactorEnableSchema)) dto: TwoFactorEnableDto,
  ) {
    return this.authService.enable2fa(user, dto);
  }

  @Post(AUTH_ROUTES.TWO_FA_DISABLE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable 2FA for the current user' })
  @ApiBearerAuth('bearer')
  @ApiBody({ schema: totpCodeBodySchema })
  @ApiOkResponse({ description: '2FA disabled', schema: disable2faResponseSchema })
  @ApiBadRequestResponse({ description: '2FA is not enabled or request is invalid', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid TOTP code or access token', schema: unauthorizedErrorSchema })
  disable2fa(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(TwoFactorEnableSchema)) dto: TwoFactorEnableDto,
  ) {
    return this.authService.disable2fa(user, dto);
  }

  @Public()
  @Post(AUTH_ROUTES.TWO_FA_VERIFY)
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete a pending 2FA challenge' })
  @ApiBody({ schema: verify2faBodySchema })
  @ApiOkResponse({ description: '2FA challenge completed', schema: tokenPairResponseSchema })
  @ApiBadRequestResponse({ description: 'Validation error', schema: badRequestErrorSchema })
  @ApiUnauthorizedResponse({
    description: 'Pending token or TOTP code is invalid',
    schema: unauthorizedErrorSchema,
  })
  verify2fa(
    @Body(new ZodValidationPipe(TwoFactorVerifySchema)) dto: TwoFactorVerifyDto,
  ) {
    return this.authService.verify2fa(dto);
  }
}
