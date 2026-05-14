import { Module } from '@nestjs/common';
import { PostalConnectionsService } from './postal-connections.service.js';
import { PostalConnectionsController } from './postal-connections.controller.js';
import { NovaPostAuthService } from './nova-post/nova-post-auth.service.js';
import { NovaPostAuthController } from './nova-post/nova-post-auth.controller.js';
import { NovaPoshtaService } from './nova-poshta/nova-poshta.service.js';
import { NovaPoshtaController } from './nova-poshta/nova-poshta.controller.js';

@Module({
  controllers: [PostalConnectionsController, NovaPostAuthController, NovaPoshtaController],
  providers: [PostalConnectionsService, NovaPostAuthService, NovaPoshtaService],
  exports: [PostalConnectionsService, NovaPostAuthService, NovaPoshtaService],
})
export class PostalConnectionsModule {}
