import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  DiscountType,
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
} from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type { AdminGetSubscriptionsQueryDto } from '../../../validation/subscription/subscription.schema.js';

@Injectable()
export class AdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: AdminGetSubscriptionsQueryDto) {
    const { page, limit, level, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (level !== undefined) where['plan'] = { level };
    if (status) where['status'] = status;
    if (search) {
      where['user'] = {
        profile: { companyName: { contains: search, mode: 'insensitive' } },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.db.userSubscriptionBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
        },
      }),
      this.prisma.db.userSubscriptionBalance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getById(balanceId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
      include: {
        plan: true,
        user: { select: { id: true, email: true, profile: { select: { companyName: true } } } },
      },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');
    return balance;
  }

  async changePlan(balanceId: number, planId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');

    const targetPlan = await this.prisma.db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!targetPlan || !targetPlan.isActive) throw new BadRequestException('Invalid or inactive plan');

    const updated = await this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: {
        planId,
        customAmount: null,
        discountType: null,
      },
      include: { plan: true },
    });

    if (balance.status === SubscriptionBalanceStatus.ACTIVE) {
      await this.applyOperatorLimits(balance.userId, targetPlan.maxOperators);
    }

    return updated;
  }

  async extendBalance(balanceId: number, days: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');

    const currentEnd = balance.periodEnd ?? new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    return this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { periodEnd: newEnd, daysTotal: balance.daysTotal + days },
      include: { plan: true },
    });
  }

  async cancelBalance(balanceId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');
    if (!balance.autoRenew) throw new BadRequestException('Subscription is already cancelled');

    return this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { autoRenew: false },
      include: { plan: true },
    });
  }

  async suspendBalance(balanceId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');
    if (balance.status !== SubscriptionBalanceStatus.ACTIVE)
      throw new BadRequestException('Only ACTIVE subscriptions can be suspended');

    return this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { status: SubscriptionBalanceStatus.PAUSED, pausedAt: new Date() },
      include: { plan: true },
    });
  }

  async reactivateBalance(balanceId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');
    if (balance.status !== SubscriptionBalanceStatus.PAUSED)
      throw new BadRequestException('Only PAUSED subscriptions can be reactivated');

    return this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { status: SubscriptionBalanceStatus.ACTIVE, pausedAt: null },
      include: { plan: true },
    });
  }

  async setDiscount(balanceId: number, amount: number, discountType: DiscountType) {
    const balance = await this.prisma.db.userSubscriptionBalance.findUnique({
      where: { id: balanceId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');

    return this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { customAmount: amount, discountType },
      include: { plan: true },
    });
  }

  private async applyOperatorLimits(userId: number, maxOperators: number) {
    const activeConnections = await this.prisma.db.userPostalConnection.findMany({
      where: { userId, status: PostalConnectionStatus.ACTIVE },
      orderBy: { connectedAt: 'asc' },
    });

    if (activeConnections.length > maxOperators) {
      const toBlock = activeConnections.slice(maxOperators);
      await this.prisma.db.userPostalConnection.updateMany({
        where: { id: { in: toBlock.map((c) => c.id) } },
        data: { status: PostalConnectionStatus.BLOCKED },
      });
    } else {
      await this.prisma.db.userPostalConnection.updateMany({
        where: { userId, status: PostalConnectionStatus.BLOCKED },
        data: { status: PostalConnectionStatus.ACTIVE },
      });
    }
  }
}
