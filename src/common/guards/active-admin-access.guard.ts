import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AdminJwtUser } from '../../types/admin-auth.types.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ActiveAdminAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AdminJwtUser | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException('Admin authentication required');
    }

    if (user.type !== 'access') {
      throw new ForbiddenException('Active admin access required');
    }

    const admin = await this.prisma.db.admin.findUnique({
      where: { id: user.id },
      select: { status: true },
    });

    if (!admin || admin.status !== 'ACTIVE') {
      throw new ForbiddenException('Active admin access required');
    }

    return true;
  }
}
