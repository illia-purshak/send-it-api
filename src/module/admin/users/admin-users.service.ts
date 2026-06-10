import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiscountType, SubscriptionBalanceStatus } from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  AdminListUsersQueryDto,
  AdminTestListUsersQueryDto,
  AdminUpdateUserDto,
} from '../../../validation/admin/admin-users.schema.js';
import type {
  AdminUpdateBalanceDto,
  AdminGetUserSubscriptionHistoryQueryDto,
} from '../../../validation/subscription/subscription.schema.js';
import { AdminSubscriptionService } from '../subscription/admin-subscription.service.js';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSubscriptionService: AdminSubscriptionService,
  ) {}

  async getAll(query: AdminListUsersQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.UserWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { profile: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.plan !== undefined) {
      where.subscriptionBalances = {
        some: {
          status: SubscriptionBalanceStatus.ACTIVE,
          plan: { level: query.plan },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.db.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          profile: { select: { companyName: true } },
          subscriptionBalances: {
            where: { status: SubscriptionBalanceStatus.ACTIVE },
            select: { plan: { select: { level: true, name: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.db.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getAllForTest(query: AdminTestListUsersQueryDto) {
    const [items, total] = await Promise.all([
      this.prisma.db.user.findMany({
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          profileCompleted: true,
          createdAt: true,
          updatedAt: true,
          avatarUrl: true,
          dateFormat: true,
          language: true,
          notifAccount: true,
          notifEmail: true,
          notifPostalConnection: true,
          notifSubscription: true,
          notifSystem: true,
          scheduledDeletionAt: true,
          timezone: true,
        },
      }),
      this.prisma.db.user.count(),
    ]);

    return buildPaginatedResponse(items, total, 1, query.pageSize);
  }

  async getById(id: number) {
    const user = await this.prisma.db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscriptionBalances: {
          where: { status: { not: SubscriptionBalanceStatus.EXPIRED } },
          include: { plan: true },
          orderBy: { position: 'asc' },
        },
        postalConnections: { include: { postalService: true } },
        _count: { select: { supportTickets: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateStatus(id: number, dto: AdminUpdateUserDto) {
    const user = await this.prisma.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.db.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, email: true, status: true, updatedAt: true },
    });
  }

  async getUserSubscription(userId: number) {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.db.userSubscriptionBalance.findMany({
      where: { userId, status: { not: SubscriptionBalanceStatus.EXPIRED } },
      include: { plan: true },
      orderBy: { position: 'asc' },
    });
  }

  async updateUserSubscription(userId: number, balanceId: number, dto: AdminUpdateBalanceDto) {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const balance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { id: balanceId, userId },
    });
    if (!balance) throw new NotFoundException('Subscription balance not found for this user');

    switch (dto.action) {
      case 'changePlan':
        return this.adminSubscriptionService.changePlan(balanceId, dto.planId!);
      case 'extend':
        return this.adminSubscriptionService.extendBalance(balanceId, dto.days!);
      case 'cancel':
        return this.adminSubscriptionService.cancelBalance(balanceId);
      case 'setDiscount':
        return this.adminSubscriptionService.setDiscount(
          balanceId,
          dto.amount!,
          dto.discountType as DiscountType,
        );
      case 'suspend':
        return this.adminSubscriptionService.suspendBalance(balanceId);
      case 'reactivate':
        return this.adminSubscriptionService.reactivateBalance(balanceId);
    }
  }

  async getUserSubscriptionHistory(
    userId: number,
    query: AdminGetUserSubscriptionHistoryQueryDto,
  ) {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.db.billingHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.prisma.db.billingHistory.count({ where: { userId } }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async removePostalConnection(userId: number, connectionId: number) {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const connection = await this.prisma.db.userPostalConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) throw new NotFoundException('Postal connection not found for this user');

    await this.prisma.db.userPostalConnection.delete({ where: { id: connectionId } });
    return { success: true };
  }
}
