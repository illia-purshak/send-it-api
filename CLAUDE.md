# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm start:dev        # dev server with watch
pnpm build            # compile to dist/
pnpm start:prod       # run compiled build
pnpm lint             # ESLint with auto-fix
pnpm format           # Prettier
pnpm test             # unit tests (jest, rootDir: src, *.spec.ts)
pnpm test:watch       # jest watch mode
pnpm test:cov         # coverage report
pnpm test:e2e         # e2e tests (test/jest-e2e.json)
```

Single test file: `pnpm test -- --testPathPattern=auth.service`

Local dev (Docker):
```bash
docker compose up -d      # start PostgreSQL on port 5433
```
Copy `.env.example` to `.env` and fill in secrets (`JWT_ACCESS_SECRET`, `JWT_PENDING_SECRET`, `TOTP_ENCRYPTION_KEY`, `NOVA_POST_BASE_URL`).

Prisma:
```bash
pnpm prisma migrate dev   # apply migrations
pnpm prisma generate      # regenerate client after schema change
pnpm prisma studio        # GUI for DB
```

## Architecture

**SendIt** is a B2B logistics aggregator — it does **not** store shipments as source of truth. All shipment data is fetched live from external postal operator APIs (Nova Post, Ukrposhta, Mist, etc.) using encrypted API keys stored per user. The `Shipment` table is a **cache/metadata store** that is upserted on every API call; always prefer live data.

### Tech stack
- NestJS 11 + TypeScript
- PostgreSQL + Prisma 7 (`provider = "prisma-client"`, requires `@prisma/adapter-pg` + `pg` at runtime)
- Prisma client generated to `generated/prisma/` at project root (not `src/`); import as `../../generated/prisma/client.js` or `../../../generated/prisma/enums.js`
- `PrismaService` wraps the client — access models via `prismaService.db.user`, `.db.shipmentTemplate`, etc.
- Zod for validation schemas (`src/validation/`); `class-validator` / `class-transformer` also available
- `otplib 13.x` uses functional API: `import { generateSecret, generateURI, verifySync } from 'otplib'` (no `authenticator` object)
- All relative imports must use `.js` extension (`module: nodenext`)
- Swagger UI at `/docs`

### Role model (critical — two separate DB tables)
| Role | Table | Notes |
|------|-------|-------|
| `CLIENT` | `User` | B2B orgs only; self-registers |
| `ADMIN` | `Admin` | Invited by SUPER_ADMIN; 2FA mandatory |
| `SUPER_ADMIN` | `Admin` | All ADMIN rights + admin management; 2FA not required |

Admins **cannot** self-register. Only `SUPER_ADMIN` can invite admins via `AdminInvite` (email + token with TTL). `AdminInvite.token` stores `hashSha256(rawToken)`.

### Module layout (what currently exists)
```
src/
  prisma/           # PrismaService (wraps PrismaPg adapter) + PrismaModule (@Global)
  common/
    guards/         # JwtAuthGuard (global via APP_GUARD), AdminJwtAuthGuard (admin routes)
    decorators/     # @Public(), @CurrentUser(), @CurrentAdmin()
    pipes/          # ZodValidationPipe
    swagger/        # Swagger decorators
  types/            # auth.types.ts — JwtPayload, JwtUser, PendingJwtPayload
                    # admin-auth.types.ts — AdminJwtPayload, AdminJwtUser, AdminPendingJwtPayload, AdminSetupRequiredJwtPayload
  utils/            # crypto.util.ts — hashSha256, generateToken, encryptTotp, decryptTotp
  module/
    user/
      auth/         # CLIENT auth — register, login, refresh, logout, forgot/reset password, 2FA setup/enable/disable/verify
      billing/      # billing history + mock payment card CRUD
      subscription/ # plans list, current subscription, upgrade/downgrade/cancel
      postal-connections/
        (root)      # PostalConnectionsService — limit enforcement, status management
        nova-post/  # NovaPostAuthService — connect via phone, obtain + cache operator JWT
        nova-poshta/# NovaPoshtaService — Nova Poshta API queries (separate operator variant)
      shipments/    # ShipmentsController + 4 services (see Shipments section)
      onboarding/   # GET checklist (profileCompleted, operatorConnected, firstShipmentCreated)
    admin/
      auth/         # ADMIN/SUPER_ADMIN auth — accept-invite, login, 2FA, refresh, logout
      subscription/ # Admin view: paginated list, change plan, extend, force-cancel, set discount
    scheduler/      # Nightly @Cron jobs (see Scheduler section)
  validation/       # Zod schemas organised by domain (auth/, billing/, postal-connections/, shipments/, subscription/)
  constants/
    apiRoutes.ts    # All route constants (AUTH_ROUTES, ADMIN_AUTH_ROUTES, SHIPMENT_ROUTES, etc.)
generated/
  prisma/           # Auto-generated Prisma 7 TypeScript client (never edit manually)
```

### Validation pattern
ZodValidationPipe at param level — no global ValidationPipe:
```typescript
@Post(AUTH_ROUTES.REGISTER)
register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) { ... }
```

### Token hashing convention
- Refresh tokens: store `hashSha256(rawToken)` in DB
- Reset password: `tokenLookupHash = hashSha256('lookup:' + raw)`, `tokenHash = hashSha256('verify:' + raw)`
- Admin invite token: store `hashSha256(rawToken)` in `AdminInvite.token`
- TOTP secrets **and postal API keys**: AES-256-CBC via `encryptTotp`/`decryptTotp` — despite the name, these helpers are reused for `UserPostalConnection.apiKey`
- `TOTP_ENCRYPTION_KEY` env var: 64 hex chars = 32 bytes

### Auth design
- JWT with separate refresh token tables (`RefreshToken` for users, `AdminRefreshToken` for admins)
- Refresh tokens stored as hashes, support revocation via `revokedAt`
- Reset password uses two hashes: `tokenHash` (stored) and `tokenLookupHash` (unique index) with `usedAt` flag
- TOTP 2FA: optional for `CLIENT`, mandatory for `ADMIN`
- Admin login has an extra JWT state: `setup_required` (first login, 2FA not yet configured) vs `pending_2fa` (credentials verified, awaiting TOTP code)

### Subscription & billing
- Plans: `FREE` (1 operator), `PRO`, `BUSINESS` — defined in `SubscriptionPlan` table (admin-managed) with `maxOperators`
- Plan changes take effect at billing period boundary (`nextPlanId` on `UserSubscription`); statuses: `ACTIVE`, `PENDING_UPGRADE`, `PENDING_DOWNGRADE`, `CANCELLED`
- `DiscountType.ONE_TIME` is cleared after the first renewal; `PERMANENT` persists
- Billing/payments are **mock** (educational project, no real payment processor)
- Admin capabilities: immediately change plan, extend period by 1 month, force-cancel, set custom amount + discount type

### Scheduler (nightly crons at midnight)
All three jobs run in `SchedulerService`:
1. `processSubscriptionRenewals` — renews expired `ACTIVE` subscriptions, creates `BillingHistory` record
2. `activatePendingPlans` — promotes `PENDING_UPGRADE`/`PENDING_DOWNGRADE` to `ACTIVE` using `nextPlanId`; on downgrade, blocks oldest excess `UserPostalConnection` rows; on upgrade, unblocks all `BLOCKED` connections
3. `expireCancelledSubscriptions` — moves `CANCELLED` subs that have expired to `FREE` plan, deactivates excess connections

### Shipments architecture
Four services inside `shipments/` share one controller:
- `ShipmentReadService` — unified list (live operator data + local drafts merged and sorted); delegates per-operator fetching
- `NovaPostShipmentsService` — calls Nova Post API via JWT from `NovaPostAuthService`; upserts metadata to `Shipment` table; maps raw statuses via `shipment-status.mapper.ts`; on 401 marks connection `INVALID` and creates a notification
- `ShipmentDraftsService` — CRUD for `ShipmentDraft` (JSON blob stored locally); on successful shipment creation the draft is auto-deleted
- `ShipmentTemplatesService` — CRUD for `ShipmentTemplate` (reusable form JSON)
- Action flags (`canEdit`, `canCancel`, `canDuplicate`) are derived from `ShipmentStatus` in `shipment-status.mapper.ts`

### Postal operator connections
- `PostalService` is the admin-managed registry of available operators (slug, name, logoUrl)
- `NovaPostAuthService` caches operator JWTs **in memory** per `userId` with a 55-minute TTL; cache is invalidated on 401 response
- Connection statuses: `ACTIVE` (normal), `BLOCKED` (over plan limit — reversible by upgrade), `INVALID` (bad API key — user must reconnect)
- `@@unique([userId, postalServiceId])` — one connection per operator per user
- `checkOperatorLimit` in `PostalConnectionsService` throws `OPERATOR_LIMIT_REACHED` (403) before allowing a new connection
