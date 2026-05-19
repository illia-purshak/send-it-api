import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationType } from '../../../../generated/prisma/enums.js';
import type { UpdateProfileDto, UpdateSettingsDto } from '../../../validation/profile/profile.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      include: { profile: true, twoFactorAuth: { select: { isEnabled: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatProfile(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const userUpdate: Record<string, unknown> = {};
    if (dto.phone !== undefined) userUpdate['phoneNumber'] = dto.phone;
    if (dto.avatarUrl !== undefined) userUpdate['avatarUrl'] = dto.avatarUrl;

    const profileUpdate: Record<string, unknown> = {};
    if (dto.companyName !== undefined) profileUpdate['companyName'] = dto.companyName;
    if (dto.companyNameLat !== undefined) profileUpdate['companyNameLat'] = dto.companyNameLat;
    if (dto.ownershipForm !== undefined) profileUpdate['ownershipForm'] = dto.ownershipForm;
    if (dto.taxNumber !== undefined) profileUpdate['taxNumber'] = dto.taxNumber;
    if (dto.legalAddress !== undefined) profileUpdate['legalAddress'] = dto.legalAddress;
    if (dto.contactPersonName !== undefined) profileUpdate['contactPersonName'] = dto.contactPersonName;

    await this.prisma.db.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length) {
        await tx.user.update({ where: { id: userId }, data: userUpdate });
      }
      if (Object.keys(profileUpdate).length && user.profile) {
        await tx.userProfile.update({ where: { userId }, data: profileUpdate });
      }
    });

    return this.getProfile(userId);
  }

  async updateSettings(userId: number, dto: UpdateSettingsDto) {
    const data: Record<string, unknown> = {};
    if (dto.language !== undefined) data['language'] = dto.language;
    if (dto.timezone !== undefined) data['timezone'] = dto.timezone;
    if (dto.dateFormat !== undefined) data['dateFormat'] = dto.dateFormat;
    if (dto.notifications) {
      const n = dto.notifications;
      if (n.subscription !== undefined) data['notifSubscription'] = n.subscription;
      if (n.postalConnection !== undefined) data['notifPostalConnection'] = n.postalConnection;
      if (n.system !== undefined) data['notifSystem'] = n.system;
      if (n.email !== undefined) data['notifEmail'] = n.email;
    }

    const user = await this.prisma.db.user.update({
      where: { id: userId },
      data,
    });

    return {
      language: user.language,
      timezone: user.timezone,
      dateFormat: user.dateFormat,
      notifications: {
        subscription: user.notifSubscription,
        postalConnection: user.notifPostalConnection,
        account: user.notifAccount,
        system: user.notifSystem,
        email: user.notifEmail,
      },
    };
  }

  async scheduleDelete(userId: number) {
    const scheduledDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.db.user.update({
      where: { id: userId },
      data: { status: 'DELETED', scheduledDeletionAt },
    });
    await this.prisma.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.notifications.create(
      userId,
      NotificationType.ACCOUNT,
      'Account scheduled for deletion',
      `Your account will be permanently deleted on ${scheduledDeletionAt.toISOString().split('T')[0]}. Log in to cancel.`,
    );
  }

  async restoreAccount(userId: number) {
    const user = await this.prisma.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'DELETED') {
      throw new BadRequestException('Account is not scheduled for deletion');
    }
    if (!user.scheduledDeletionAt || user.scheduledDeletionAt < new Date()) {
      throw new BadRequestException('Deletion window has passed — account cannot be restored');
    }

    await this.prisma.db.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', scheduledDeletionAt: null },
    });
    await this.notifications.create(
      userId,
      NotificationType.ACCOUNT,
      'Account deletion cancelled',
      'Your account deletion has been cancelled. Your account is now active again.',
    );
    return { message: 'Account deletion cancelled' };
  }

  private formatProfile(user: Awaited<ReturnType<typeof this.prisma.db.user.findUnique>> & { profile: unknown; twoFactorAuth: unknown }) {
    const u = user as {
      id: number;
      email: string | null;
      phoneNumber: string | null;
      avatarUrl: string | null;
      language: string;
      timezone: string;
      dateFormat: string;
      notifSubscription: boolean;
      notifPostalConnection: boolean;
      notifAccount: boolean;
      notifSystem: boolean;
      notifEmail: boolean;
      profile: null | {
        companyName: string;
        companyNameLat: string | null;
        ownershipForm: string | null;
        edrpou: string;
        taxNumber: string | null;
        legalAddress: string;
        contactPersonName: string | null;
      };
      twoFactorAuth: null | { isEnabled: boolean };
    };

    return {
      id: u.id,
      email: u.email,
      phone: u.phoneNumber,
      avatarUrl: u.avatarUrl,
      twoFactorEnabled: u.twoFactorAuth?.isEnabled ?? false,
      profile: u.profile
        ? {
            companyName: u.profile.companyName,
            companyNameLat: u.profile.companyNameLat,
            ownershipForm: u.profile.ownershipForm,
            edrpou: u.profile.edrpou,
            taxNumber: u.profile.taxNumber,
            legalAddress: u.profile.legalAddress,
            contactPersonName: u.profile.contactPersonName,
          }
        : null,
      settings: {
        language: u.language,
        timezone: u.timezone,
        dateFormat: u.dateFormat,
      },
      notifications: {
        subscription: u.notifSubscription,
        postalConnection: u.notifPostalConnection,
        account: u.notifAccount,
        system: u.notifSystem,
        email: u.notifEmail,
      },
    };
  }
}
