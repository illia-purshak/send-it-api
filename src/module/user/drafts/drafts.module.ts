import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { DraftsController } from './drafts.controller.js';
import { ShipmentDraftsService } from '../shipments/shipment-drafts.service.js';

@Module({
  imports: [UserAuthModule],
  controllers: [DraftsController],
  providers: [ShipmentDraftsService],
  exports: [ShipmentDraftsService],
})
export class DraftsModule {}
