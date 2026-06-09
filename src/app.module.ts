import { Module } from '@nestjs/common';
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
import { DraftsModule } from './module/user/drafts/drafts.module.js';
import { TemplatesModule } from './module/user/templates/templates.module.js';
import { ProfileModule } from './module/user/profile/profile.module.js';
import { RecipientsModule } from './module/user/recipients/recipients.module.js';
import { NotificationsModule } from './module/user/notifications/notifications.module.js';
import { AdminProfileModule } from './module/admin/profile/profile.module.js';
import { AdminUsersModule } from './module/admin/users/admin-users.module.js';
import { AdminServicesModule } from './module/admin/services/admin-services.module.js';
import { AdminSupportModule } from './module/admin/support/admin-support.module.js';
import { SupportModule } from './module/user/support/support.module.js';
import { AdminAdminsModule } from './module/admin/admins/admin-admins.module.js';
import { AdminPlansModule } from './module/admin/plans/admin-plans.module.js';
import { AdminStatisticsModule } from './module/admin/statistics/admin-statistics.module.js';
import { AnalyticsModule } from './module/user/analytics/analytics.module.js';

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
    DraftsModule,
    TemplatesModule,
    ProfileModule,
    RecipientsModule,
    NotificationsModule,
    SupportModule,
    AdminProfileModule,
    AdminUsersModule,
    AdminServicesModule,
    AdminSupportModule,
    AdminAdminsModule,
    AdminPlansModule,
    AdminStatisticsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
