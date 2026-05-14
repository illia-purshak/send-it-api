import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UserAuthModule } from './module/user/auth/auth.module.js';
import { AdminAuthModule } from './module/admin/auth/auth.module.js';
import { UserSubscriptionModule } from './module/user/subscription/subscription.module.js';
import { AdminSubscriptionModule } from './module/admin/subscription/admin-subscription.module.js';
import { BillingModule } from './module/user/billing/billing.module.js';
import { PostalConnectionsModule } from './module/user/postal-connections/postal-connections.module.js';
import { OnboardingModule } from './module/user/onboarding/onboarding.module.js';
import { SchedulerModule } from './module/scheduler/scheduler.module.js';
import { ShipmentsModule } from './module/user/shipments/shipments.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UserAuthModule,
    AdminAuthModule,
    UserSubscriptionModule,
    AdminSubscriptionModule,
    BillingModule,
    PostalConnectionsModule,
    OnboardingModule,
    SchedulerModule,
    ShipmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
