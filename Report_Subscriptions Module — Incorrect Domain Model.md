# Frontend Report: Subscriptions Module — Correct Domain Model

## What Changed on the Backend

The admin subscription module has been restructured to reflect the correct domain model:

- **`/admin/plans`** — CRUD for subscription plan definitions (the catalogue)
- **`/admin/users/:id/subscription`** — per-user subscription management (moved here from the Subscriptions page)
- **`/admin/users/:id/postal-connections/:connectionId`** — force-disconnect an operator for a specific user

The old **`/admin/subscriptions`** routes remain intact for backward compatibility but should no longer drive the Subscriptions page UI.

---

## 1. Admin Subscriptions Page — Rewrite as Plan Management

The Subscriptions page must become a **subscription plan catalogue** editor. Remove all user-subscription logic from this page.

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/plans` | Paginated list of plans |
| `GET` | `/api/v1/admin/plans/:id` | Single plan detail |
| `POST` | `/api/v1/admin/plans` | Create plan |
| `PUT` | `/api/v1/admin/plans/:id` | Update plan (full or partial) |
| `DELETE` | `/api/v1/admin/plans/:id` | Delete plan |

### Query params for GET list

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page, max 100 (default 20) |
| `isPersonal` | boolean | Filter personal plans (`true`/`false`) |
| `isPublic` | boolean | Filter public plans |

### Plan object shape

```ts
{
  id: number;
  name: string;
  level: number;              // 0=Free, 1=Pro, 2=Business, custom>=3
  price: number;              // monthly price
  priceYearly?: number;
  maxOperators: number;
  hasAnalytics: boolean;
  hasTemplates: boolean;
  hasRecipients: boolean;
  hasSupport: boolean;
  autoRenewDefault: boolean;
  isPublic: boolean;
  isPersonal: boolean;
  targetUserId?: number;      // only for personal plans
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targetUser?: { id: number; email: string } | null;
}
```

### Create / Update body

All fields are required on create; all are optional on update (except `isPersonal` which cannot be changed after creation).

```ts
{
  name: string;               // min 1, max 100
  level: number;              // integer >= 0
  price: number;              // >= 0
  priceYearly?: number;
  maxOperators: number;       // integer >= 1
  hasAnalytics?: boolean;     // default false
  hasTemplates?: boolean;     // default false
  hasRecipients?: boolean;    // default false
  hasSupport?: boolean;       // default true
  autoRenewDefault?: boolean; // default true
  isPublic?: boolean;         // default true
  isPersonal?: boolean;       // default false (create only)
  targetUserId?: number;      // required if isPersonal = true
  isActive?: boolean;         // default true
}
```

### Error cases

| Status | Scenario |
|--------|----------|
| `400 Bad Request` | `DELETE` attempted on a plan that has active/queued/paused user subscriptions |
| `404 Not Found` | Plan ID does not exist |

### UI requirements

- Table/list of plans with columns: Name, Level, Price, Max Operators, Features, Status (Active/Inactive).
- **Create** button → modal/drawer with full plan form.
- **Edit** (row action) → pre-filled form; `isPersonal` field should be read-only.
- **Enable / Disable** toggle → `PUT` with `{ isActive: true/false }`.
- **Delete** (row action) → confirmation dialog; show the `400` error message if the plan has active subscribers.
- Feature flags (`hasAnalytics`, `hasTemplates`, `hasRecipients`, `hasSupport`) → render as a checkbox group or tag list.

---

## 2. User Details Page — Subscription Management Tab

Remove subscription-related actions from the Subscriptions page and place them inside the User Details page under a **Subscription** tab or section.

### 2a. Get current subscriptions

```
GET /api/v1/admin/users/:id/subscription
```

Returns an array of `UserSubscriptionBalance` objects (non-expired), ordered by position.

```ts
[
  {
    id: number;
    userId: number;
    planId: number;
    periodType: 'MONTHLY' | 'YEARLY';
    daysTotal: number;
    periodEnd: string | null;
    pausedAt: string | null;
    status: 'ACTIVE' | 'PAUSED' | 'QUEUED' | 'EXPIRED';
    autoRenew: boolean;
    position: number;
    scheduledSwitchTo: number | null;
    scheduledSwitchAt: string | null;
    customAmount: number | null;
    discountType: 'ONE_TIME' | 'PERMANENT' | null;
    createdAt: string;
    updatedAt: string;
    plan: { ...SubscriptionPlan };
  }
]
```

### 2b. Apply action to a balance

```
PUT /api/v1/admin/users/:id/subscription/:balanceId
```

Body uses a discriminated-union `action` field:

| Action | Extra fields | Effect |
|--------|-------------|--------|
| `changePlan` | `planId: number` | Switch to a different plan immediately |
| `extend` | `days: number` | Add N days to `periodEnd` |
| `cancel` | — | Set `autoRenew = false` |
| `setDiscount` | `amount: number`, `discountType: 'ONE_TIME'\|'PERMANENT'` | Set custom price override |
| `suspend` | — | Set status to `PAUSED`, records `pausedAt` |
| `reactivate` | — | Set status back to `ACTIVE`, clears `pausedAt` |

Example:
```json
{ "action": "suspend" }
{ "action": "changePlan", "planId": 3 }
{ "action": "setDiscount", "amount": 9.99, "discountType": "PERMANENT" }
```

### 2c. Billing history

```
GET /api/v1/admin/users/:id/subscription/history?page=1&limit=20
```

Returns paginated `BillingHistory` records:

```ts
{
  data: Array<{
    id: number;
    userId: number;
    planId: number;
    balanceId: number;
    periodType: 'MONTHLY' | 'YEARLY';
    amount: number;
    status: string;   // BillingStatus enum
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    createdAt: string;
    plan: { ...SubscriptionPlan };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Error cases

| Status | Scenario |
|--------|----------|
| `400 Bad Request` | `suspend` on a non-ACTIVE balance; `reactivate` on a non-PAUSED balance; `cancel` on already-cancelled balance |
| `404 Not Found` | `balanceId` does not belong to this user |

### UI requirements

- Display the active balance card: plan name, price, period end, status badge, autoRenew indicator.
- **Change Plan** button → dropdown/modal to pick from active public plans (fetch from `GET /admin/plans?isActive=true&isPublic=true`).
- **Extend** button → number input for days.
- **Set Discount** button → amount + type (ONE_TIME / PERMANENT).
- **Suspend / Reactivate** toggle depending on current `status`.
- **Cancel** button (disables autoRenew).
- Billing history table below the balance card (paginated).
- Note: plan *name* must not be editable from this page — only actions on the balance are allowed.

---

## 3. User Details Page — Postal Connections Section

### View connections

Already included in `GET /api/v1/admin/users/:id` response:

```ts
postalConnections: Array<{
  id: number;
  userId: number;
  postalServiceId: number;
  status: 'ACTIVE' | 'BLOCKED' | 'INVALID';
  connectedAt: string;
  postalService: { id: number; name: string; slug: string; logoUrl: string | null };
}>
```

### Disconnect operator (admin force-remove)

```
DELETE /api/v1/admin/users/:id/postal-connections/:connectionId
```

Returns `{ success: true }` on success.

### UI requirements

- List connected postal operators with status badge (ACTIVE / BLOCKED / INVALID).
- **Disconnect** button (row action) → confirmation dialog → call `DELETE`.
- After disconnect, refresh the user detail or remove the row optimistically.

---

## 4. User Details Page — Block / Unblock User

Already implemented via existing endpoint:

```
PUT /api/v1/admin/users/:id
Body: { "status": "BANNED" }   // block
Body: { "status": "ACTIVE" }   // unblock
```

Ensure the User Details page exposes **Block** and **Unblock** buttons that map to these status values.

---

## Summary of New Endpoints for Frontend

| Method | URL | Used on |
|--------|-----|---------|
| `GET` | `/api/v1/admin/plans` | Subscriptions page (plan list) |
| `POST` | `/api/v1/admin/plans` | Subscriptions page (create plan) |
| `PUT` | `/api/v1/admin/plans/:id` | Subscriptions page (edit / toggle) |
| `DELETE` | `/api/v1/admin/plans/:id` | Subscriptions page (delete plan) |
| `GET` | `/api/v1/admin/users/:id/subscription` | User Details — Subscription tab |
| `GET` | `/api/v1/admin/users/:id/subscription/history` | User Details — Billing history |
| `PUT` | `/api/v1/admin/users/:id/subscription/:balanceId` | User Details — Subscription actions |
| `DELETE` | `/api/v1/admin/users/:id/postal-connections/:connectionId` | User Details — Disconnect operator |
