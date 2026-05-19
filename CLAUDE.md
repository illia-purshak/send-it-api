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
Copy `.env.example` to `.env` and fill in secrets (`JWT_ACCESS_SECRET`, `JWT_PENDING_SECRET`, `TOTP_ENCRYPTION_KEY`).

Prisma:
```bash
pnpm prisma migrate dev   # apply migrations
pnpm prisma generate      # regenerate client after schema change
pnpm prisma studio        # GUI for DB
```

## Architecture

**SendIt** is a B2B logistics aggregator — it does **not** store shipments locally. All shipment data is fetched live from external postal operator APIs (Nova Poshta, Ukrposhta, Mist, etc.) using encrypted API keys stored per user.

### Tech stack
- NestJS 11 + TypeScript
- PostgreSQL + Prisma 7 (`provider = "prisma-client"`, requires `@prisma/adapter-pg` + `pg` at runtime)
- Prisma client generated to `generated/prisma/` at project root (not `src/`); import as `../../generated/prisma/client.js` (or `../../../generated/prisma/enums.js` for enums)
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

Admins **cannot** self-register. Only `SUPER_ADMIN` can invite admins via `AdminInvite` (email + token with TTL of 7 days). `AdminInvite.token` stores a hash of the raw token.

### Module layout
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
      profile/      # GET/PATCH user profile + PATCH settings (language, timezone, notifications)
      billing/      # GET billing history, POST mock payment card
      subscription/ # GET plans, GET current subscription, POST upgrade/downgrade/cancel
      postal-connections/  # GET connections, check limit; nova-post/ subdirectory for operator-specific connect
      shipments/    # GET unified list + GET/POST by operator (ShipmentReadService, NovaPostShipmentsService, ShipmentDraftsService)
      drafts/       # CRUD for ShipmentDraft (controller delegates to ShipmentDraftsService in shipments/)
      templates/    # CRUD for ShipmentTemplate + POST :id/increment-usage
      recipients/   # CRUD for Recipient (address book)
      notifications/ # GET list, GET unread-count, PATCH :id (mark read), DELETE :id
      onboarding/   # GET checklist (completion status of onboarding steps)
    admin/
      auth/         # ADMIN auth — validate-invite, register, login, 2FA, refresh, logout
      profile/      # GET/PATCH admin profile + PATCH settings
      subscription/ # GET subscriptions list, GET/PATCH :id (admin view of user subscriptions)
      users/        # GET users list, GET :id, POST restore, DELETE :id (soft delete)
      admins/       # GET admins list, GET :id, POST invite, PATCH :id status, DELETE :id
      services/     # GET/POST/PATCH/DELETE postal services (admin registry)
      support/      # GET/POST support tickets + messages
    scheduler/      # @Cron jobs: subscription renewal, plan activation, expiry → FREE downgrade
  validation/       # Zod schemas organised by domain (auth/, profile/, templates/, recipients/, etc.)
  constants/
    apiRoutes.ts    # All route constants (AUTH_ROUTES, SHIPMENT_ROUTES, TEMPLATE_ROUTES, etc.)
generated/
  prisma/           # Auto-generated Prisma 7 TypeScript client (never edit manually)
```

### Validation pattern
ZodValidationPipe at param level — no global ValidationPipe:
```typescript
@Post(TEMPLATE_ROUTES.BASE)
create(@Body(new ZodValidationPipe(CreateTemplateSchema)) dto: CreateTemplateDto) { ... }
```

### Token hashing convention
- Refresh tokens: store `hashSha256(rawToken)` in DB
- Reset password: `tokenLookupHash = hashSha256('lookup:' + raw)`, `tokenHash = hashSha256('verify:' + raw)`
- Admin invite token: store `hashSha256(rawToken)` in `AdminInvite.token`
- TOTP secrets: AES-256-CBC encrypted with `TOTP_ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)
- Postal API keys (`UserPostalConnection.apiKey`): AES-256-CBC encrypted — decrypt only when making outbound operator API calls

### Auth design
- JWT with separate refresh token tables (`RefreshToken` for users, `AdminRefreshToken` for admins)
- Refresh tokens stored as hashes, support revocation via `revokedAt`
- Reset password uses two hashes: `tokenHash` (stored) and `tokenLookupHash` (unique index) with `usedAt` flag
- TOTP 2FA: optional for `CLIENT`, mandatory for `ADMIN` (secret encrypted at rest)
- Admin login has an extra JWT state: `setup_required` (first login before 2FA configured) vs `pending_2fa` (credentials verified, awaiting TOTP code)

### Subscription & billing
- Plans: `FREE` (1 operator), `PRO`, `BUSINESS` — stored in `SubscriptionPlan` table with `maxOperators`
- Plan changes take effect at billing period boundary (`nextPlanId` on `UserSubscription`); statuses: `ACTIVE`, `PENDING_UPGRADE`, `PENDING_DOWNGRADE`, `CANCELLED`
- `SchedulerService` runs nightly crons: renew active subs, activate pending plan changes, expire cancelled subs → downgrade to FREE; on downgrade, deactivates excess `UserPostalConnection` rows (oldest kept)
- Billing/payments are **mock** (educational project, no real payment processor)
- `DiscountType.ONE_TIME` discounts are cleared after the first renewal

### Shipments architecture
- `ShipmentReadService` — aggregates live operator data + local drafts into a unified list; delegates to operator-specific services
- `NovaPostShipmentsService` — calls Nova Poshta API using the user's decrypted API key; maps raw statuses via `shipment-status.mapper.ts`
- `ShipmentDraftsService` — CRUD for `ShipmentDraft` (stored locally as JSON blob); shared between `DraftsModule` and `ShipmentsModule`
- Unified list merges operator shipments + drafts, applies filters, sorts by `createdAt` desc
- `ShipmentStatus` enum: `DRAFT | CREATED | PREPARING | IN_TRANSIT | DELIVERED | CANCELLED | RETURNED | UNKNOWN`
- Action flags (`canEdit`, `canCancel`, `canDuplicate`) derived from normalized status in `shipment-status.mapper.ts`

### Postal operator connections
- `PostalService` is the admin-managed registry of available operators (slug, name, logoUrl)
- `PostalConnectionsService` enforces operator limit based on subscription plan; marks connections `INVALID` when API key fails
- `@@unique([userId, postalServiceId])` — one connection per operator per user
- Connection statuses: `ACTIVE`, `BLOCKED` (over plan limit), `INVALID` (bad API key)
