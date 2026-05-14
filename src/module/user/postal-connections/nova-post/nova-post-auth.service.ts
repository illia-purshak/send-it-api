import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { encryptTotp, decryptTotp } from '../../../../utils/crypto.util.js';
import {
  PostalConnectionStatus,
  type PostalService,
} from '../../../../../generated/prisma/client.js';

interface JwtCacheEntry {
  jwt: string;
  expiresAt: number;
}

@Injectable()
export class NovaPostAuthService {
  private readonly logger = new Logger(NovaPostAuthService.name);
  private readonly baseUrl: string;
  private readonly jwtCache = new Map<number, JwtCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('NOVA_POST_BASE_URL');
  }

  private getNovaPostService(): Promise<Pick<PostalService, 'id'>> {
    return this.prisma.db.postalService.upsert({
      where: { slug: 'nova-post' },
      create: {
        slug: 'nova-post',
        name: 'Nova Post',
        isActive: true,
      },
      update: {
        name: 'Nova Post',
        isActive: true,
      },
      select: { id: true },
    });
  }

  async connectNovaPost(userId: number, phone: string): Promise<string> {
    const postalService = await this.getNovaPostService();

    const response = await fetch(`${this.baseUrl}/test-api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    if (response.status === 429) {
      const existing = await this.prisma.db.userPostalConnection.findUnique({
        where: {
          userId_postalServiceId: { userId, postalServiceId: postalService.id },
        },
      });
      if (!existing) {
        throw new BadRequestException(
          'Nova Post rate limit reached and no existing key on file',
        );
      }
    } else if (response.status === 400) {
      const body = (await response.json()) as { message?: string };
      throw new BadRequestException(body.message ?? 'Invalid phone format');
    } else if (response.status === 404) {
      throw new BadRequestException(
        'Phone number not registered in Nova Post EBC',
      );
    } else if (!response.ok) {
      this.logger.error(`Nova Post /test-api-keys returned ${response.status}`);
      throw new InternalServerErrorException('Nova Post API error');
    } else {
      const body = (await response.json()) as { apiKey: string };
      await this.prisma.db.userPostalConnection.upsert({
        where: {
          userId_postalServiceId: { userId, postalServiceId: postalService.id },
        },
        create: {
          userId,
          postalServiceId: postalService.id,
          apiKey: encryptTotp(body.apiKey),
          status: PostalConnectionStatus.ACTIVE,
        },
        update: {
          apiKey: encryptTotp(body.apiKey),
          status: PostalConnectionStatus.ACTIVE,
        },
      });
    }

    return this.getJwt(userId);
  }

  async getJwt(userId: number): Promise<string> {
    const cached = this.jwtCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.jwt;

    const postalService = await this.getNovaPostService();

    const connection = await this.prisma.db.userPostalConnection.findUnique({
      where: {
        userId_postalServiceId: { userId, postalServiceId: postalService.id },
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

    if (authResponse.status === 401) {
      throw new UnauthorizedException(
        'Nova Post API key is invalid, please reconnect',
      );
    }
    if (!authResponse.ok) {
      this.logger.error(
        `Nova Post /clients/authorization returned ${authResponse.status}`,
      );
      throw new InternalServerErrorException('Nova Post API error');
    }

    const body = (await authResponse.json()) as { jwt: string };
    this.jwtCache.set(userId, {
      jwt: body.jwt,
      expiresAt: Date.now() + 55 * 60 * 1000,
    });
    return body.jwt;
  }

  invalidateJwt(userId: number): void {
    this.jwtCache.delete(userId);
  }
}
