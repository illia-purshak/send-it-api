import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type {
  AdminJwtPayload,
  AdminJwtUser,
  AdminSetupRequiredJwtPayload,
} from '../../types/admin-auth.types.js';

type AdminTokenPayload = AdminJwtPayload | AdminSetupRequiredJwtPayload;

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    const token = authHeader.slice(7);
    let payload: AdminTokenPayload;

    try {
      payload = this.jwtService.verify<AdminTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.entityType !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.type !== 'access' && payload.type !== 'setup_required') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user: AdminJwtUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
    };
    request.user = user;
    return true;
  }
}
