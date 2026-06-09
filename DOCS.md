# SendIt API — Technical Documentation

## Overview

SendIt is a B2B logistics aggregator API. It does **not** store shipments locally — all shipment data is fetched live from external postal operator APIs (Nova Post, Ukrposhta, Meest, etc.) using per-user encrypted API keys. The platform handles multi-operator connections, unified shipment tracking, subscription management, and a full admin back-office.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL via Prisma 7 (`prisma-client` provider) |
| ORM adapter | `@prisma/adapter-pg` + `pg` |
| Validation | Zod (domain schemas) + `class-validator` / `class-transformer` |
| Auth | JWT (access + refresh) + TOTP 2FA (`otplib 13.x`) |
| Scheduling | `@nestjs/schedule` (cron jobs) |
| Docs | Swagger UI at `/docs` |
| Password hashing | `bcrypt` (12 rounds) |
| QR codes | `qrcode` (for TOTP setup) |
| Module resolution | `nodenext` — all relative imports require `.js` extension |

---

## Prerequisites & Local Setup

### Environment variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<secret>
JWT_PENDING_SECRET=<secret>
TOTP_ENCRYPTION_KEY=<64 hex chars = 32 bytes>
```

### Database (Docker)

```bash
docker compose up -d      # starts PostgreSQL on port 5433
pnpm prisma migrate dev   # apply migrations
pnpm prisma generate      # regenerate client after schema changes
pnpm prisma studio        # GUI browser for the DB
```

### Dev server

```bash
pnpm start:dev            # watch mode
pnpm build                # compile to dist/
pnpm start:prod           # run compiled build
```

### Testing

```bash
pnpm test                 # unit tests (jest, src/**/*.spec.ts)
pnpm test:watch           # watch mode
pnpm test:cov             # coverage report
pnpm test:e2e             # e2e tests (test/jest-e2e.json)

# single file
pnpm test -- --testPathPattern=auth.service
```

### Linting & formatting

```bash
pnpm lint     # ESLint with auto-fix
pnpm format   # Prettier
```

---

## Architecture

### Prisma client location

The generated client lives at `generated/prisma/` (project root, not `src/`). Import paths:

```typescript
import { ... } from '../../generated/prisma/client.js';
import { SomeEnum } from '../../../generated/prisma/enums.js';
```

`PrismaService` wraps the `@prisma/adapter-pg` adapter. Access models via `prismaService.db.user`, `.db.shipmentTemplate`, etc.

### Role model

Two completely separate DB tables — roles are never mixed:

| Role | DB Table | Notes |
|---|---|---|
| `CLIENT` | `User` | B2B orgs; self-register |
| `ADMIN` | `Admin` | Invited by SUPER_ADMIN; 2FA mandatory |
| `SUPER_ADMIN` | `Admin` | All ADMIN rights + admin management; 2FA not required |

Admins cannot self-register. Only `SUPER_ADMIN` can create an `AdminInvite` (email + hashed token, 7-day TTL).

---

## Module Layout

```
src/
  prisma/               # PrismaService + PrismaModule (@Global)
  common/
    guards/             # JwtAuthGuard (global APP_GUARD), AdminJwtAuthGuard,
    │                   # ActiveAdminAccessGuard, SuperAdminGuard, FeatureGuard
    decorators/         # @Public(), @CurrentUser(), @CurrentAdmin(), @RequireFeature()
    pipes/              # ZodValidationPipe
    swagger/            # reusable Swagger decorators
  types/
    auth.types.ts       # JwtPayload, JwtUser, PendingJwtPayload, ProfileSetupJwtPayload
    admin-auth.types.ts # AdminJwtPayload, AdminJwtUser, AdminPendingJwtPayload,
                        # AdminSetupRequiredJwtPayload
  utils/
    crypto.util.ts      # hashSha256, generateToken, encryptTotp, decryptTotp
    pagination.util.ts  # shared pagination helpers
  constants/
    apiRoutes.ts        # All route constants
  config/
    subscription.config.ts
  validation/           # Zod schemas by domain (auth/, profile/, templates/, etc.)
  module/
    user/
      auth/             # Register, login, refresh, logout, forgot/reset password, 2FA
      profile/          # GET/PATCH profile + PATCH settings
      billing/          # GET billing history, POST mock payment card
      subscription/     # GET plans, GET current, POST upgrade/downgrade/cancel
      postal-connections/  # GET connections; nova-post/, ukrposhta/, meest/ subdirs
      shipments/        # Unified list + per-operator read; ShipmentReadService,
      │                 # NovaPostShipmentsService, UkrposhtaShipmentsService,
      │                 # MeestShipmentsService, ShipmentDraftsService
      drafts/           # CRUD for ShipmentDraft (delegates to ShipmentDraftsService)
      templates/        # CRUD for ShipmentTemplate + POST :id/increment-usage
      recipients/       # CRUD for Recipient (address book)
      notifications/    # GET list, GET unread-count, PATCH :id, DELETE :id
      onboarding/       # GET checklist (onboarding step completion)
      support/          # GET/POST tickets + messages
    admin/
      auth/             # Validate invite, set-password, login, 2FA, refresh, logout
      profile/          # GET/PATCH admin profile + settings
      subscription/     # GET list, GET/PATCH :id (admin view of user subscriptions)
      users/            # GET list, GET :id, POST restore, DELETE :id (soft delete)
      admins/           # GET list, GET :id, POST invite, PATCH :id status, DELETE :id
      services/         # GET/POST/PATCH/DELETE postal services (operator registry)
      support/          # GET/POST support tickets + messages (admin side)
      plans/            # GET/PATCH subscription plans
      statistics/       # Platform-wide statistics
    scheduler/          # @Cron jobs: renewal, plan activation, expiry → FREE downgrade
generated/
  prisma/               # Auto-generated Prisma 7 client (never edit manually)
```

---

## API Endpoints

All routes are prefixed with `api/v1`.

### User Auth — `/api/v1/auth`

| Method | Path | Description |
|---|---|---|
| GET | `/auth/me` | Current user profile |
| POST | `/auth/register` | Create new CLIENT account |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/complete-profile` | Complete B2B profile after registration |
| POST | `/auth/2fa/setup` | Generate TOTP secret + QR code |
| POST | `/auth/2fa/enable` | Enable 2FA (confirm with TOTP code) |
| POST | `/auth/2fa/disable` | Disable 2FA |
| POST | `/auth/2fa/verify` | Verify TOTP code (login step 2) |

### Admin Auth — `/api/v1/admin/auth`

| Method | Path | Description |
|---|---|---|
| GET | `/admin/auth/invite/:token` | Validate invite token |
| POST | `/admin/auth/set-password` | Set password from invite |
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/verify-2fa` | Verify TOTP (login step 2) |
| POST | `/admin/auth/refresh` | Rotate refresh token |
| POST | `/admin/auth/logout` | Revoke refresh token |
| POST | `/admin/auth/2fa/setup` | Generate TOTP secret + QR |
| POST | `/admin/auth/2fa/verify-setup` | Verify TOTP during setup |
| POST | `/admin/auth/2fa/enable` | Enable 2FA |
| POST | `/admin/auth/2fa/disable` | Disable 2FA |

### Subscriptions — `/api/v1/subscriptions`

| Method | Path | Description |
|---|---|---|
| GET | `/subscriptions/plans` | List public plans |
| GET | `/subscriptions/me` | Current user subscription |
| POST | `/subscriptions/:id` | Upgrade / downgrade / cancel |

### Billing — `/api/v1/billing`

| Method | Path | Description |
|---|---|---|
| GET | `/billing` | Billing history |
| POST | `/billing/card` | Add mock payment card |

### Postal Connections — `/api/v1/postal-connections`

| Method | Path | Description |
|---|---|---|
| GET | `/postal-connections` | List user's connections |
| POST | `/postal-connections/nova-post/request-key` | Request Nova Post API key |
| POST | `/postal-connections/nova-post/connect` | Connect Nova Post |
| POST | `/postal-connections/nova-poshta` | Connect Nova Poshta |
| GET | `/postal-connections/nova-poshta/divisions` | List Nova Poshta divisions |
| POST | `/postal-connections/ukrposhta` | Connect Ukrposhta |
| POST | `/postal-connections/meest` | Connect Meest |

### Shipments — `/api/v1/shipments`

| Method | Path | Description |
|---|---|---|
| GET | `/shipments` | Unified list (all operators + drafts) |
| GET | `/shipments/operators` | List connected operators |
| GET | `/shipments/:operator/:ref` | Shipment detail by operator + ref |
| GET/POST | `/shipments/nova-poshta` | Nova Poshta shipments |
| GET | `/shipments/nova-poshta/:ref` | Nova Poshta shipment detail |
| GET/POST | `/shipments/ukrposhta` | Ukrposhta shipments |
| GET | `/shipments/ukrposhta/:ref` | Ukrposhta detail |
| GET/POST | `/shipments/meest` | Meest shipments |
| GET | `/shipments/meest/:ref` | Meest detail |

### Drafts — `/api/v1/drafts`

| Method | Path | Description |
|---|---|---|
| GET/POST | `/drafts` | List / create drafts |
| GET/PATCH/DELETE | `/drafts/:id` | Get / update / delete draft |

### Templates — `/api/v1/templates`

| Method | Path | Description |
|---|---|---|
| GET/POST | `/templates` | List / create templates |
| GET/PATCH/DELETE | `/templates/:id` | Get / update / delete template |
| POST | `/templates/:id/increment-usage` | Track template use count |

### Recipients — `/api/v1/recipients`

| Method | Path | Description |
|---|---|---|
| GET/POST | `/recipients` | List / create recipients |
| GET/PATCH/DELETE | `/recipients/:id` | Get / update / delete recipient |

### Notifications — `/api/v1/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List notifications |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/:id` | Mark as read |
| DELETE | `/notifications/:id` | Delete |

### Profile — `/api/v1/profile`

| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/profile` | Get / update profile |
| PATCH | `/profile/settings` | Update language, timezone, notification prefs |

### Onboarding — `/api/v1/onboarding`

| Method | Path | Description |
|---|---|---|
| GET | `/onboarding/checklist` | Onboarding step completion |

### Support — `/api/v1/support`

| Method | Path | Description |
|---|---|---|
| GET/POST | `/support/tickets` | List / create tickets |
| GET | `/support/tickets/:id` | Ticket detail |
| POST | `/support/tickets/:id/message` | Post message |
| POST | `/support/tickets/:id/read` | Mark ticket as read |

### Admin — Users, Admins, Services, etc.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | List users |
| GET/DELETE | `/admin/users/:id` | Get / soft-delete user |
| POST | `/admin/users/me/restore` | Restore soft-deleted user |
| GET | `/admin/admins` | List admins |
| GET/PATCH/DELETE | `/admin/admins/:id` | Get / update status / delete admin |
| POST | `/admin/admins/invite` | Invite new admin |
| POST | `/admin/admins/:id/resend-invite` | Resend invite email |
| GET/POST | `/admin/services` | List / create postal services |
| GET/PATCH/DELETE | `/admin/services/:id` | Manage postal service |
| GET | `/admin/subscriptions` | List all subscriptions |
| GET/PATCH | `/admin/subscriptions/:id` | View / edit subscription |
| GET/PATCH | `/admin/plans/:id` | View / edit plan |
| GET | `/admin/statistics` | Platform statistics |
| GET/POST | `/admin/support/tickets` | All support tickets |
| GET | `/admin/support/tickets/my` | Tickets assigned to me |
| GET | `/admin/support/tickets/:id` | Ticket detail |
| POST | `/admin/support/tickets/:id/message` | Post reply |

---

## Auth Design

### JWT token types

| Type | Secret env var | Lifetime | Purpose |
|---|---|---|---|
| `access` | `JWT_ACCESS_SECRET` | short (15 min default) | API requests |
| `pending_2fa` | `JWT_PENDING_SECRET` | short | Credentials OK, awaiting TOTP |
| `setup_required` | `JWT_PENDING_SECRET` | short | First admin login, 2FA not yet configured |
| `profile_setup` | `JWT_PENDING_SECRET` | short | Registration done, profile not complete |

Refresh tokens are stored in `RefreshToken` / `AdminRefreshToken` tables as SHA-256 hashes (7-day TTL). Tokens are revoked by setting `revokedAt`.

### Token hashing conventions

```
Refresh token   →  hashSha256(rawToken)
Reset password  →  tokenLookupHash = hashSha256('lookup:' + raw)
                   tokenHash       = hashSha256('verify:' + raw)
Admin invite    →  hashSha256(rawToken)
TOTP secret     →  AES-256-CBC encrypted (TOTP_ENCRYPTION_KEY env)
Postal API key  →  AES-256-CBC encrypted (decrypted only for outbound calls)
```

### Admin login flow

```
POST /admin/auth/login
  → credentials valid + 2FA already enabled  →  issue pending_2fa JWT
  → credentials valid + 2FA not configured   →  issue setup_required JWT
POST /admin/auth/verify-2fa  (pending_2fa token)  →  issue access + refresh tokens
POST /admin/auth/2fa/setup   (setup_required token)  →  generate TOTP secret + QR
POST /admin/auth/2fa/verify-setup  →  confirm TOTP, enable 2FA, issue tokens
```

---

## Validation Pattern

`ZodValidationPipe` applied at the parameter level — no global `ValidationPipe`:

```typescript
@Post(TEMPLATE_ROUTES.BASE)
create(@Body(new ZodValidationPipe(CreateTemplateSchema)) dto: CreateTemplateDto) { ... }
```

Schemas live in `src/validation/` organised by domain.

---

## Subscription & Billing

### Plans

Plans are stored in `SubscriptionPlan` with a `level` field:

| Level | Name | maxOperators |
|---|---|---|
| 0 | FREE | 1 |
| 1 | PRO | configurable |
| 2 | BUSINESS | configurable |
| 3+ | custom / personal | configurable |

`isPersonal = true` plans target a single `targetUserId`.

### Subscription statuses (`SubscriptionBalanceStatus`)

`ACTIVE` → `PAUSED` → `QUEUED` → `EXPIRED`

Plan changes take effect at billing period boundary via `scheduledSwitchTo` / `scheduledSwitchAt`.

### Scheduler (nightly cron jobs)

- Renew active subscriptions that reach `periodEnd`
- Activate pending plan switches
- Expire cancelled subscriptions → downgrade to FREE; deactivates excess `UserPostalConnection` rows (oldest connections kept)
- `ONE_TIME` discounts are cleared after the first renewal

> Billing and payments are **mock** — no real payment processor is integrated.

---

## Postal Operator Connections

- `PostalService` is the admin-managed registry (slug, name, logoUrl, isActive).
- `UserPostalConnection` is `@@unique([userId, postalServiceId])` — one connection per operator per user.
- `PostalConnectionsService` enforces the `maxOperators` limit from the user's plan.

Connection statuses:

| Status | Meaning |
|---|---|
| `ACTIVE` | Connected and working |
| `BLOCKED` | Over plan limit |
| `INVALID` | API key rejected by operator |

---

## Shipments Architecture

| Service | Responsibility |
|---|---|
| `ShipmentReadService` | Aggregates live operator data + local drafts into a unified list |
| `NovaPostShipmentsService` | Calls Nova Post API; maps raw statuses via `shipment-status.mapper.ts` |
| `UkrposhtaShipmentsService` | Reads from local `UkrposhtaShipment` table |
| `MeestShipmentsService` | Reads from local `MeestShipment` table |
| `ShipmentDraftsService` | CRUD for `ShipmentDraft` (JSON blob); shared by DraftsModule + ShipmentsModule |

The unified list merges operator shipments + drafts, applies filters, and sorts by `createdAt` desc.

### ShipmentStatus enum

`DRAFT | CREATED | PREPARING | IN_TRANSIT | DELIVERED | CANCELLED | RETURNED | UNKNOWN`

Action flags (`canEdit`, `canCancel`, `canDuplicate`) are derived from the normalized status in `shipment-status.mapper.ts`.

---

## Database Schema Summary

### Core models

| Model | Purpose |
|---|---|
| `User` | CLIENT account (B2B org) |
| `UserProfile` | Company details (name, EDRPOU, legal address) |
| `UserCredentials` | bcrypt password hash |
| `RefreshToken` | User JWT refresh tokens (hashed) |
| `ResetPasswordToken` | Password reset tokens (dual-hash pattern) |
| `TwoFactorAuth` | TOTP secret (encrypted) + enabled flag |
| `Admin` | Admin / SUPER_ADMIN account |
| `AdminCredentials` | Admin bcrypt password |
| `AdminRefreshToken` | Admin JWT refresh tokens |
| `AdminTwoFactorAuth` | Admin TOTP secret |
| `AdminInvite` | Invite token (hashed) + TTL |
| `PostalService` | Operator registry (admin-managed) |
| `UserPostalConnection` | User ↔ operator link + encrypted API key |
| `SubscriptionPlan` | Plan definitions |
| `UserSubscriptionBalance` | Active subscription per user |
| `BillingHistory` | Payment records (mock) |
| `MockPaymentCard` | Mock card (encrypted number + holder name) |
| `ShipmentTemplate` | Reusable shipment template (JSON blob) |
| `ShipmentDraft` | In-progress shipment draft (JSON blob) |
| `UkrposhtaShipment` | Locally stored Ukrposhta shipment records |
| `MeestShipment` | Locally stored Meest shipment records |
| `Recipient` | Address book entry |
| `Notification` | In-app notification |
| `SupportTicket` | Customer support ticket |
| `SupportMessage` | Message thread inside a ticket |
| `TicketReadStatus` | Per-user / per-admin read cursor |

---

## Key Patterns

### otplib usage

`otplib 13.x` uses the functional API — no `authenticator` object:

```typescript
import { generateSecret, generateURI, verifySync } from 'otplib';
```

### Import extensions

All relative imports must use `.js` extension due to `module: nodenext`:

```typescript
import { PrismaService } from '../prisma/prisma.service.js';
```

### Guards

- `JwtAuthGuard` is registered as global `APP_GUARD` — all routes are protected by default.
- Mark public routes with `@Public()`.
- Admin routes use `AdminJwtAuthGuard`.
- `SuperAdminGuard` restricts routes to `isSuperAdmin = true` admins.
- `FeatureGuard` + `@RequireFeature()` enforce plan-gated features.
