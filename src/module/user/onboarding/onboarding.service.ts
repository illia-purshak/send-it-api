import { Injectable } from '@nestjs/common';
import { PostalConnectionStatus } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getChecklist(userId: number) {
    const [user, operatorCount, draftCount] = await Promise.all([
      this.prisma.db.user.findUnique({
        where: { id: userId },
        select: { profileCompleted: true },
      }),
      this.prisma.db.userPostalConnection.count({
        where: { userId, status: PostalConnectionStatus.ACTIVE },
      }),
      this.prisma.db.shipmentDraft.count({ where: { userId } }),
    ]);

    return {
      profileCompleted: user?.profileCompleted ?? false,
      operatorConnected: operatorCount > 0,
      firstShipmentCreated: draftCount > 0,
    };
  }
}
