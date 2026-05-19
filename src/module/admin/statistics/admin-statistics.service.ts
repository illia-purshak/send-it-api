import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
  TicketStatus,
} from '../../../../generated/prisma/enums.js';

interface PostalOperatorConfig {
  slug: string;
  code: 'nova_poshta' | 'ukrposhta' | 'meest';
  displayName: 'Nova Poshta' | 'Ukrposhta' | 'Meest';
}

interface AdminStatisticsSummary {
  totalUsers: number;
  activePaidSubscriptions: number;
  totalConnectedPostalOperators: number;
  openSupportTickets: number;
}

interface AdminStatisticsPostalOperator {
  id: number | null;
  code: PostalOperatorConfig['code'];
  displayName: PostalOperatorConfig['displayName'];
  connectedUsers: number;
  connectedUsersPercent: number;
  responseTimeMs: null;
  status: null;
}

export interface AdminStatisticsResponse {
  summary: AdminStatisticsSummary;
  postalOperators: AdminStatisticsPostalOperator[];
}

const POSTAL_OPERATORS: PostalOperatorConfig[] = [
  { slug: 'nova-poshta', code: 'nova_poshta', displayName: 'Nova Poshta' },
  { slug: 'ukrposhta', code: 'ukrposhta', displayName: 'Ukrposhta' },
  { slug: 'meest', code: 'meest', displayName: 'Meest' },
];

@Injectable()
export class AdminStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(): Promise<AdminStatisticsResponse> {
    const [totalUsers, activePaidSubscriptions, totalConnectedPostalOperators, openSupportTickets, services] =
      await Promise.all([
        this.prisma.db.user.count(),
        this.prisma.db.user.count({
          where: {
            subscriptionBalances: {
              some: {
                status: SubscriptionBalanceStatus.ACTIVE,
                plan: { level: { gt: 0 } },
              },
            },
          },
        }),
        this.prisma.db.userPostalConnection.count({
          where: { status: PostalConnectionStatus.ACTIVE },
        }),
        this.prisma.db.supportTicket.count({
          where: { status: { in: [TicketStatus.WAITING, TicketStatus.IN_PROGRESS] } },
        }),
        this.prisma.db.postalService.findMany({
          where: { slug: { in: POSTAL_OPERATORS.map((operator) => operator.slug) } },
          select: { id: true, slug: true },
        }),
      ]);

    const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
    const counts = await Promise.all(
      POSTAL_OPERATORS.map(async (operator) => {
        const service = serviceBySlug.get(operator.slug);
        if (!service) {
          return { slug: operator.slug, connectedUsers: 0 };
        }

        const connectedUsers = await this.prisma.db.user.count({
          where: {
            postalConnections: {
              some: {
                postalServiceId: service.id,
                status: PostalConnectionStatus.ACTIVE,
              },
            },
          },
        });

        return { slug: operator.slug, connectedUsers };
      }),
    );

    const countsBySlug = new Map(counts.map((item) => [item.slug, item.connectedUsers]));

    return {
      summary: {
        totalUsers,
        activePaidSubscriptions,
        totalConnectedPostalOperators,
        openSupportTickets,
      },
      postalOperators: POSTAL_OPERATORS.map((operator) => {
        const service = serviceBySlug.get(operator.slug);
        const connectedUsers = countsBySlug.get(operator.slug) ?? 0;

        return {
          id: service?.id ?? null,
          code: operator.code,
          displayName: operator.displayName,
          connectedUsers,
          connectedUsersPercent: this.toPercent(connectedUsers, totalUsers),
          responseTimeMs: null,
          status: null,
        };
      }),
    };
  }

  private toPercent(count: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Math.round((count / total) * 1000) / 10;
  }
}
