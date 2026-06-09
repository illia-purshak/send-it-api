import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubscriptionBalanceStatus } from '../../../generated/prisma/enums.js';
import { FEATURE_KEY, type FeatureFlag } from '../decorators/require-feature.decorator.js';
import type { JwtUser } from '../../types/auth.types.js';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<FeatureFlag>(FEATURE_KEY, context.getHandler());
    if (!feature) return true;

    const user = context.switchToHttp().getRequest().user as JwtUser;

    const active = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId: user.id, status: SubscriptionBalanceStatus.ACTIVE },
      include: { plan: true },
    });

    const plan = active?.plan
      ?? await this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } });

    if (!plan || !plan[feature]) {
      throw new ForbiddenException('FEATURE_NOT_AVAILABLE');
    }

    return true;
  }
}
