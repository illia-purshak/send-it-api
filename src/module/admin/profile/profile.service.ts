import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  UpdateAdminProfileDto,
  UpdateAdminSettingsDto,
} from '../../../validation/admin-profile/admin-profile.schema.js';

@Injectable()
export class AdminProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(adminId: number) {
    const admin = await this.prisma.db.admin.findUnique({
      where: { id: adminId },
      include: {
        invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        twoFactorAuth: { select: { isEnabled: true } },
      },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isSuperAdmin: admin.isSuperAdmin,
      status: admin.status,
      avatarUrl: admin.avatarUrl,
      twoFactorEnabled: admin.twoFactorAuth?.isEnabled ?? false,
      invitedBy: admin.invitedBy,
      settings: {
        language: admin.language,
        timezone: admin.timezone,
        dateFormat: admin.dateFormat,
      },
    };
  }

  async updateProfile(adminId: number, dto: UpdateAdminProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data['firstName'] = dto.firstName;
    if (dto.lastName !== undefined) data['lastName'] = dto.lastName;
    if (dto.avatarUrl !== undefined) data['avatarUrl'] = dto.avatarUrl;

    await this.prisma.db.admin.update({ where: { id: adminId }, data });
    return this.getProfile(adminId);
  }

  async updateSettings(adminId: number, dto: UpdateAdminSettingsDto) {
    const data: Record<string, unknown> = {};
    if (dto.language !== undefined) data['language'] = dto.language;
    if (dto.timezone !== undefined) data['timezone'] = dto.timezone;
    if (dto.dateFormat !== undefined) data['dateFormat'] = dto.dateFormat;

    const admin = await this.prisma.db.admin.update({ where: { id: adminId }, data });
    return {
      language: admin.language,
      timezone: admin.timezone,
      dateFormat: admin.dateFormat,
    };
  }
}
