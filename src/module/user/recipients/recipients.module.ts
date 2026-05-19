import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { RecipientsController } from './recipients.controller.js';
import { RecipientsService } from './recipients.service.js';
import { FeatureGuard } from '../../../common/guards/feature.guard.js';

@Module({
  imports: [UserAuthModule],
  controllers: [RecipientsController],
  providers: [RecipientsService, FeatureGuard],
})
export class RecipientsModule {}
