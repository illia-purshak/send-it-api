import { Body, Controller, HttpCode, Post } from '@nestjs/common';
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

@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post(AUTH_ROUTES.REGISTER)
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.LOGIN)
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.REFRESH)
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.FORGOT_PASSWORD)
  @HttpCode(200)
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post(AUTH_ROUTES.RESET_PASSWORD)
  @HttpCode(200)
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Post(AUTH_ROUTES.LOGOUT)
  @HttpCode(200)
  logout(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(LogoutSchema)) dto: LogoutDto,
  ) {
    return this.authService.logout(user, dto);
  }

  @Post(AUTH_ROUTES.TWO_FA_SETUP)
  setup2fa(@CurrentUser() user: JwtUser) {
    return this.authService.setup2fa(user);
  }

  @Post(AUTH_ROUTES.TWO_FA_ENABLE)
  @HttpCode(200)
  enable2fa(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(TwoFactorEnableSchema)) dto: TwoFactorEnableDto,
  ) {
    return this.authService.enable2fa(user, dto);
  }

  @Post(AUTH_ROUTES.TWO_FA_DISABLE)
  @HttpCode(200)
  disable2fa(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(TwoFactorEnableSchema)) dto: TwoFactorEnableDto,
  ) {
    return this.authService.disable2fa(user, dto);
  }

  @Public()
  @Post(AUTH_ROUTES.TWO_FA_VERIFY)
  @HttpCode(200)
  verify2fa(
    @Body(new ZodValidationPipe(TwoFactorVerifySchema)) dto: TwoFactorVerifyDto,
  ) {
    return this.authService.verify2fa(dto);
  }
}
