import { SetMetadata } from '@nestjs/common';

export type FeatureFlag = 'hasAnalytics' | 'hasTemplates' | 'hasRecipients';

export const FEATURE_KEY = 'requiredFeature';
export const RequireFeature = (feature: FeatureFlag) => SetMetadata(FEATURE_KEY, feature);
