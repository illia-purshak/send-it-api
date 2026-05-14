import { Module } from '@nestjs/common';
import { PostalConnectionsModule } from '../postal-connections/postal-connections.module.js';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentDraftsService } from './shipment-drafts.service.js';
import { ShipmentReadService } from './shipment-read.service.js';
import { ShipmentTemplatesService } from './shipment-templates.service.js';
import { NovaPostShipmentsService } from './nova-post-shipments.service.js';

@Module({
  imports: [PostalConnectionsModule],
  controllers: [ShipmentsController],
  providers: [
    ShipmentDraftsService,
    ShipmentTemplatesService,
    NovaPostShipmentsService,
    ShipmentReadService,
  ],
})
export class ShipmentsModule {}
