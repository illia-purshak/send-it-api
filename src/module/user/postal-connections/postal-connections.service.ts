import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  NotificationType,
  PostalConnectionStatus,
  SubscriptionBalanceStatus,
} from '../../../../generated/prisma/enums.js';
import { encryptTotp } from '../../../utils/crypto.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const CONNECTION_SELECT = {
  id: true,
  status: true,
  connectedAt: true,
  updatedAt: true,
  postalService: { select: { id: true, name: true, slug: true, logoUrl: true } },
} as const;

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

    const plan =
      active?.plan ??
      (await this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } }));

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
      select: CONNECTION_SELECT,
    });
    return { connections };
  }

  async getConnectionById(userId: number, connectionId: number) {
    const connection = await this.prisma.db.userPostalConnection.findFirst({
      where: { id: connectionId, userId },
      select: CONNECTION_SELECT,
    });
    if (!connection) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'Postal connection not found.',
      });
    }
    return connection;
  }

  async connectGeneric(userId: number, operatorSlug: string, apiKey: string) {
    const postalService = await this.prisma.db.postalService.findUnique({
      where: { slug: operatorSlug },
      select: { id: true },
    });
    if (!postalService) {
      throw new NotFoundException({
        code: 'OPERATOR_NOT_FOUND',
        message: `Postal operator '${operatorSlug}' is not available.`,
      });
    }

    const existing = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId: postalService.id } },
    });

    if (!existing) {
      await this.checkOperatorLimit(userId);
    }

    return this.prisma.db.userPostalConnection.upsert({
      where: { userId_postalServiceId: { userId, postalServiceId: postalService.id } },
      create: {
        userId,
        postalServiceId: postalService.id,
        apiKey: encryptTotp(apiKey),
        status: PostalConnectionStatus.ACTIVE,
      },
      update: {
        apiKey: encryptTotp(apiKey),
        status: PostalConnectionStatus.ACTIVE,
      },
      select: CONNECTION_SELECT,
    });
  }

  async updateConnectionKey(userId: number, connectionId: number, apiKey: string) {
    await this.getConnectionById(userId, connectionId);
    await this.prisma.db.userPostalConnection.update({
      where: { id: connectionId },
      data: { apiKey: encryptTotp(apiKey), status: PostalConnectionStatus.ACTIVE },
    });
  }

  async deleteConnection(userId: number, connectionId: number) {
    await this.getConnectionById(userId, connectionId);
    await this.prisma.db.userPostalConnection.delete({ where: { id: connectionId } });
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
