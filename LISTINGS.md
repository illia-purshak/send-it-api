# Лістинги коду — SendIt API

---

## Лістинг 3.1 — Реєстрація та логін (`src/module/user/auth/auth.service.ts`)

```typescript
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
```

---

## Лістинг 3.2 — Видача токенів (`src/module/user/auth/auth.service.ts`)

```typescript
private async issueRefreshToken(userId: number): Promise<string> {
  const raw = generateToken();
  const tokenHash = hashSha256(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await this.prisma.db.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return raw;
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
```

---

## Лістинг 3.3 — Налаштування TOTP / генерація QR-коду (`src/module/user/auth/auth.service.ts`)

```typescript
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
```

---

## Лістинг 3.4 — Верифікація TOTP-коду (`src/module/user/auth/auth.service.ts`)

```typescript
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
```

---

## Лістинг 3.8 — Агрегація списку відправлень (`src/module/user/shipments/shipment-read.service.ts`)

```typescript
async getUnifiedShipments(userId: number, query: ListShipmentsQueryDto) {
  const [drafts, novaPostShipments, ukrposhtaShipments, meestShipments] = await Promise.all([
    this.draftsService.getDrafts(userId),
    this.novaPostService.getShipments(userId, {
      suppressMissingConnection: true,
    }),
    this.ukrposhtaService.getShipments(userId, {
      suppressMissingConnection: true,
    }),
    this.meestService.getShipments(userId, {
      suppressMissingConnection: true,
    }),
  ]);

  const draftRows = drafts.map((draft) => {
    const flags = getShipmentActionFlags(ShipmentStatus.DRAFT);
    const draftData =
      draft.draftData &&
      typeof draft.draftData === 'object' &&
      !Array.isArray(draft.draftData)
        ? (draft.draftData as Record<string, unknown>)
        : {};

    return {
      kind: 'draft',
      operator: 'draft',
      draftId: draft.id,
      ref: null,
      ttn: null,
      postalServiceId: draft.postalServiceId,
      operatorName: 'Draft',
      operatorLogoUrl: null,
      normalizedStatus: ShipmentStatus.DRAFT,
      rawStatus: null,
      recipientName: this.getStringValue(draftData, [
        'recipientName',
        'recipient',
        'recipientFullName',
      ]),
      createdAt: draft.updatedAt,
      declaredValue: this.getNumberValue(draftData, [
        'declaredValue',
        'insuranceCost',
        'value',
      ]),
      ...flags,
    } satisfies ShipmentListItem;
  });

  const filtered = [...novaPostShipments, ...ukrposhtaShipments, ...meestShipments, ...draftRows].filter((item) =>
    this.matchesFilters(item, query),
  );

  filtered.sort((a, b) => {
    if (query.sortBy === 'recipient') {
      const ar = a.recipientName ?? '';
      const br = b.recipientName ?? '';
      return query.sortDir === 'asc'
        ? ar.localeCompare(br)
        : br.localeCompare(ar);
    }
    let av: number;
    let bv: number;
    if (query.sortBy === 'declaredValue') {
      av = a.declaredValue ?? -Infinity;
      bv = b.declaredValue ?? -Infinity;
    } else {
      av = a.createdAt.getTime();
      bv = b.createdAt.getTime();
    }
    return query.sortDir === 'asc' ? av - bv : bv - av;
  });

  const total = filtered.length;
  const { page, limit } = query;
  const shipments = filtered.slice((page - 1) * limit, page * limit);

  return buildPaginatedResponse(shipments, total, page, limit);
}
```

---

## Лістинг 3.9 — Запланований перехід між підписками (`src/module/user/subscription/subscription.service.ts`)

```typescript
async updateBalance(userId: number, balanceId: number, dto: UpdateBalanceDto) {
  const balance = await this.prisma.db.userSubscriptionBalance.findFirst({
    where: { id: balanceId, userId },
  });
  if (!balance) throw new NotFoundException('Subscription balance not found');

  const updates: Record<string, unknown> = {};

  if (dto.autoRenew !== undefined) {
    updates['autoRenew'] = dto.autoRenew;
  }

  if (dto.cancelSwitch) {
    if (!balance.scheduledSwitchAt) {
      throw new BadRequestException('No scheduled switch to cancel');
    }
    updates['scheduledSwitchTo'] = null;
    updates['scheduledSwitchAt'] = null;
  } else if (dto.scheduledSwitchTo !== undefined) {
    const activeBalance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { userId, status: SubscriptionBalanceStatus.ACTIVE },
    });
    if (!activeBalance) throw new BadRequestException('No active subscription to switch from');

    const now = new Date();
    if (activeBalance.scheduledSwitchAt && activeBalance.scheduledSwitchAt > now) {
      throw new BadRequestException({
        code: 'SWITCH_ALREADY_SCHEDULED',
        message: 'A switch is already scheduled',
      });
    }

    const targetBalance = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { id: dto.scheduledSwitchTo, userId },
      include: { plan: true },
    });
    if (!targetBalance) throw new NotFoundException('Target subscription balance not found');
    if (targetBalance.status === SubscriptionBalanceStatus.ACTIVE) {
      throw new BadRequestException('Target is already the active subscription');
    }

    const switchAt = new Date(Date.now() + getSwitchDelayMs());
    await this.prisma.db.userSubscriptionBalance.update({
      where: { id: activeBalance.id },
      data: {
        scheduledSwitchTo: dto.scheduledSwitchTo,
        scheduledSwitchAt: switchAt,
      },
    });

    const current = await this.prisma.db.userSubscriptionBalance.findFirst({
      where: { id: balanceId, userId },
      include: { plan: true },
    });
    return current ? this._serializeBalance(current) : current;
  }

  // ...решта оновлень autoRenew
}
```

---

## Лістинг 3.10 — Cron-методи планувальника (`src/module/scheduler/scheduler.service.ts`)

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async processSubscriptionRenewals() {
  try {
    const now = new Date();
    const due = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        status: SubscriptionBalanceStatus.ACTIVE,
        autoRenew: true,
        periodEnd: { lte: now, not: null },
      },
      include: { plan: true },
    });

    for (const balance of due) {
      const daysTotal =
        balance.periodType === SubscriptionPeriodType.YEARLY ? DAYS_YEARLY : DAYS_MONTHLY;
      const newPeriodEnd = addDays(balance.periodEnd!, daysTotal);

      const amount = balance.customAmount
        ? Number(balance.customAmount)
        : balance.periodType === SubscriptionPeriodType.YEARLY && balance.plan.priceYearly
          ? Number(balance.plan.priceYearly)
          : Number(balance.plan.price);

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: balance.id },
        data: {
          periodEnd: newPeriodEnd,
          ...(balance.discountType === DiscountType.ONE_TIME
            ? { customAmount: null, discountType: null }
            : {}),
        },
      });

      if (amount > 0) {
        await this.billingService.createBillingRecord(
          balance.userId,
          balance.planId,
          balance.id,
          amount,
          balance.periodType,
          now,
          newPeriodEnd,
        );
      }

      this.logger.log(`Renewed balance ${balance.id} for user ${balance.userId}`);
    }
  } catch (err) {
    this.logger.error(`processSubscriptionRenewals failed: ${(err as Error).message}`);
  }
}

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async expireSubscriptions() {
  try {
    const now = new Date();
    const expired = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        status: SubscriptionBalanceStatus.ACTIVE,
        autoRenew: false,
        periodEnd: { lte: now, not: null },
      },
    });

    for (const balance of expired) {
      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: balance.id },
        data: { status: SubscriptionBalanceStatus.EXPIRED },
      });

      await this.subscriptionService.activateNextInQueue(balance.userId);
      this.logger.log(`Expired balance ${balance.id} for user ${balance.userId}`);
    }
  } catch (err) {
    this.logger.error(`expireSubscriptions failed: ${(err as Error).message}`);
  }
}

@Cron(SWITCH_CHECK_CRON)
async activateScheduledSwitches() {
  try {
    const now = new Date();
    const pending = await this.prisma.db.userSubscriptionBalance.findMany({
      where: {
        scheduledSwitchAt: { lte: now, not: null },
        status: SubscriptionBalanceStatus.ACTIVE,
      },
      include: { plan: true },
    });

    for (const activeBalance of pending) {
      if (!activeBalance.scheduledSwitchTo) continue;

      const target = await this.prisma.db.userSubscriptionBalance.findUnique({
        where: { id: activeBalance.scheduledSwitchTo },
        include: { plan: true },
      });
      if (!target) continue;

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: activeBalance.id },
        data: {
          status: SubscriptionBalanceStatus.PAUSED,
          pausedAt: now,
          scheduledSwitchTo: null,
          scheduledSwitchAt: null,
        },
      });

      let newPeriodEnd: Date | null;
      if (target.plan.level === 0) {
        newPeriodEnd = null;
      } else if (target.status === SubscriptionBalanceStatus.PAUSED && target.pausedAt && target.periodEnd) {
        const remainingMs = target.periodEnd.getTime() - target.pausedAt.getTime();
        newPeriodEnd = new Date(now.getTime() + remainingMs);
        newPeriodEnd.setHours(0, 0, 0, 0);
      } else {
        newPeriodEnd = addDays(now, target.daysTotal);
      }

      await this.prisma.db.userSubscriptionBalance.update({
        where: { id: target.id },
        data: {
          status: SubscriptionBalanceStatus.ACTIVE,
          pausedAt: null,
          position: 0,
          periodEnd: newPeriodEnd,
        },
      });

      await this.subscriptionService._applyOperatorLimits(activeBalance.userId, target.plan.maxOperators);

      this.logger.log(
        `Switched balance ${activeBalance.id} -> ${target.id} for user ${activeBalance.userId}`,
      );
    }
  } catch (err) {
    this.logger.error(`activateScheduledSwitches failed: ${(err as Error).message}`);
  }
}
```

---

## Лістинг 3.11 — Запрошення адміна (`src/module/admin/admins/admin-admins.service.ts`)

```typescript
async inviteAdmin(actor: AdminJwtUser, dto: AdminInviteAdminDto) {
  const existingActive = await this.prisma.db.admin.findFirst({
    where: { email: dto.email, status: { not: 'DELETED' } },
  });
  if (existingActive) throw new ConflictException('An admin with this email already exists');

  const pendingInvite = await this.prisma.db.adminInvite.findFirst({
    where: {
      admin: { email: dto.email },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvite) throw new ConflictException('A pending invite already exists for this email');

  const newAdmin = await this.prisma.db.admin.create({
    data: {
      email: dto.email,
      isSuperAdmin: false,
      status: 'PENDING',
      invitedById: actor.id,
    },
  });

  const rawToken = generateToken();
  const tokenHash = hashSha256(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await this.prisma.db.adminInvite.create({
    data: { adminId: newAdmin.id, token: tokenHash, invitedById: actor.id, expiresAt },
  });

  return { adminId: newAdmin.id, email: newAdmin.email, inviteToken: rawToken, expiresAt };
}
```

---

## Лістинг 3.12 — SuperAdminGuard (`src/common/guards/super-admin.guard.ts`)

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AdminJwtUser } from '../../types/admin-auth.types.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AdminJwtUser | undefined = request.user;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }
    return true;
  }
}
```

---

## Лістинг 3.13 — Позначення тікету як прочитаного (`src/module/admin/support/admin-support.service.ts`)

```typescript
async markRead(adminId: number, ticketId: number) {
  await this.findTicketOrThrow(ticketId);

  await this.prisma.db.ticketReadStatus.upsert({
    where: { ticketId_adminId: { ticketId, adminId } },
    create: { ticketId, adminId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  return { success: true };
}
```
