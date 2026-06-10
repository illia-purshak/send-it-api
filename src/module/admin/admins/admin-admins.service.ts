import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { generateToken, hashSha256 } from '../../../utils/crypto.util.js';
import { MailService } from '../../mail/mail.service.js';
import { buildPaginatedResponse } from '../../../utils/pagination.util.js';
import type {
  AdminInviteAdminDto,
  AdminListAdminsQueryDto,
  AdminUpdateAdminDto,
} from '../../../validation/admin/admin-admins.schema.js';
import type { AdminJwtUser } from '../../../types/admin-auth.types.js';

const INVITE_TTL_DAYS = 7;

@Injectable()
export class AdminAdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getAll(query: AdminListAdminsQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status;
    if (query.search) {
      where['OR'] = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.db.admin.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isSuperAdmin: true,
          status: true,
          createdAt: true,
          invitedBy: { select: { id: true, email: true } },
        },
      }),
      this.prisma.db.admin.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query.page, query.limit);
  }

  async getById(id: number) {
    const admin = await this.prisma.db.admin.findUnique({
      where: { id },
      include: { invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async inviteAdmin(actor: AdminJwtUser, dto: AdminInviteAdminDto) {
    const existing = await this.prisma.db.admin.findFirst({
      where: { email: dto.email },
    });

    if (existing && existing.status !== 'DELETED') {
      throw new ConflictException('An admin with this email already exists');
    }

    const rawToken = generateToken();
    const tokenHash = hashSha256(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    let adminId: number;

    if (existing) {
      // Reuse the deleted record — revive it as a fresh PENDING invite
      await this.prisma.db.admin.update({
        where: { id: existing.id },
        data: { status: 'PENDING', isSuperAdmin: false, invitedById: actor.id },
      });
      // Invalidate any leftover invites from before deletion
      await this.prisma.db.adminInvite.updateMany({
        where: { adminId: existing.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      adminId = existing.id;
    } else {
      const newAdmin = await this.prisma.db.admin.create({
        data: { email: dto.email, isSuperAdmin: false, status: 'PENDING', invitedById: actor.id },
      });
      adminId = newAdmin.id;
    }

    await this.prisma.db.adminInvite.create({
      data: { adminId, token: tokenHash, invitedById: actor.id, expiresAt },
    });

    void this.mailService.sendAdminInvite(dto.email, rawToken);
    return { adminId, email: dto.email, inviteToken: rawToken, expiresAt };
  }

  async resendInvite(actor: AdminJwtUser, id: number) {
    const admin = await this.prisma.db.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.status !== 'PENDING') {
      throw new BadRequestException('Can only resend invite for admins in PENDING status');
    }

    await this.prisma.db.adminInvite.updateMany({
      where: { adminId: id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateToken();
    const tokenHash = hashSha256(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.db.adminInvite.create({
      data: { adminId: id, token: tokenHash, invitedById: actor.id, expiresAt },
    });

    void this.mailService.sendAdminInvite(admin.email, rawToken);
    return { inviteToken: rawToken, expiresAt };
  }

  async updateStatus(id: number, dto: AdminUpdateAdminDto) {
    const admin = await this.prisma.db.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.db.admin.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, email: true, status: true, updatedAt: true },
    });
  }

  async deleteAdmin(actor: AdminJwtUser, id: number): Promise<void> {
    if (actor.id === id) throw new ForbiddenException('Cannot delete your own account');

    const target = await this.prisma.db.admin.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Admin not found');
    if (target.isSuperAdmin) {
      throw new ForbiddenException('Cannot delete a super admin');
    }

    await this.prisma.db.admin.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    await this.prisma.db.adminRefreshToken.updateMany({
      where: { adminId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
