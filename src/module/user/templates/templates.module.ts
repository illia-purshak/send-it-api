import { Module } from '@nestjs/common';
import { UserAuthModule } from '../auth/auth.module.js';
import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';
import { FeatureGuard } from '../../../common/guards/feature.guard.js';

@Module({
  imports: [UserAuthModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, FeatureGuard],
})
export class TemplatesModule {}
