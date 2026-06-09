import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { BillingStatus, SubscriptionPeriodType } from '../../../../generated/prisma/enums.js';
import { encryptValue } from '../../../utils/crypto.util.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';

type MockPaymentCardRow = {
  userId: number;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private formatMaskedCard(lastFour: string): string {
    return `**** **** **** ${lastFour}`;
  }

  private mapCardResponse(card: {
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
  }) {
    return {
      lastFour: card.lastFour,
      maskedNumber: this.formatMaskedCard(card.lastFour),
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
    };
  }

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
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getCard(userId: number) {
    const [card] = await this.prisma.db.$queryRawUnsafe<MockPaymentCardRow[]>(
      'SELECT "userId", "lastFour", "expiryMonth", "expiryYear" FROM "MockPaymentCard" WHERE "userId" = $1 LIMIT 1',
      userId,
    );
    if (!card) throw new NotFoundException('No saved card found');
    return this.mapCardResponse(card);
  }

  async saveCard(
    userId: number,
    cardNumber: string,
    lastFour: string,
    expiryMonth: number,
    expiryYear: number,
    cardholderName: string,
  ) {
    const [existing] = await this.prisma.db.$queryRawUnsafe<Pick<MockPaymentCardRow, 'userId'>[]>(
      'SELECT "userId" FROM "MockPaymentCard" WHERE "userId" = $1 LIMIT 1',
      userId,
    );
    if (existing) {
      throw new ConflictException('Card already exists - use PUT /billing/card to update');
    }

    const [card] = await this.prisma.db.$queryRawUnsafe<MockPaymentCardRow[]>(
      'INSERT INTO "MockPaymentCard" ("userId", "lastFour", "encryptedCardNumber", "encryptedCardholderName", "expiryMonth", "expiryYear", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING "userId", "lastFour", "expiryMonth", "expiryYear"',
      userId,
      lastFour,
      encryptValue(cardNumber),
      encryptValue(cardholderName),
      expiryMonth,
      expiryYear,
    );

    return this.mapCardResponse(card);
  }

  async updateCard(
    userId: number,
    cardNumber: string,
    lastFour: string,
    expiryMonth: number,
    expiryYear: number,
    cardholderName: string,
  ) {
    const [existing] = await this.prisma.db.$queryRawUnsafe<Pick<MockPaymentCardRow, 'userId'>[]>(
      'SELECT "userId" FROM "MockPaymentCard" WHERE "userId" = $1 LIMIT 1',
      userId,
    );
    if (!existing) throw new NotFoundException('No saved card found - use POST /billing/card first');

    const [card] = await this.prisma.db.$queryRawUnsafe<MockPaymentCardRow[]>(
      'UPDATE "MockPaymentCard" SET "lastFour" = $2, "encryptedCardNumber" = $3, "encryptedCardholderName" = $4, "expiryMonth" = $5, "expiryYear" = $6, "updatedAt" = NOW() WHERE "userId" = $1 RETURNING "userId", "lastFour", "expiryMonth", "expiryYear"',
      userId,
      lastFour,
      encryptValue(cardNumber),
      encryptValue(cardholderName),
      expiryMonth,
      expiryYear,
    );

    return this.mapCardResponse(card);
  }

  async removeCard(userId: number) {
    const [card] = await this.prisma.db.$queryRawUnsafe<Pick<MockPaymentCardRow, 'userId'>[]>(
      'SELECT "userId" FROM "MockPaymentCard" WHERE "userId" = $1 LIMIT 1',
      userId,
    );
    if (!card) throw new NotFoundException('No saved card found');
    await this.prisma.db.$executeRawUnsafe(
      'DELETE FROM "MockPaymentCard" WHERE "userId" = $1',
      userId,
    );
  }

  async createBillingRecord(
    userId: number,
    planId: number,
    balanceId: number,
    amount: number,
    periodType: SubscriptionPeriodType,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.db.billingHistory.create({
      data: {
        userId,
        planId,
        balanceId,
        amount,
        periodType,
        status: BillingStatus.PAID,
        periodStart,
        periodEnd,
        paidAt: new Date(),
      },
    });
  }
}
