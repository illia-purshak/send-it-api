import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SubscriptionStatus } from '../../../../generated/prisma/enums.js';

const LEVEL_ORDER = { FREE: 0, PRO: 1, BUSINESS: 2 } as const;

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async getMySubscription(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
      include: { plan: true, nextPlan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async upgrade(userId: number, planId: number) {
    const { subscription, targetPlan } = await this.resolveChange(userId, planId);

    const currentLevel = LEVEL_ORDER[subscription.plan.level];
    const targetLevel = LEVEL_ORDER[targetPlan.level];

    if (targetLevel <= currentLevel) {
      throw new BadRequestException('Target plan must be higher than current plan');
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Cancel pending changes before scheduling a new one');
    }

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.PENDING_UPGRADE, nextPlanId: planId },
      include: { plan: true, nextPlan: true },
    });
  }

  async downgrade(userId: number, planId: number) {
    const { subscription, targetPlan } = await this.resolveChange(userId, planId);

    const currentLevel = LEVEL_ORDER[subscription.plan.level];
    const targetLevel = LEVEL_ORDER[targetPlan.level];

    if (targetLevel >= currentLevel) {
      throw new BadRequestException('Target plan must be lower than current plan');
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Cancel pending changes before scheduling a new one');
    }

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.PENDING_DOWNGRADE, nextPlanId: planId },
      include: { plan: true, nextPlan: true },
    });
  }

  async cancel(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (subscription.plan.level === 'FREE') {
      throw new BadRequestException('Cannot cancel a FREE plan');
    }
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        nextPlanId: null,
      },
      include: { plan: true, nextPlan: true },
    });
  }

  async cancelScheduled(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (
      subscription.status !== SubscriptionStatus.PENDING_UPGRADE &&
      subscription.status !== SubscriptionStatus.PENDING_DOWNGRADE
    ) {
      throw new BadRequestException('No pending plan change to cancel');
    }

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.ACTIVE, nextPlanId: null },
      include: { plan: true, nextPlan: true },
    });
  }

  private async resolveChange(userId: number, planId: number) {
    const [subscription, targetPlan] = await Promise.all([
      this.prisma.db.userSubscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
      this.prisma.db.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (!targetPlan || !targetPlan.isActive) {
      throw new BadRequestException('Invalid or inactive plan');
    }
    return { subscription, targetPlan };
  }
}
