import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  SubscriptionStatus,
  DiscountType,
} from '../../../../generated/prisma/enums.js';
import type { AdminGetSubscriptionsQueryDto } from '../../../validation/subscription/subscription.schema.js';

@Injectable()
export class AdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: AdminGetSubscriptionsQueryDto) {
    const { page, limit, plan, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (plan) where['plan'] = { level: plan };
    if (status) where['status'] = status;
    if (search) {
      where['user'] = {
        profile: { companyName: { contains: search, mode: 'insensitive' } },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.db.userSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          nextPlan: true,
          user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
        },
      }),
      this.prisma.db.userSubscription.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async changePlan(userId: number, planId: number) {
    const [user, targetPlan] = await Promise.all([
      this.prisma.db.user.findUnique({
        where: { id: userId },
        include: { subscription: { include: { plan: true } } },
      }),
      this.prisma.db.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!user.subscription) throw new NotFoundException('Subscription not found');
    if (!targetPlan || !targetPlan.isActive) throw new BadRequestException('Invalid plan');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        nextPlanId: null,
        cancelledAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        customAmount: null,
        discountType: null,
      },
      include: { plan: true, nextPlan: true },
    });
  }

  async extendSubscription(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const newEnd = new Date(subscription.currentPeriodEnd);
    newEnd.setMonth(newEnd.getMonth() + 1);

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: { currentPeriodEnd: newEnd },
      include: { plan: true, nextPlan: true },
    });
  }

  async forceCancel(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
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

  async setDiscount(userId: number, amount: number, discountType: DiscountType) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    return this.prisma.db.userSubscription.update({
      where: { userId },
      data: { customAmount: amount, discountType },
      include: { plan: true, nextPlan: true },
    });
  }
}
