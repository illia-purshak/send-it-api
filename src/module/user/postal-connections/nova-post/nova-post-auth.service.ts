import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { encryptTotp, decryptTotp } from '../../../../utils/crypto.util.js';
import {
  PostalConnectionStatus,
  type PostalService,
} from '../../../../../generated/prisma/client.js';
import { PostalConnectionsService } from '../postal-connections.service.js';

interface JwtCacheEntry {
  jwt: string;
  expiresAt: number;
}

@Injectable()
export class NovaPostAuthService {
  private readonly logger = new Logger(NovaPostAuthService.name);
  private readonly baseUrl: string;
  private readonly jwtCache = new Map<string, JwtCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly postalConnectionsService: PostalConnectionsService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('NOVA_POST_BASE_URL');
  }

  private getNovaPostService(): Promise<Pick<PostalService, 'id'>> {
    return this.prisma.db.postalService.upsert({
      where: { slug: 'nova-post' },
      create: {
        slug: 'nova-post',
        name: 'Нова пошта',
        isActive: true,
      },
      update: {
        isActive: true,
      },
      select: { id: true },
    });
  }

  async requestApiKey(phone: string): Promise<{ apiKey: string }> {
    const response = await fetch(`${this.baseUrl}/test-api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    if (response.status === 400) {
      const body = (await response.json()) as { message?: string };
      throw new BadRequestException(body.message ?? 'Invalid phone format');
    }
    if (response.status === 404) {
      throw new BadRequestException('Phone number not registered in Nova Post EBC');
    }
    if (response.status === 429) {
      throw new BadRequestException('Nova Post rate limit reached, please try again later');
    }
    if (!response.ok) {
      this.logger.error(`Nova Post /test-api-keys returned ${response.status}`);
      throw new InternalServerErrorException('Nova Post API error');
    }

    const body = (await response.json()) as { apiKey: string };
    return { apiKey: body.apiKey };
  }

  async connect(userId: number, apiKey: string): Promise<void> {
    const authResponse = await fetch(
      `${this.baseUrl}/clients/authorization?apiKey=${encodeURIComponent(apiKey)}`,
    );

    if (authResponse.status === 401 || authResponse.status === 403) {
      throw new BadRequestException('Invalid API key');
    }
    if (!authResponse.ok) {
      this.logger.error(`Nova Post /clients/authorization returned ${authResponse.status}`);
      throw new InternalServerErrorException('Nova Post API error');
    }

    const postalService = await this.getNovaPostService();

    const existing = await this.prisma.db.userPostalConnection.findUnique({
      where: { userId_postalServiceId: { userId, postalServiceId: postalService.id } },
      select: { id: true },
    });
    if (!existing) {
      await this.postalConnectionsService.checkOperatorLimit(userId);
    }

    await this.prisma.db.userPostalConnection.upsert({
      where: {
        userId_postalServiceId: { userId, postalServiceId: postalService.id },
      },
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
    });
  }

  async getJwt(userId: number, postalServiceId: number): Promise<string> {
    const cacheKey = `${userId}_${postalServiceId}`;
    const cached = this.jwtCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.jwt;

    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: {
        userId_postalServiceId: { userId, postalServiceId },
      },
    });
    if (!connection) {
      throw new NotFoundException(
        'Nova Post not connected — please connect first',
      );
    }

    const apiKey = decryptTotp(connection.apiKey);
    const authResponse = await fetch(
      `${this.baseUrl}/clients/authorization?apiKey=${encodeURIComponent(apiKey)}`,
    );

    if (authResponse.status === 401 || authResponse.status === 403) {
      await this.postalConnectionsService.markAsInvalid(userId, postalServiceId);
      throw new UnprocessableEntityException({
        code: 'CONNECTION_INVALID',
        message: 'Nova Post API key is invalid, please reconnect',
      });
    }
    if (!authResponse.ok) {
      this.logger.error(
        `Nova Post /clients/authorization returned ${authResponse.status}`,
      );
      throw new InternalServerErrorException('Nova Post API error');
    }

    const body = (await authResponse.json()) as { jwt: string };
    this.jwtCache.set(cacheKey, {
      jwt: body.jwt,
      expiresAt: Date.now() + 55 * 60 * 1000,
    });
    return body.jwt;
  }

  invalidateJwt(userId: number, postalServiceId: number): void {
    this.jwtCache.delete(`${userId}_${postalServiceId}`);
  }
}
