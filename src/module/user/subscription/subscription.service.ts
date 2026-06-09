import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  NotificationType,
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
  SubscriptionPeriodType,
} from '../../../../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BillingService } from '../billing/billing.service.js';
import type { BuySubscriptionDto, UpdateBalanceDto } from '../../../validation/subscription/subscription.schema.js';
import { getSwitchDelayMs } from '../../../config/subscription.config.js';

const DAYS_MONTHLY = 30;
const DAYS_YEARLY = 365;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrow(): Date {
  return addDays(new Date(), 1);
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly billing: BillingService,
  ) {}

  async getPlans(userId: number) {
    return this.prisma.db.subscriptionPlan.findMany({
      where: {
        isActive: true,
        OR: [
          { isPublic: true, isPersonal: false },
          { isPersonal: true, targetUserId: userId },
        ],
      },
      orderBy: { level: 'asc' },
    });
  }

  async getMySubscriptions(userId: number) {
    const balances = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        userId,
        status: { not: SubscriptionBalanceStatus.EXPIRED },
      },
      include: { plan: true },
      orderBy: { position: 'asc' },
    });

    return balances.map((balance) => this._serializeBalance(balance));
  }

  async buySubscription(userId: number, dto: BuySubscriptionDto) {
    const { planId, periodType, activateNow } = dto;
    const daysTotal = periodType === SubscriptionPeriodType.YEARLY ? DAYS_YEARLY : DAYS_MONTHLY;

    const plan = await this.prisma.db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new BadRequestException('Invalid or inactive plan');
    if (plan.level === 0) throw new BadRequestException('FREE plan cannot be purchased');
    if (plan.isPersonal && plan.targetUserId !== userId) {
      throw new ForbiddenException('This plan is not available for your account');
    }

    const existingSameLevel = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: {
        userId,
        planId,
        status: { not: SubscriptionBalanceStatus.EXPIRED },
      },
    });

    if (existingSameLevel) {
      const newPeriodEnd = existingSameLevel.periodEnd
        ? addDays(existingSameLevel.periodEnd, daysTotal)
        : addDays(tomorrow(), daysTotal);

      const updated = await this.prisma.db.userSubscriptionBalance.update({
        where: { id: existingSameLevel.id },
        data: { periodEnd: newPeriodEnd, daysTotal: existingSameLevel.daysTotal + daysTotal },
        include: { plan: true },
      });

      const amount = Number(
        periodType === SubscriptionPeriodType.YEARLY && plan.priceYearly
          ? plan.priceYearly
          : plan.price,
      );
      const periodStart = new Date();
      await this.billing.createBillingRecord(
        userId,
        planId,
        existingSameLevel.id,
        amount,
        periodType,
        periodStart,
        newPeriodEnd,
      );

      void this.notifications.create(
        userId,
        NotificationType.SUBSCRIPTION,
        'Subscription extended',
        `Added ${daysTotal} days to your ${plan.name} plan.`,
      );
      return this._serializeBalance(updated);
    }

    const activeBalance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
      include: { plan: true },
    });

    let newStatus: SubscriptionBalanceStatus;
    let newPosition: number;
    const isCurrentlyFree = activeBalance ? this._isFreePlan(activeBalance.plan.level) : false;
    const newPeriodEnd: Date | null = addDays(tomorrow(), daysTotal);

    if (!activeBalance) {
      newStatus = SubscriptionBalanceStatus.ACTIVE;
      newPosition = 0;
    } else if (isCurrentlyFree) {
      const maxPos = await this._getMaxPosition(userId);
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: {
          status: SubscriptionBalanceStatus.PAUSED,
          pausedAt: new Date(),
          position: maxPos + 1,
        },
      });
      newStatus = SubscriptionBalanceStatus.ACTIVE;
      newPosition = 0;
    } else if (activateNow) {
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: { status: SubscriptionBalanceStatus.PAUSED, pausedAt: new Date() },
      });
      const maxPos = await this._getMaxPosition(userId);
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: { position: maxPos + 1 },
      });
      newStatus = SubscriptionBalanceStatus.ACTIVE;
      newPosition = 0;
    } else {
      const maxPos = await this._getMaxPosition(userId);
      newStatus = SubscriptionBalanceStatus.QUEUED;
      newPosition = maxPos + 1;
    }

    const balance = await this.prisma.db.userSubscriptionBalance.create({
      data: {
        userId,
        planId,
        periodType,
        daysTotal,
        periodEnd:
          newStatus === SubscriptionBalanceStatus.ACTIVE
            ? newPeriodEnd
            : addDays(tomorrow(), daysTotal),
        status: newStatus,
        autoRenew: plan.autoRenewDefault,
        position: newPosition,
      },
      include: { plan: true },
    });

    if (newStatus === SubscriptionBalanceStatus.ACTIVE) {
      await this._applyOperatorLimits(userId, plan.maxOperators);
    }

    const amount = Number(
      periodType === SubscriptionPeriodType.YEARLY && plan.priceYearly
        ? plan.priceYearly
        : plan.price,
    );
    const periodStart = new Date();
    await this.billing.createBillingRecord(
      userId,
      planId,
      balance.id,
      amount,
      periodType,
      periodStart,
      balance.periodEnd!,
    );

    void this.notifications.create(
      userId,
      NotificationType.SUBSCRIPTION,
      'Subscription purchased',
      newStatus === SubscriptionBalanceStatus.ACTIVE
        ? `Your ${plan.name} plan is now active.`
        : `Your ${plan.name} plan has been added to the queue.`,
    );

    return this._serializeBalance(balance);
  }

  async updateBalance(userId: number, balanceId: number, dto: UpdateBalanceDto) {
    const balance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { id: balanceId, userId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');

    const updates: Record<string, unknown> = {};

    if (dto.autoRenew !== undefined) {
      updates['autoRenew'] = dto.autoRenew;
    }

    if (dto.cancelSwitch) {
      if (!balance.scheduledSwitchAt) {
        throw new BadRequestException('No scheduled switch to cancel');
      }
      updates['scheduledSwitchTo'] = null;
      updates['scheduledSwitchAt'] = null;
    } else if (dto.scheduledSwitchTo !== undefined) {
      const activeBalance = await this.prisma.db.userSubscriptionBalance.findFirst({
        where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
      });
      if (!activeBalance) throw new BadRequestException('No active subscription to switch from');

      const now = new Date();
      if (activeBalance.scheduledSwitchAt && activeBalance.scheduledSwitchAt > now) {
        throw new BadRequestException({
          code: 'SWITCH_ALREADY_SCHEDULED',
          message: 'A switch is already scheduled',
        });
      }

      const targetBalance = await this.prisma.db.userSubscriptionBalance.findFirst({
        where: { id: dto.scheduledSwitchTo, userId },
        include: { plan: true },
      });
      if (!targetBalance) throw new NotFoundException('Target subscription balance not found');
      if (targetBalance.status === SubscriptionBalanceStatus.ACTIVE) {
        throw new BadRequestException('Target is already the active subscription');
      }
      if (targetBalance.plan.level === 0) {
        const hasPaidBalances = await this.prisma.db.userSubscriptionBalance.count({
          where: {
            userId,
            status: { in: [SubscriptionBalanceStatus.QUEUED, SubscriptionBalanceStatus.PAUSED] },
            plan: { level: { gt: 0 } },
          },
        });
        if (hasPaidBalances > 0) {
          throw new BadRequestException('Cannot manually switch to FREE while paid subscriptions exist');
        }
      }

      const switchAt = new Date(Date.now() + getSwitchDelayMs());
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: {
          scheduledSwitchTo: dto.scheduledSwitchTo,
          scheduledSwitchAt: switchAt,
        },
      });
      const current = await this.prisma.db.userSubscriptionBalance.findFirst({
        where: { id: balanceId, userId },
        include: { plan: true },
      });
      return current ? this._serializeBalance(current) : current;
    }

    if (Object.keys(updates).length === 0) {
      const current = await this.prisma.db.userSubscriptionBalance.findFirst({
        where: { id: balanceId, userId },
        include: { plan: true },
      });
      return current ? this._serializeBalance(current) : current;
    }

    const updated = await this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: updates,
      include: { plan: true },
    });
    return this._serializeBalance(updated);
  }

  async cancelBalance(userId: number, balanceId: number) {
    const balance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { id: balanceId, userId },
      include: { plan: true },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found');
    if (balance.plan.level === 0) {
      throw new BadRequestException('Cannot cancel FREE plan');
    }
    if (balance.status === SubscriptionBalanceStatus.EXPIRED) {
      throw new BadRequestException('Cannot cancel an already expired subscription');
    }

    const updated = await this.prisma.db.userSubscriptionBalance.update({
      where: { id: balanceId },
      data: { autoRenew: false },
      include: { plan: true },
    });

    void this.notifications.create(
      userId,
      NotificationType.SUBSCRIPTION,
      'Subscription cancelled',
      `Your ${balance.plan.name} subscription will not renew. It remains active until ${balance.periodEnd?.toISOString().split('T')[0] ?? 'end of period'}.`,
    );

    return this._serializeBalance(updated);
  }

  async activateNextInQueue(userId: number) {
    const candidates = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        userId,
        status: { in: [SubscriptionBalanceStatus.QUEUED, SubscriptionBalanceStatus.PAUSED] },
      },
      include: { plan: true },
    });

    if (candidates.length === 0) {
      const freePlan = await this.prisma.db.subscriptionPlan.findFirst({
        where: { level: 0, isActive: true },
      });
      if (freePlan) {
        await this.prisma.db.userSubscriptionBalance.create({
          data: {
            userId,
            planId: freePlan.id,
            periodType: SubscriptionPeriodType.MONTHLY,
            daysTotal: 0,
            periodEnd: null,
            status: SubscriptionBalanceStatus.ACTIVE,
            autoRenew: true,
            position: 0,
          },
        });
        await this._applyOperatorLimits(userId, freePlan.maxOperators);
      }
      return;
    }

    const now = new Date();
    candidates.sort((a, b) => {
      if (b.plan.level !== a.plan.level) return b.plan.level - a.plan.level;
      const aDaysLeft = a.periodEnd ? a.periodEnd.getTime() - now.getTime() : 0;
      const bDaysLeft = b.plan.level ? (b.periodEnd ? b.periodEnd.getTime() - now.getTime() : 0) : 0;
      if (bDaysLeft !== aDaysLeft) return bDaysLeft - aDaysLeft;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const next = candidates[0];
    let newPeriodEnd: Date | null;

    if (this._isFreePlan(next.plan.level)) {
      newPeriodEnd = null;
    } else if (next.status === SubscriptionBalanceStatus.PAUSED && next.pausedAt && next.periodEnd) {
      const remainingMs = next.periodEnd.getTime() - next.pausedAt.getTime();
      newPeriodEnd = new Date(now.getTime() + remainingMs);
      newPeriodEnd.setHours(0, 0, 0, 0);
    } else {
      newPeriodEnd = addDays(tomorrow(), next.daysTotal);
    }

    await this.prisma.db.userSubscriptionBalance.update({
      where: { id: next.id },
      data: {
        status: SubscriptionBalanceStatus.ACTIVE,
        position: 0,
        pausedAt: null,
        periodEnd: newPeriodEnd,
      },
    });

    const remaining = candidates.filter((candidate) => candidate.id !== next.id);
    for (let i = 0; i < remaining.length; i++) {
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 },
      });
    }

    await this._applyOperatorLimits(userId, next.plan.maxOperators);
  }

  async _applyOperatorLimits(userId: number, maxOperators: number) {
    const activeConnections = await this.prisma.db.userPostalConnection.findMany({
      where: { userId, status: PostalConnectionStatus.ACTIVE },
      orderBy: { connectedAt: 'asc' },
    });

    if (activeConnections.length > maxOperators) {
      const toBlock = activeConnections.slice(maxOperators);
      await this.prisma.db.userPostalConnection.updateMany({
        where: { id: { in: toBlock.map((connection) => connection.id) } },
        data: { status: PostalConnectionStatus.BLOCKED },
      });
    } else {
      await this.prisma.db.userPostalConnection.updateMany({
        where: { userId, status: PostalConnectionStatus.BLOCKED },
        data: { status: PostalConnectionStatus.ACTIVE },
      });
    }
  }

  private async _getMaxPosition(userId: number): Promise<number> {
    const result = await this.prisma.db.userSubscriptionBalance.aggregate({
      where: { userId, status: { not: SubscriptionBalanceStatus.EXPIRED } },
      _max: { position: true },
    });
    return result._max.position ?? 0;
  }

  async getActiveSubscriptionPlan(userId: number) {
    const active = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
      include: { plan: true },
    });
    if (active) return active.plan;

    return this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } });
  }

  async getCurrentPlanInfo(userId: number) {
    const active = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
      include: {
        plan: true,
      },
    });

    const planSource = active?.plan
      ?? await this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } });

    const currentPlan = planSource
      ? {
          name: planSource.name,
          level: planSource.level,
          hasAnalytics: planSource.hasAnalytics,
          hasTemplates: planSource.hasTemplates,
          hasRecipients: planSource.hasRecipients,
          maxOperators: planSource.maxOperators,
        }
      : null;

    let scheduledPlan: { name: string; activatesAt: Date } | null = null;
    if (active?.scheduledSwitchTo) {
      const switchTarget = await this.prisma.db.userSubscriptionBalance.findUnique({
        where: { id: active.scheduledSwitchTo },
        include: { plan: true },
      });
      if (switchTarget && active.scheduledSwitchAt) {
        scheduledPlan = {
          name: switchTarget.plan.name,
          activatesAt: active.scheduledSwitchAt,
        };
      }
    }

    return { currentPlan, scheduledPlan };
  }

  private _isFreePlan(level: number): boolean {
    return level === 0;
  }

  private _serializeBalance<T extends { plan: { level: number }; periodEnd: Date | null; autoRenew: boolean | null }>(
    balance: T,
  ): T {
    if (!this._isFreePlan(balance.plan.level)) {
      return balance;
    }

    return {
      ...balance,
      periodEnd: null,
      autoRenew: null,
    } as T;
  }
}
