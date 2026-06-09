import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationType } from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  BulkDeleteNotificationsQueryDto,
  ListNotificationsQueryDto,
} from '../../../validation/notifications/notification.schema.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, type: NotificationType, title: string, body: string): Promise<void> {
    try {
      const canCreate = await this.canCreateInAppNotification(userId, type);
      if (!canCreate) return;

      await this.prisma.db.notification.create({ data: { userId, type, title, body } });
    } catch (err) {
      this.logger.error('Failed to create notification', err);
    }
  }

  async getNotifications(userId: number, query: ListNotificationsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where = {
      userId,
      ...(query.tab === 'unread' ? { isRead: false } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.notification.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.db.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.db.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: number, id: number) {
    const notification = await this.prisma.db.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async deleteOne(userId: number, id: number): Promise<void> {
    const notification = await this.prisma.db.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.db.notification.delete({ where: { id } });
  }

  async deleteBulk(userId: number, query: BulkDeleteNotificationsQueryDto): Promise<void> {
    const where = {
      userId,
      ...(query.filter === 'read' ? { isRead: true } : {}),
    };
    await this.prisma.db.notification.deleteMany({ where });
  }

  private async canCreateInAppNotification(userId: number, type: NotificationType) {
    if (type === NotificationType.ACCOUNT) return true;

    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        notifSubscription: true,
        notifPostalConnection: true,
        notifSystem: true,
      },
    });
    if (!user) return false;

    switch (type) {
      case NotificationType.SUBSCRIPTION:
        return user.notifSubscription;
      case NotificationType.POSTAL_CONNECTION:
        return user.notifPostalConnection;
      case NotificationType.SYSTEM:
      case NotificationType.SHIPMENT_STATUS:
        return user.notifSystem;
      default:
        return true;
    }
  }
}
