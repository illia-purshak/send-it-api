# Frontend Report: User Details Page — Missing Administrative Controls

## Overview

All backend controls for the Admin User Details page are implemented. This report describes every available endpoint, request/response shapes, and UI integration notes.

The primary data-loading call is `GET /api/v1/admin/users/:id`, which returns a single enriched user object. All other endpoints on this page perform mutations or load supplemental data (history).

---

## 1. Load User Detail

```
GET /api/v1/admin/users/:id
```

Returns a single object:

```ts
{
  id: number;
  email: string | null;
  phoneNumber: string | null;
  role: 'CLIENT';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED';
  profileCompleted: boolean;
  avatarUrl: string | null;
  language: string;
  timezone: string;
  dateFormat: string;
  scheduledDeletionAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Company / contact info
  profile: {
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    // ...other profile fields
  } | null;

  // Subscription balances (all non-expired, ordered by position)
  subscriptionBalances: Array<{
    id: number;
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
    plan: { id: number; name: string; level: number; price: number; maxOperators: number; /* ... */ };
  }>;

  // Connected postal operators
  postalConnections: Array<{
    id: number;
    postalServiceId: number;
    status: 'ACTIVE' | 'BLOCKED' | 'INVALID';
    connectedAt: string;
    updatedAt: string;
    postalService: {
      id: number;
      name: string;
      slug: string;
      logoUrl: string | null;
    };
  }>;

  // Aggregate counts
  _count: { supportTickets: number };
}
```

**UI note:** Use this response to populate the entire user details page on first load — profile header, status badge, subscription card, and connections list. No additional calls are needed for the initial render.

---

## 2. Block / Unblock User

```
PUT /api/v1/admin/users/:id
```

Body:
```json
{ "status": "BANNED" }    // Block user
{ "status": "ACTIVE" }    // Unblock user
{ "status": "INACTIVE" }  // Deactivate without banning
```

Response:
```ts
{ id: number; email: string | null; status: string; updatedAt: string; }
```

**UI note:**
- Show a **Block** button when `user.status !== 'BANNED'` and an **Unblock** button when `user.status === 'BANNED'`.
- Both actions should use a confirmation dialog before sending.
- After success, update the status badge in place (no full page reload needed).

---

## 3. Postal Connections (Integrations)

### 3a. View (from detail response)

The `postalConnections[]` array is already included in `GET /admin/users/:id`.

Display as a list/table with columns: **Operator** (logo + name), **Status** badge, **Connected at**, **Actions**.

Status badge colors:
| Status | Color |
|--------|-------|
| `ACTIVE` | Green |
| `BLOCKED` | Yellow / Orange (over plan limit) |
| `INVALID` | Red (bad API key — user must reconnect) |

### 3b. Disconnect operator

```
DELETE /api/v1/admin/users/:id/postal-connections/:connectionId
```

Response: `{ "success": true }`

**UI note:** Show a **Disconnect** button per row. Require a confirmation dialog ("This will immediately remove the operator connection for this user."). On success, remove the row optimistically or refetch the detail.

---

## 4. Subscription Information

### 4a. Current subscriptions

The `subscriptionBalances[]` array in the detail response covers the initial render.

For a dedicated subscription tab that needs fresher data after mutations, use:

```
GET /api/v1/admin/users/:id/subscription
```

Returns the same array of non-expired `UserSubscriptionBalance` objects (with `plan` included), ordered by `position`.

**UI note:**
- `position: 0` is the currently active balance; higher positions are queued.
- Show the active balance prominently: plan name, price, period end date, status, autoRenew indicator.
- If `status === 'PAUSED'`, show `pausedAt` timestamp.
- If `scheduledSwitchTo` is set, show a "Scheduled plan change" notice.

### 4b. Apply admin action to a balance

```
PUT /api/v1/admin/users/:id/subscription/:balanceId
```

Body uses a discriminated `action` field:

| Action | Additional fields | Effect |
|--------|------------------|--------|
| `changePlan` | `planId: number` | Switch plan immediately; adjusts operator limits |
| `extend` | `days: number` | Add N days to `periodEnd` |
| `cancel` | — | Sets `autoRenew = false` |
| `setDiscount` | `amount: number`, `discountType: "ONE_TIME" \| "PERMANENT"` | Overrides price for next billing cycle(s) |
| `suspend` | — | Sets `status = PAUSED`, records `pausedAt` |
| `reactivate` | — | Sets `status = ACTIVE`, clears `pausedAt` |

Example bodies:
```json
{ "action": "suspend" }
{ "action": "reactivate" }
{ "action": "changePlan", "planId": 3 }
{ "action": "extend", "days": 30 }
{ "action": "cancel" }
{ "action": "setDiscount", "amount": 9.99, "discountType": "ONE_TIME" }
```

**Error cases:**
| Status | Trigger |
|--------|---------|
| `400` | `suspend` when not ACTIVE; `reactivate` when not PAUSED; `cancel` when already cancelled; `changePlan` with invalid/inactive planId |
| `404` | `balanceId` does not belong to this user |

**UI note for Change Plan:** populate the plan picker by calling `GET /api/v1/admin/plans?isActive=true&isPublic=true` to list available plans. Do not allow the admin to rename plans from here.

### 4c. Billing history

```
GET /api/v1/admin/users/:id/subscription/history?page=1&limit=20
```

Response:
```ts
{
  data: Array<{
    id: number;
    userId: number;
    planId: number;
    balanceId: number;
    periodType: 'MONTHLY' | 'YEARLY';
    amount: number;          // actual charged amount (after any discount)
    status: string;          // BillingStatus
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    createdAt: string;
    plan: { id: number; name: string; level: number; price: number; };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**UI note:** Render as a paginated table below the subscription card. Columns: Plan, Period, Amount, Status, Paid at.

---

## 5. Summary: All Endpoints for the User Details Page

| Method | Endpoint | Used for |
|--------|----------|----------|
| `GET` | `/api/v1/admin/users/:id` | Initial page load (profile + subscriptions + connections) |
| `PUT` | `/api/v1/admin/users/:id` | Block / Unblock / Deactivate |
| `GET` | `/api/v1/admin/users/:id/subscription` | Refresh subscription tab after mutations |
| `PUT` | `/api/v1/admin/users/:id/subscription/:balanceId` | All subscription actions (changePlan, extend, cancel, setDiscount, suspend, reactivate) |
| `GET` | `/api/v1/admin/users/:id/subscription/history` | Billing history tab (paginated) |
| `DELETE` | `/api/v1/admin/users/:id/postal-connections/:connectionId` | Force-disconnect a postal operator |
