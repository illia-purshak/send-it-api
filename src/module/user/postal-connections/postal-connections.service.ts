import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PostalConnectionStatus } from '../../../../generated/prisma/enums.js';

@Injectable()
export class PostalConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkOperatorLimit(userId: number) {
    const subscription = await this.prisma.db.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const activeCount = await this.prisma.db.userPostalConnection.count({
      where: { userId, status: PostalConnectionStatus.ACTIVE },
    });

    if (activeCount >= subscription.plan.maxOperators) {
      throw new ForbiddenException({
        code: 'OPERATOR_LIMIT_REACHED',
        message: 'Upgrade your plan to connect more operators',
        maxOperators: subscription.plan.maxOperators,
        currentPlan: subscription.plan.level,
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
