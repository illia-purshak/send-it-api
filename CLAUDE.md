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
- Prisma client generated to `generated/prisma/` at project root (not `src/`); import as `../../generated/prisma/client.js`
- `PrismaService` wraps the client — access models via `prismaService.db.user`, `.db.refreshToken`, etc.
- Zod for validation schemas (`src/validation/`); `class-validator` / `class-transformer` also available
- `otplib 13.x` uses functional API: `import { generateSecret, generateURI, verifySync } from 'otplib'` (no `authenticator` object)
- All relative imports must use `.js` extension (`module: nodenext`)

### Role model (critical — two separate DB tables)
| Role | Table | Notes |
|------|-------|-------|
| `CLIENT` | `User` | B2B orgs only; self-registers |
| `ADMIN` | `Admin` | Invited by SUPER_ADMIN; 2FA mandatory |
| `SUPER_ADMIN` | `Admin` | All ADMIN rights + admin management; 2FA not required |

Admins **cannot** self-register. Only `SUPER_ADMIN` can invite admins via `AdminInvite` (email + token with TTL).

### Module layout
```
src/
  prisma/           # PrismaService (wraps PrismaPg adapter) + PrismaModule (@Global)
  common/
    guards/         # JwtAuthGuard (global via APP_GUARD)
    decorators/     # @Public(), @CurrentUser()
    pipes/          # ZodValidationPipe
  types/            # auth.types.ts — JwtPayload, JwtUser, PendingJwtPayload
  utils/            # crypto.util.ts — hashSha256, generateToken, encryptTotp, decryptTotp
  module/
    user/auth/      # CLIENT auth — 10 endpoints (register, login, refresh, logout, forgot/reset password, 2FA setup/enable/disable/verify)
    admin/auth/     # ADMIN/SUPER_ADMIN auth (stub — implement separately)
  validation/
    auth/           # Zod schemas + inferred types (user.schema.ts)
  constants/
    apiRoutes.ts    # AUTH_ROUTES constant
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
- TOTP secrets: AES-256-CBC encrypted with `TOTP_ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)

Planned modules (per README): users, admin-users, subscriptions, billing, postal-connections, shipment-templates, recipients, notifications, support, admin-services, analytics.

### Auth design
- JWT with separate refresh token tables (`RefreshToken` for users, `AdminRefreshToken` for admins)
- Refresh tokens are stored as **hashes** and support revocation via `revokedAt`
- Reset password tokens use two hashes: `tokenHash` (stored) and `tokenLookupHash` (unique index for fast lookup) with `usedAt` flag
- TOTP 2FA: optional for `CLIENT`, mandatory for `ADMIN` (secret encrypted at rest)

### Subscription & billing
- Plans: `FREE` (1 operator), `PRO` (paid, level 1), `BUSINESS` (paid, level 2)
- Plan changes take effect at the start of the next billing period (`nextPlanId` on `UserSubscription`)
- `UserPostalConnection` enforces `@@unique([userId, postalServiceId])` — one connection per operator per user
- Billing/payments are **mock** (educational project, no real payment processor)

### Postal operator connections
- `PostalService` is the admin-managed registry of available operators
- `UserPostalConnection.apiKey` is encrypted — decrypt only when making outbound operator API calls
- Client flow: profile page → connect operator → use in shipment creation stepper
