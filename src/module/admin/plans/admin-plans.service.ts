import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SubscriptionBalanceStatus } from '../../../../generated/prisma/enums.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  AdminGetPlansQueryDto,
  CreateAdminPlanDto,
  UpdateAdminPlanDto,
} from '../../../validation/subscription/subscription.schema.js';

@Injectable()
export class AdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: AdminGetPlansQueryDto) {
    const { page, limit, isPersonal, isPublic } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (isPersonal !== undefined) where['isPersonal'] = isPersonal;
    if (isPublic !== undefined) where['isPublic'] = isPublic;

    const [data, total] = await Promise.all([
      this.prisma.db.subscriptionPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { level: 'asc' },
        include: { targetUser: { select: { id: true, email: true } } },
      }),
      this.prisma.db.subscriptionPlan.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getById(id: number) {
    const plan = await this.prisma.db.subscriptionPlan.findUnique({
      where: { id },
      include: { targetUser: { select: { id: true, email: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreateAdminPlanDto) {
    if (dto.isPersonal && dto.targetUserId) {
      const user = await this.prisma.db.user.findUnique({ where: { id: dto.targetUserId } });
      if (!user) throw new NotFoundException('Target user not found');
    }

    return this.prisma.db.subscriptionPlan.create({
      data: {
        name: dto.name,
        level: dto.level,
        price: dto.price,
        priceYearly: dto.priceYearly,
        maxOperators: dto.maxOperators,
        hasAnalytics: dto.hasAnalytics,
        hasTemplates: dto.hasTemplates,
        hasRecipients: dto.hasRecipients,
        hasSupport: dto.hasSupport,
        autoRenewDefault: dto.autoRenewDefault,
        isPublic: dto.isPublic,
        isPersonal: dto.isPersonal,
        targetUserId: dto.targetUserId,
        isActive: dto.isActive,
      },
      include: { targetUser: { select: { id: true, email: true } } },
    });
  }

  async update(id: number, dto: UpdateAdminPlanDto) {
    await this.getById(id);

    return this.prisma.db.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.priceYearly !== undefined && { priceYearly: dto.priceYearly }),
        ...(dto.maxOperators !== undefined && { maxOperators: dto.maxOperators }),
        ...(dto.hasAnalytics !== undefined && { hasAnalytics: dto.hasAnalytics }),
        ...(dto.hasTemplates !== undefined && { hasTemplates: dto.hasTemplates }),
        ...(dto.hasRecipients !== undefined && { hasRecipients: dto.hasRecipients }),
        ...(dto.hasSupport !== undefined && { hasSupport: dto.hasSupport }),
        ...(dto.autoRenewDefault !== undefined && { autoRenewDefault: dto.autoRenewDefault }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.targetUserId !== undefined && { targetUserId: dto.targetUserId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { targetUser: { select: { id: true, email: true } } },
    });
  }

  async remove(id: number) {
    await this.getById(id);

    const activeBalances = await this.prisma.db.userSubscriptionBalance.count({
      where: {
        planId: id,
        status: { in: [SubscriptionBalanceStatus.ACTIVE, SubscriptionBalanceStatus.QUEUED, SubscriptionBalanceStatus.PAUSED] },
      },
    });

    if (activeBalances > 0) {
      throw new BadRequestException('Cannot delete a plan with active, queued, or paused subscriptions');
    }

    return this.prisma.db.subscriptionPlan.delete({ where: { id } });
  }
}
