import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BillingService } from '../user/billing/billing.service.js';
import {
  PostalConnectionStatus,
  SubscriptionStatus,
  DiscountType,
} from '../../../generated/prisma/enums.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processSubscriptionRenewals() {
    const now = new Date();
    const due = await this.prisma.db.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true },
    });

    for (const sub of due) {
      const periodStart = now;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const amount = sub.customAmount
        ? Number(sub.customAmount)
        : Number(sub.plan.price);

      await this.prisma.db.userSubscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          // Reset one-time discounts after use
          ...(sub.discountType === DiscountType.ONE_TIME
            ? { customAmount: null, discountType: null }
            : {}),
        },
      });

      if (amount > 0) {
        await this.billingService.createBillingRecord(
          sub.userId,
          sub.planId,
          amount,
          periodStart,
          periodEnd,
        );
      }

      this.logger.log(`Renewed subscription ${sub.id} for user ${sub.userId}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async activatePendingPlans() {
    const now = new Date();
    const pending = await this.prisma.db.userSubscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.PENDING_UPGRADE, SubscriptionStatus.PENDING_DOWNGRADE],
        },
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true, nextPlan: true },
    });

    for (const sub of pending) {
      if (!sub.nextPlanId || !sub.nextPlan) continue;

      const periodStart = now;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await this.prisma.db.userSubscription.update({
        where: { id: sub.id },
        data: {
          planId: sub.nextPlanId,
          nextPlanId: null,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      const amount = Number(sub.nextPlan.price);
      if (amount > 0) {
        await this.billingService.createBillingRecord(
          sub.userId,
          sub.nextPlanId,
          amount,
          periodStart,
          periodEnd,
        );
      }

      if (sub.status === SubscriptionStatus.PENDING_DOWNGRADE) {
        await this.deactivateExcessConnections(sub.userId, sub.nextPlan.maxOperators);
      } else {
        await this.reactivateAllConnections(sub.userId);
      }

      this.logger.log(
        `Activated pending plan ${sub.nextPlan.level} for user ${sub.userId}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireCancelledSubscriptions() {
    const now = new Date();
    const cancelled = await this.prisma.db.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.CANCELLED,
        currentPeriodEnd: { lte: now },
      },
    });

    const freePlan = await this.prisma.db.subscriptionPlan.findUnique({
      where: { level: 'FREE' },
    });
    if (!freePlan) {
      this.logger.error('FREE plan not found — cannot expire cancelled subscriptions');
      return;
    }

    for (const sub of cancelled) {
      await this.prisma.db.userSubscription.update({
        where: { id: sub.id },
        data: {
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          nextPlanId: null,
          cancelledAt: null,
          customAmount: null,
          discountType: null,
        },
      });

      await this.deactivateExcessConnections(sub.userId, freePlan.maxOperators);
      this.logger.log(`Expired subscription for user ${sub.userId} → FREE`);
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
      where: { id: { in: toDeactivate.map((c) => c.id) } },
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
