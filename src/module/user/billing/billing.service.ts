import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { BillingStatus } from '../../../../generated/prisma/enums.js';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.db.billingHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { name: true, level: true } } },
      }),
      this.prisma.db.billingHistory.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async saveCard(
    userId: number,
    lastFour: string,
    expiryMonth: number,
    expiryYear: number,
  ) {
    return this.prisma.db.mockPaymentCard.upsert({
      where: { userId },
      create: { userId, lastFour, expiryMonth, expiryYear },
      update: { lastFour, expiryMonth, expiryYear },
    });
  }

  async getCard(userId: number, cardId: number) {
    const card = await this.prisma.db.mockPaymentCard.findUnique({
      where: { id: cardId },
    });

    if (!card || card.userId !== userId) {
      throw new NotFoundException('Card not found');
    }

    return {
      id: card.id,
      lastFour: card.lastFour,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  async removeCard(userId: number) {
    const card = await this.prisma.db.mockPaymentCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('No saved card found');
    await this.prisma.db.mockPaymentCard.delete({ where: { userId } });
  }

  async createBillingRecord(
    userId: number,
    planId: number,
    amount: number,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.db.billingHistory.create({
      data: {
        userId,
        planId,
        amount,
        status: BillingStatus.PAID,
        periodStart,
        periodEnd,
        paidAt: new Date(),
      },
    });
  }
}
