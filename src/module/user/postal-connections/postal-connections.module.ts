import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PostalConnectionsService } from './postal-connections.service.js';
import { PostalConnectionsController } from './postal-connections.controller.js';
import { NovaPostAuthService } from './nova-post/nova-post-auth.service.js';
import { NovaPostAuthController } from './nova-post/nova-post-auth.controller.js';
import { NovaPostApiClient } from './nova-post/nova-post-api.client.js';
import { NovaPoshtaService } from './nova-poshta/nova-poshta.service.js';
import { NovaPoshtaController } from './nova-poshta/nova-poshta.controller.js';
import { UkrposhtaService } from './ukrposhta/ukrposhta.service.js';
import { UkrposhtaController } from './ukrposhta/ukrposhta.controller.js';
import { MeestService } from './meest/meest.service.js';
import { MeestController } from './meest/meest.controller.js';

@Module({
  imports: [UserAuthModule, NotificationsModule],
  controllers: [PostalConnectionsController, NovaPostAuthController, NovaPoshtaController, UkrposhtaController, MeestController],
  providers: [PostalConnectionsService, NovaPostAuthService, NovaPostApiClient, NovaPoshtaService, UkrposhtaService, MeestService],
  exports: [PostalConnectionsService, NovaPostAuthService, NovaPostApiClient, NovaPoshtaService, UkrposhtaService, MeestService],
})
export class PostalConnectionsModule {}
