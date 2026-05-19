import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  generateToken,
  hashSha256,
  encryptTotp,
  decryptTotp,
} from '../../../utils/crypto.util.js';
import type {
  AdminJwtPayload,
  AdminJwtUser,
  AdminPendingJwtPayload,
  AdminSetupRequiredJwtPayload,
} from '../../../types/admin-auth.types.js';
import type {
  SetPasswordDto,
  Setup2faWithTokenDto,
  VerifySetup2faDto,
  AdminLoginDto,
  AdminVerify2faDto,
  AdminRefreshDto,
  AdminLogoutDto,
  Admin2faCodeDto,
} from '../../../validation/auth/admin.schema.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private issueAccessToken(admin: {
    id: number;
    email: string;
    isSuperAdmin: boolean;
  }): string {
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
      entityType: 'admin',
      type: 'access',
    };
    return this.jwtService.sign(payload);
  }

  private async issueRefreshToken(adminId: number): Promise<string> {
    const raw = generateToken();
    const tokenHash = hashSha256(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.db.adminRefreshToken.create({
      data: { adminId, tokenHash, expiresAt },
    });
    return raw;
  }

  private issuePendingToken(adminId: number): string {
    const payload: AdminPendingJwtPayload = {
      sub: adminId,
      entityType: 'admin',
      type: 'pending_2fa',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_PENDING_EXPIRES_IN') ??
        '5m') as JwtExpiresIn,
    });
  }

  private issueSetupToken(admin: {
    id: number;
    email: string;
    isSuperAdmin: boolean;
  }): string {
    const payload: AdminSetupRequiredJwtPayload = {
      sub: admin.id,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
      entityType: 'admin',
      type: 'setup_required',
    };
    return this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_SETUP_EXPIRES_IN') ??
        '1h') as JwtExpiresIn,
    });
  }

  private async issueTokenPair(admin: {
    id: number;
    email: string;
    isSuperAdmin: boolean;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.issueAccessToken(admin);
    const refreshToken = await this.issueRefreshToken(admin.id);
    return { accessToken, refreshToken };
  }

  private async findValidInvite(rawToken: string) {
    const tokenHash = hashSha256(rawToken);
    const invite = await this.prisma.db.adminInvite.findUnique({
      where: { token: tokenHash },
      include: { admin: true },
    });
    if (!invite) throw new BadRequestException('Invite token is invalid');
    if (invite.usedAt) throw new BadRequestException('Invite token has already been used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite token has expired');
    return invite;
  }

  async validateInvite(rawToken: string): Promise<{ email: string; valid: true }> {
    const invite = await this.findValidInvite(rawToken);
    return { email: invite.admin.email, valid: true };
  }

  async setPassword(dto: SetPasswordDto): Promise<{ message: string }> {
    const invite = await this.findValidInvite(dto.token);

    if (invite.admin.status !== 'PENDING') {
      throw new BadRequestException('Admin account is not in a pending state');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.db.adminCredentials.upsert({
      where: { adminId: invite.adminId },
      create: { adminId: invite.adminId, passwordHash },
      update: { passwordHash },
    });

    return { message: 'Password set. Proceed to 2FA setup.' };
  }

  async setup2faWithToken(
    dto: Setup2faWithTokenDto,
  ): Promise<{ qrCodeUrl: string; secret: string }> {
    const invite = await this.findValidInvite(dto.token);

    const secret = generateSecret();
    const otpAuthUrl = generateURI({
      issuer: 'SendIt',
      label: invite.admin.email,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return { qrCodeUrl, secret };
  }

  async verifySetupWithToken(dto: VerifySetup2faDto): Promise<{
    accessToken: string;
    refreshToken: string;
    admin: { id: number; email: string; isSuperAdmin: boolean };
  }> {
    const invite = await this.findValidInvite(dto.token);

    const isValid = verifySync({ token: dto.totpCode, secret: dto.secret });
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const encryptedSecret = encryptTotp(dto.secret);

    await this.prisma.db.adminTwoFactorAuth.upsert({
      where: { adminId: invite.adminId },
      create: { adminId: invite.adminId, secret: encryptedSecret, isEnabled: true },
      update: { secret: encryptedSecret, isEnabled: true },
    });

    await this.prisma.db.admin.update({
      where: { id: invite.adminId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.db.adminInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(invite.admin);

    return {
      ...tokens,
      admin: {
        id: invite.admin.id,
        email: invite.admin.email,
        isSuperAdmin: invite.admin.isSuperAdmin,
      },
    };
  }

  async login(
    dto: AdminLoginDto,
  ): Promise<
    | { requires2FA: false; accessToken: string; refreshToken: string }
    | { requires2FA: true; pendingToken: string }
    | { requiresSetup: true; setupToken: string }
  > {
    const admin = await this.prisma.db.admin.findUnique({
      where: { email: dto.email },
      include: { credentials: true, twoFactorAuth: true },
    });

    if (!admin || !admin.credentials) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      admin.credentials.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.status === 'DELETED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.isSuperAdmin) {
      if (admin.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is inactive');
      }
      const tokens = await this.issueTokenPair(admin);
      return { requires2FA: false, ...tokens };
    }

    if (admin.status !== 'ACTIVE' || !admin.twoFactorAuth?.isEnabled) {
      return {
        requiresSetup: true,
        setupToken: this.issueSetupToken(admin),
      };
    }

    const pendingToken = this.issuePendingToken(admin.id);
    return { requires2FA: true, pendingToken };
  }

  async verify2fa(
    dto: AdminVerify2faDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: AdminPendingJwtPayload;

    try {
      payload = this.jwtService.verify<AdminPendingJwtPayload>(
        dto.pendingToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired pending token');
    }

    if (payload.type !== 'pending_2fa' || payload.entityType !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.db.admin.findUnique({
      where: { id: payload.sub },
      include: { twoFactorAuth: true },
    });

    if (!admin || !admin.twoFactorAuth) {
      throw new UnauthorizedException('Invalid token');
    }

    const secret = decryptTotp(admin.twoFactorAuth.secret);
    const isValid = verifySync({ token: dto.totpCode, secret });
    if (!isValid) throw new UnauthorizedException('Invalid TOTP code');

    return this.issueTokenPair(admin);
  }

  async refresh(
    dto: AdminRefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashSha256(dto.refreshToken);

    const record = await this.prisma.db.adminRefreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { admin: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.db.adminRefreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(record.admin);
  }

  async logout(
    admin: AdminJwtUser,
    dto: AdminLogoutDto,
  ): Promise<{ message: string }> {
    const tokenHash = hashSha256(dto.refreshToken);
    await this.prisma.db.adminRefreshToken.updateMany({
      where: { tokenHash, adminId: admin.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async setup2fa(
    admin: AdminJwtUser,
  ): Promise<{ qrCodeUrl: string; secret: string }> {
    const existing = await this.prisma.db.adminTwoFactorAuth.findUnique({
      where: { adminId: admin.id },
    });
    if (existing?.isEnabled) {
      throw new ConflictException('2FA is already enabled');
    }

    const secret = generateSecret();
    const encryptedSecret = encryptTotp(secret);

    await this.prisma.db.adminTwoFactorAuth.upsert({
      where: { adminId: admin.id },
      create: { adminId: admin.id, secret: encryptedSecret },
      update: { secret: encryptedSecret, isEnabled: false },
    });

    const otpAuthUrl = generateURI({
      issuer: 'SendIt',
      label: admin.email,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return { qrCodeUrl, secret };
  }

  async enable2fa(
    admin: AdminJwtUser,
    dto: Admin2faCodeDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const record = await this.prisma.db.adminTwoFactorAuth.findUnique({
      where: { adminId: admin.id },
    });
    if (!record) {
      throw new BadRequestException(
        '2FA not set up. Call /admin/auth/2fa/setup first.',
      );
    }

    const secret = decryptTotp(record.secret);
    const isValid = verifySync({ token: dto.totpCode, secret });
    if (!isValid) throw new UnauthorizedException('Invalid TOTP code');

    await this.prisma.db.adminTwoFactorAuth.update({
      where: { adminId: admin.id },
      data: { isEnabled: true },
    });
    await this.prisma.db.admin.update({
      where: { id: admin.id },
      data: { status: 'ACTIVE' },
    });

    return this.issueTokenPair({
      id: admin.id,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
    });
  }

  async disable2fa(
    admin: AdminJwtUser,
    dto: Admin2faCodeDto,
  ): Promise<{ message: string }> {
    const record = await this.prisma.db.adminTwoFactorAuth.findUnique({
      where: { adminId: admin.id },
    });
    if (!record || !record.isEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const secret = decryptTotp(record.secret);
    const isValid = verifySync({ token: dto.totpCode, secret });
    if (!isValid) throw new UnauthorizedException('Invalid TOTP code');

    await this.prisma.db.adminTwoFactorAuth.update({
      where: { adminId: admin.id },
      data: { isEnabled: false },
    });
    await this.prisma.db.admin.update({
      where: { id: admin.id },
      data: { status: 'INACTIVE' },
    });

    return { message: '2FA disabled successfully' };
  }
}
