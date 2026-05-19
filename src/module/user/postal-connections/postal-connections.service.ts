import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  NotificationType,
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
} from '../../../../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class PostalConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkOperatorLimit(userId: number) {
    const active = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
      include: { plan: true },
    });

    const plan = active?.plan
      ?? await this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } });

    const maxOperators = plan?.maxOperators ?? 1;

    const activeCount = await this.prisma.db.userPostalConnection.count({
      where: { userId, status: PostalConnectionStatus.ACTIVE },
    });

    if (activeCount >= maxOperators) {
      throw new ForbiddenException({
        code: 'OPERATOR_LIMIT_REACHED',
        message: 'Upgrade your plan to connect more operators',
        maxOperators,
        currentPlan: plan?.level ?? 0,
      });
    }

    return { canConnect: true };
  }

  async getConnectionsForUser(userId: number) {
    const connections = await this.prisma.db.userPostalConnection.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
      select: {
        id: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
        postalService: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
    return { connections };
  }

  async markAsInvalid(userId: number, postalServiceId: number) {
    await this.prisma.db.userPostalConnection.updateMany({
      where: { userId, postalServiceId },
      data: { status: PostalConnectionStatus.INVALID },
    });
    await this.notifications.create(
      userId,
      NotificationType.POSTAL_CONNECTION,
      'Postal connection became invalid',
      'One of your postal operator connections is no longer valid. Please reconnect it to continue.',
    );
  }

  async blockConnections(userId: number, keepIds: number[]) {
    await this.prisma.db.userPostalConnection.updateMany({
      where: { userId, status: PostalConnectionStatus.ACTIVE, id: { notIn: keepIds } },
      data: { status: PostalConnectionStatus.BLOCKED },
    });
  }

  async unblockConnections(userId: number) {
    await this.prisma.db.userPostalConnection.updateMany({
      where: { userId, status: PostalConnectionStatus.BLOCKED },
      data: { status: PostalConnectionStatus.ACTIVE },
    });
  }
}
