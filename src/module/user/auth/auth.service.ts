import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { UserRole } from '../../../../generated/prisma/enums.js';
import type {
  JwtPayload,
  JwtUser,
  PendingJwtPayload,
  ProfileSetupJwtPayload,
} from '../../../types/auth.types.js';
import type {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
  TwoFactorEnableDto,
  TwoFactorVerifyDto,
  CompleteProfileDto,
} from '../../../validation/auth/user.schema.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private issueAccessToken(user: {
    id: number;
    email: string | null;
    role: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      type: 'access',
    };
    return this.jwtService.sign(payload);
  }

  private async issueRefreshToken(userId: number): Promise<string> {
    const raw = generateToken();
    const tokenHash = hashSha256(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.db.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return raw;
  }

  private issuePendingToken(userId: number): string {
    const payload: PendingJwtPayload = { sub: userId, type: 'pending_2fa' };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_PENDING_EXPIRES_IN') ??
        '5m') as JwtExpiresIn,
    });
  }

  private issueProfileSetupToken(userId: number): string {
    const payload: ProfileSetupJwtPayload = { sub: userId, type: 'profile_setup' };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET'),
      expiresIn: '30m' as JwtExpiresIn,
    });
  }

  private async issueTokenPair(user: {
    id: number;
    email: string | null;
    role: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    currentPlan: object | null;
    scheduledPlan: object | null;
  }> {
    const [accessToken, refreshToken, planInfo] = await Promise.all([
      Promise.resolve(this.issueAccessToken(user)),
      this.issueRefreshToken(user.id),
      this.getCurrentPlanInfo(user.id),
    ]);
    return { accessToken, refreshToken, ...planInfo };
  }

  private async getCurrentPlanInfo(userId: number) {
    const active = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });

    const planSource = active?.plan
      ?? await this.prisma.db.subscriptionPlan.findFirst({ where: { level: 0, isActive: true } });

    const currentPlan = planSource
      ? {
          name: planSource.name,
          level: planSource.level,
          hasAnalytics: planSource.hasAnalytics,
          hasTemplates: planSource.hasTemplates,
          hasRecipients: planSource.hasRecipients,
          maxOperators: planSource.maxOperators,
        }
      : null;

    let scheduledPlan: { name: string; activatesAt: Date } | null = null;
    if (active?.scheduledSwitchTo && active.scheduledSwitchAt) {
      const switchTarget = await this.prisma.db.userSubscriptionBalance.findUnique({
        where: { id: active.scheduledSwitchTo },
        include: { plan: true },
      });
      if (switchTarget) {
        scheduledPlan = { name: switchTarget.plan.name, activatesAt: active.scheduledSwitchAt };
      }
    }

    return { currentPlan, scheduledPlan };
  }

  async getMe(user: JwtUser) {
    const record = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true, twoFactorAuth: { select: { isEnabled: true } } },
    });
    const { profile, twoFactorAuth, ...rest } = record;
    return { ...rest, profile: profile ?? null, twoFactorEnabled: twoFactorAuth?.isEnabled ?? false };
  }

  async register(dto: RegisterDto): Promise<{
    requiresProfileCompletion: true;
    profileSetupToken: string;
  }> {
    const existing = await this.prisma.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.db.user.create({
      data: { email: dto.email },
    });
    await this.prisma.db.userCredentials.create({
      data: { userId: user.id, passwordHash },
    });

    const profileSetupToken = this.issueProfileSetupToken(user.id);
    return { requiresProfileCompletion: true, profileSetupToken };
  }

  async login(
    dto: LoginDto,
  ): Promise<
    | { requires2FA: false; accessToken: string; refreshToken: string }
    | { requires2FA: true; pendingToken: string }
    | { requiresProfileCompletion: true; profileSetupToken: string }
  > {
    const user = await this.prisma.db.user.findUnique({
      where: { email: dto.email },
      include: { credentials: true, twoFactorAuth: true },
    });

    if (!user || !user.credentials) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.credentials.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'DELETED') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'BANNED') {
      throw new ForbiddenException('Account is banned');
    }
    if (user.status === 'INACTIVE') {
      const profileSetupToken = this.issueProfileSetupToken(user.id);
      return { requiresProfileCompletion: true, profileSetupToken };
    }

    if (user.twoFactorAuth?.isEnabled) {
      const pendingToken = this.issuePendingToken(user.id);
      return { requires2FA: true, pendingToken };
    }

    const tokens = await this.issueTokenPair(user);
    return { requires2FA: false, ...tokens };
  }

  async refresh(
    dto: RefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashSha256(dto.refreshToken);

    const record = await this.prisma.db.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.db.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(record.user);
  }

  async logout(user: JwtUser, dto: LogoutDto): Promise<{ message: string }> {
    const tokenHash = hashSha256(dto.refreshToken);
    await this.prisma.db.refreshToken.updateMany({
      where: { tokenHash, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const GENERIC = {
      message: 'If this email is registered, a reset link has been sent.',
    };

    const user = await this.prisma.db.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return GENERIC;

    const raw = generateToken();
    const tokenLookupHash = hashSha256('lookup:' + raw);
    const tokenHash = hashSha256('verify:' + raw);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await this.prisma.db.resetPasswordToken.create({
      data: { userId: user.id, tokenHash, tokenLookupHash, expiresAt },
    });

    console.log(`[EMAIL STUB] Password reset token for ${dto.email}: ${raw}`);
    return GENERIC;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenLookupHash = hashSha256('lookup:' + dto.token);

    const record = await this.prisma.db.resetPasswordToken.findUnique({
      where: { tokenLookupHash },
    });

    if (!record) throw new BadRequestException('Invalid reset token');
    if (record.usedAt) throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.db.userCredentials.update({
      where: { userId: record.userId },
      data: { passwordHash },
    });
    await this.prisma.db.resetPasswordToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Password reset successfully' };
  }

  async setup2fa(
    user: JwtUser,
  ): Promise<{ qrCodeUrl: string; secret: string }> {
    const secret = generateSecret();
    const encryptedSecret = encryptTotp(secret);

    await this.prisma.db.twoFactorAuth.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret: encryptedSecret },
      update: { secret: encryptedSecret, isEnabled: false },
    });

    const otpAuthUrl = generateURI({
      issuer: 'SendIt',
      label: user.email ?? `user-${user.id}`,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return { qrCodeUrl, secret };
  }

  async enable2fa(
    user: JwtUser,
    dto: TwoFactorEnableDto,
  ): Promise<{ message: string }> {
    const record = await this.prisma.db.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    if (!record)
      throw new BadRequestException(
        '2FA not set up. Call /auth/2fa/setup first.',
      );

    const secret = decryptTotp(record.secret);
    const result = verifySync({ token: dto.totpCode, secret });
    if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.prisma.db.twoFactorAuth.update({
      where: { userId: user.id },
      data: { isEnabled: true },
    });

    return { message: '2FA enabled successfully' };
  }

  async disable2fa(
    user: JwtUser,
    dto: TwoFactorEnableDto,
  ): Promise<{ message: string }> {
    const record = await this.prisma.db.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    if (!record || !record.isEnabled)
      throw new BadRequestException('2FA is not enabled');

    const secret = decryptTotp(record.secret);
    const result = verifySync({ token: dto.totpCode, secret });
    if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.prisma.db.twoFactorAuth.update({
      where: { userId: user.id },
      data: { isEnabled: false },
    });

    return { message: '2FA disabled successfully' };
  }

  async verify2fa(
    dto: TwoFactorVerifyDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: PendingJwtPayload;

    try {
      payload = this.jwtService.verify<PendingJwtPayload>(dto.pendingToken, {
        secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired pending token');
    }

    if (
      payload.type !== 'pending_2fa' ||
      (payload as { entityType?: string }).entityType === 'admin'
    ) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.db.user.findUnique({
      where: { id: payload.sub },
      include: { twoFactorAuth: true },
    });

    if (!user || !user.twoFactorAuth) {
      throw new UnauthorizedException('Invalid token');
    }

    const secret = decryptTotp(user.twoFactorAuth.secret);
    const result = verifySync({ token: dto.totpCode, secret });
    if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');

    return this.issueTokenPair(user);
  }

  async completeProfile(
    dto: CompleteProfileDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: ProfileSetupJwtPayload;
    try {
      payload = this.jwtService.verify<ProfileSetupJwtPayload>(
        dto.profileSetupToken,
        { secret: this.configService.getOrThrow<string>('JWT_PENDING_SECRET') },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    if (payload.type !== 'profile_setup') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.db.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.status === 'DELETED' || user.status === 'BANNED') {
      throw new ForbiddenException('Account access denied');
    }
    if (user.profileCompleted) {
      throw new ConflictException('Profile already completed');
    }

    const existingProfile = await this.prisma.db.userProfile.findUnique({
      where: { edrpou: dto.edrpou },
    });
    if (existingProfile) throw new ConflictException('EDRPOU already in use');

    await this.prisma.db.$transaction(async (tx) => {
      await tx.userProfile.create({
        data: {
          userId: user.id,
          companyName: dto.companyName,
          companyNameLat: dto.companyNameLat,
          edrpou: dto.edrpou,
          taxNumber: dto.taxNumber,
          legalAddress: dto.legalAddress,
          contactPersonName: dto.contactPersonName,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', profileCompleted: true },
      });
    });

    return this.issueTokenPair(user);
  }
}
