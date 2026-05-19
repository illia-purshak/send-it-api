import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { PostalConnectionsModule } from '../postal-connections/postal-connections.module.js';
import { DraftsModule } from '../drafts/drafts.module.js';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentReadService } from './shipment-read.service.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';
import { UkrposhtaShipmentsService } from './ukrposhta-shipments.service.js';
import { MeestShipmentsService } from './meest-shipments.service.js';

@Module({
  imports: [UserAuthModule, PostalConnectionsModule, DraftsModule],
  controllers: [ShipmentsController],
  providers: [NovaPostShipmentsService, UkrposhtaShipmentsService, MeestShipmentsService, ShipmentReadService],
})
export class ShipmentsModule {}
