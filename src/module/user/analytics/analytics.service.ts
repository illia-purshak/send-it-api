import { Injectable } from '@nestjs/common';
import { BillingStatus, ShipmentStatus, SubscriptionBalanceStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      ukrposhtaAll,
      meestAll,
      ukrposhtaTrend,
      meestTrend,
      connections,
      templatesCount,
      draftsCount,
      activeBalance,
      billingHistory,
    ] = await Promise.all([
      this.prisma.db.ukrposhtaShipment.findMany({
        where: { userId },
        select: { normalizedStatus: true },
      }),
      this.prisma.db.meestShipment.findMany({
        where: { userId },
        select: { normalizedStatus: true },
      }),
      this.prisma.db.ukrposhtaShipment.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.db.meestShipment.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.db.userPostalConnection.findMany({
        where: { userId },
        include: { postalService: { select: { slug: true, name: true, logoUrl: true } } },
      }),
      this.prisma.db.shipmentTemplate.count({ where: { userId } }),
      this.prisma.db.shipmentDraft.count({ where: { userId } }),
      this.prisma.db.userSubscriptionBalance.findFirst({
        where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
        include: { plan: { select: { name: true, level: true } } },
      }),
      this.prisma.db.billingHistory.findMany({
        where: { userId },
        select: { amount: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // ── Shipment aggregation ──────────────────────────────────────────────────

    const allShipments = [...ukrposhtaAll, ...meestAll];
    const total = allShipments.length;

    const byStatus = allShipments.reduce<Record<string, number>>((acc, s) => {
      acc[s.normalizedStatus] = (acc[s.normalizedStatus] ?? 0) + 1;
      return acc;
    }, {});

    const deliveredCount = byStatus[ShipmentStatus.DELIVERED] ?? 0;
    const deliverySuccessRate = total > 0 ? Math.round((deliveredCount / total) * 100) / 100 : 0;

    // ── 30-day trend ─────────────────────────────────────────────────────────

    const allTrendShipments = [...ukrposhtaTrend, ...meestTrend];
    const trendMap: Record<string, number> = {};
    for (const s of allTrendShipments) {
      const date = s.createdAt.toISOString().split('T')[0];
      trendMap[date] = (trendMap[date] ?? 0) + 1;
    }

    const trend: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      trend.push({ date, count: trendMap[date] ?? 0 });
    }

    // ── Billing aggregation ───────────────────────────────────────────────────

    const paidBilling = billingHistory.filter((b) => b.status === BillingStatus.PAID);

    const totalSpent = Math.round(
      paidBilling.reduce((sum, b) => sum + Number(b.amount), 0) * 100,
    ) / 100;

    const monthlySpendMap: Record<string, number> = {};
    for (const b of paidBilling) {
      const month = b.createdAt.toISOString().slice(0, 7);
      monthlySpendMap[month] = (monthlySpendMap[month] ?? 0) + Number(b.amount);
    }

    const monthlySpend: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      monthlySpend.push({ month, amount: Math.round((monthlySpendMap[month] ?? 0) * 100) / 100 });
    }

    const currentPlan = activeBalance
      ? { name: activeBalance.plan.name, level: activeBalance.plan.level, periodEnd: activeBalance.periodEnd }
      : null;

    return {
      shipments: {
        total,
        byOperator: {
          ukrposhta: ukrposhtaAll.length,
          meest: meestAll.length,
          nova_post: 0,
        },
        byStatus,
        deliverySuccessRate,
        trend,
      },
      account: {
        templatesCount,
        draftsCount,
        connections: connections.map((c) => ({
          slug: c.postalService.slug,
          name: c.postalService.name,
          logoUrl: c.postalService.logoUrl ?? null,
          status: c.status,
        })),
      },
      billing: {
        currentPlan,
        totalSpent,
        monthlySpend,
      },
    };
  }
}
