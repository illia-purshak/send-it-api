import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './auth.controller.js';
import { AdminAuthService } from './auth.service.js';
import { AdminJwtAuthGuard } from '../../../common/guards/admin-jwt-auth.guard.js';

type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (cfg.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m') as JwtExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtAuthGuard],
  exports: [AdminJwtAuthGuard, JwtModule],
})
export class AdminAuthModule {}
