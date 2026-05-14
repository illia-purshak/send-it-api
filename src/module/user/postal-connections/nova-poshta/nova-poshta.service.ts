import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PostalConnectionsService } from '../postal-connections.service.js';
import { encryptTotp } from '../../../../utils/crypto.util.js';
import { PostalConnectionStatus } from '../../../../../generated/prisma/enums.js';

@Injectable()
export class NovaPoshtaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postalConnectionsService: PostalConnectionsService,
  ) {}

  private async getServiceId(): Promise<number> {
    const svc = await this.prisma.db.postalService.findUniqueOrThrow({
      where: { slug: 'nova-poshta' },
      select: { id: true },
    });
    return svc.id;
  }

  async connect(userId: number, apiKey: string): Promise<void> {
    const postalServiceId = await this.getServiceId();
    const existing = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONNECTION_ALREADY_EXISTS',
        message: 'Use PUT to update an existing connection',
      });
    }
    await this.postalConnectionsService.checkOperatorLimit(userId);
    await this.prisma.db.userPostalConnection.create({
      data: {
        userId,
        postalServiceId,
        apiKey: encryptTotp(apiKey),
        status: PostalConnectionStatus.ACTIVE,
      },
    });
  }

  async updateKey(userId: number, apiKey: string): Promise<void> {
    const postalServiceId = await this.getServiceId();
    const existing = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId } },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No connection found. Use POST to connect.',
      });
    }
    await this.prisma.db.userPostalConnection.update({
      where: { userId_postalServiceId: { userId, postalServiceId } },
      data: { apiKey: encryptTotp(apiKey), status: PostalConnectionStatus.ACTIVE },
    });
  }

  async removeConnection(userId: number): Promise<void> {
    const postalServiceId = await this.getServiceId();
    const existing = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId } },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'CONNECTION_NOT_FOUND',
        message: 'No Nova Poshta connection found.',
      });
    }
    await this.prisma.db.userPostalConnection.delete({
      where: { userId_postalServiceId: { userId, postalServiceId } },
    });
  }
}
