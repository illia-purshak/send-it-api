import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BillingService } from '../user/billing/billing.service.js';
import { SubscriptionService } from '../user/subscription/subscription.service.js';
import {
  DiscountType,
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
  SubscriptionPeriodType,
  UserStatus,
} from '../../../generated/prisma/enums.js';
import { getSwitchCheckCronExpression } from '../../config/subscription.config.js';

const DAYS_MONTHLY = 30;
const DAYS_YEARLY = 365;
const SWITCH_CHECK_CRON = getSwitchCheckCronExpression();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processSubscriptionRenewals() {
    const now = new Date();
    const due = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        status: SubscriptionBalanceStatus.ACTIVE,
        autoRenew: true,
        periodEnd: { lte: now, not: null },
      },
      include: { plan: true },
    });

    for (const balance of due) {
      const daysTotal =
        balance.periodType === SubscriptionPeriodType.YEARLY ? DAYS_YEARLY : DAYS_MONTHLY;
      const newPeriodEnd = addDays(balance.periodEnd!, daysTotal);

      const amount = balance.customAmount
        ? Number(balance.customAmount)
        : balance.periodType === SubscriptionPeriodType.YEARLY && balance.plan.priceYearly
          ? Number(balance.plan.priceYearly)
          : Number(balance.plan.price);

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: balance.id },
        data: {
          periodEnd: newPeriodEnd,
          ...(balance.discountType === DiscountType.ONE_TIME
            ? { customAmount: null, discountType: null }
            : {}),
        },
      });

      if (amount > 0) {
        await this.billingService.createBillingRecord(
          balance.userId,
          balance.planId,
          balance.id,
          amount,
          balance.periodType,
          now,
          newPeriodEnd,
        );
      }

      this.logger.log(`Renewed balance ${balance.id} for user ${balance.userId}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireSubscriptions() {
    const now = new Date();
    const expired = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        status: SubscriptionBalanceStatus.ACTIVE,
        autoRenew: false,
        periodEnd: { lte: now, not: null },
      },
    });

    for (const balance of expired) {
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: balance.id },
        data: { status: SubscriptionBalanceStatus.EXPIRED },
      });

      await this.subscriptionService.activateNextInQueue(balance.userId);
      this.logger.log(`Expired balance ${balance.id} for user ${balance.userId}`);
    }
  }

  @Cron(SWITCH_CHECK_CRON)
  async activateScheduledSwitches() {
    const now = new Date();
    const pending = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        scheduledSwitchAt: { lte: now, not: null },
        status: SubscriptionBalanceStatus.ACTIVE,
      },
      include: { plan: true },
    });

    for (const activeBalance of pending) {
      if (!activeBalance.scheduledSwitchTo) continue;

      const target = await this.prisma.db.userSubscriptionBalance.findUnique({
        where: { id: activeBalance.scheduledSwitchTo },
        include: { plan: true },
      });
      if (!target) continue;

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: {
          status: SubscriptionBalanceStatus.PAUSED,
          pausedAt: now,
          scheduledSwitchTo: null,
          scheduledSwitchAt: null,
        },
      });

      let newPeriodEnd: Date | null;
      if (target.plan.level === 0) {
        newPeriodEnd = null;
      } else if (target.status === SubscriptionBalanceStatus.PAUSED && target.pausedAt && target.periodEnd) {
        const remainingMs = target.periodEnd.getTime() - target.pausedAt.getTime();
        newPeriodEnd = new Date(now.getTime() + remainingMs);
        newPeriodEnd.setHours(0, 0, 0, 0);
      } else {
        newPeriodEnd = addDays(now, target.daysTotal);
      }

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: target.id },
        data: {
          status: SubscriptionBalanceStatus.ACTIVE,
          pausedAt: null,
          position: 0,
          periodEnd: newPeriodEnd,
        },
      });

      await this.subscriptionService._applyOperatorLimits(activeBalance.userId, target.plan.maxOperators);

      this.logger.log(
        `Switched balance ${activeBalance.id} -> ${target.id} for user ${activeBalance.userId}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteScheduledAccounts() {
    const now = new Date();
    const deleted = await this.prisma.db.user.deleteMany({
      where: { status: UserStatus.DELETED, scheduledDeletionAt: { lte: now } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Hard-deleted ${deleted.count} scheduled account(s)`);
    }
  }

  @Cron('0 2 * * *')
  async cleanupReadNotifications() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await this.prisma.db.notification.deleteMany({
      where: { isRead: true, updatedAt: { lt: cutoff } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Cleaned up ${deleted.count} read notification(s) older than 30 days`);
    }
  }

  async deactivateExcessConnections(userId: number, maxOperators: number) {
    const connections = await this.prisma.db.userPostalConnection.findMany({
      where: { userId, status: PostalConnectionStatus.ACTIVE },
      orderBy: { connectedAt: 'asc' },
    });

    if (connections.length <= maxOperators) return;

    const toDeactivate = connections.slice(maxOperators);
    await this.prisma.db.userPostalConnection.updateMany({
      where: { id: { in: toDeactivate.map((connection) => connection.id) } },
      data: { status: PostalConnectionStatus.BLOCKED },
    });
  }

  async reactivateAllConnections(userId: number) {
    await this.prisma.db.userPostalConnection.updateMany({
      where: { userId, status: PostalConnectionStatus.BLOCKED },
      data: { status: PostalConnectionStatus.ACTIVE },
    });
  }
}
