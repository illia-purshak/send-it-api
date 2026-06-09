import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PostalConnectionsService } from './postal-connections.service.js';
import { PostalConnectionsController } from './postal-connections.controller.js';
import { NovaPostAuthService } from './nova-post/nova-post-auth.service.js';
import { NovaPostAuthController } from './nova-post/nova-post-auth.controller.js';
import { NovaPostApiClient } from './nova-post/nova-post-api.client.js';

@Module({
  imports: [UserAuthModule, NotificationsModule],
  controllers: [PostalConnectionsController, NovaPostAuthController],
  providers: [PostalConnectionsService, NovaPostAuthService, NovaPostApiClient],
  exports: [PostalConnectionsService, NovaPostAuthService, NovaPostApiClient],
})
export class PostalConnectionsModule {}
