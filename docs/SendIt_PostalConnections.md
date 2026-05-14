# SendIt — Postal Connections

> Version 1.0 · 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Connection Statuses](#2-connection-statuses)
3. [Uniqueness Rule](#3-uniqueness-rule)
4. [Connection Flow](#4-connection-flow)
5. [INVALID Status — Revoked Key Handling](#5-invalid-status--revoked-key-handling)
6. [Operator-Specific Notes](#6-operator-specific-notes)
7. [API Endpoints](#7-api-endpoints)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Overview

Postal Connections is the module responsible for linking a client's account to external postal operators (Nova Poshta, Ukrposhta, Mist, etc.) via API keys. SendIt stores these keys and uses them to perform operations on the operator's behalf — creating shipments, fetching statuses, and so on.

**Key principles:**
- Each user can have **at most one connection per operator** at any time
- The number of **active** connections is limited by the user's subscription plan (`maxOperators`)
- A connection is considered valid as soon as the API key is received from the operator — no additional verification request is made at connect time
- Key validity is discovered **lazily** during real operations (e.g. creating a shipment). If the key was revoked after connecting, the connection is automatically marked `INVALID`

---

## 2. Connection Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Connected and operational. Can be used for all operations. |
| `BLOCKED` | Blocked due to subscription downgrade. The connection and API key are preserved but cannot be used until the user upgrades or selects this operator as their active one. |
| `INVALID` | API key was revoked by the operator after a successful connection. Detected lazily on the next operation attempt. |

**What happens to non-ACTIVE connections:**
- `BLOCKED` — preserved in DB, API key intact, restored automatically on upgrade
- `INVALID` — preserved in DB so the user can see which operator needs reconnection. User must `PUT` a new key to restore it to `ACTIVE`

> There is no `DISCONNECTED` status. When a user manually removes a connection, the record is **deleted** from the database entirely. When a `PUT` is issued (key update), the existing record is overwritten regardless of its current status.

---

## 3. Uniqueness Rule

A user can have **exactly one record per operator** in `UserPostalConnection`. This is enforced by the `@@unique([userId, postalServiceId])` constraint in the database.

**Consequences:**
- `POST` to connect an operator that already has a record (any status) → returns `409 CONFLICT`. Client must use `PUT` to update.
- `PUT` overwrites the existing record (key + status reset to `ACTIVE`) regardless of whether the old record was `ACTIVE`, `BLOCKED`, or `INVALID`
- This means there can never be two Nova Poshta connections for the same user — not even one active and one inactive

---

## 4. Connection Flow

### 4.1 Connecting a new operator (POST)

```
User submits API key
        │
        ▼
Does a connection record already exist for this operator?
        │
   yes ─┴─ no
   │              │
   ▼              ▼
Return          Check subscription limit:
409 CONFLICT    activeConnections.count < plan.maxOperators?
(use PUT)               │
                   no ──┴── yes
                   │              │
                   ▼              ▼
             Return            Save connection
             403               status: ACTIVE
             OPERATOR_         apiKey: <provided key>
             LIMIT_REACHED     connectedAt: now()
             (frontend opens       │
             Upsell modal)         ▼
                             Return 201 CREATED
                             (key received = valid by definition)
```

### 4.2 Updating an existing key (PUT)

```
User submits new API key
        │
        ▼
Find existing connection record (any status)
        │
   not found ──┴── found
   │                    │
   ▼                    ▼
Return             Overwrite record:
404                apiKey: <new key>
NOT_FOUND          status: ACTIVE
(use POST)         updatedAt: now()
                        │
                        ▼
                   Return 200 OK
```

### 4.3 Disconnecting (DELETE)

```
User clicks "Disconnect"
        │
        ▼
Is this the only ACTIVE connection and user has shipments?
        │                           (optional UX warning)
        ▼
Delete record from DB entirely
        │
        ▼
Return 204 NO CONTENT
```

---

## 5. INVALID Status — Revoked Key Handling

A key can be revoked by the operator at any time after a successful connection (e.g. user regenerated their key in Nova Poshta's cabinet). SendIt has no way to detect this proactively — it is discovered **lazily** when an operation is attempted.

### 5.1 Detection flow

```
Any operation using the connection
(create shipment, fetch shipment status, etc.)
        │
        ▼
Request sent to operator API
        │
   success ──┴── authorization error (401/403 from operator)
   │                        │
   ▼                        ▼
Continue normally    Update UserPostalConnection:
                     status: INVALID
                          │
                          ▼
                     Create Notification for user:
                     type: SYSTEM
                     "Your Nova Poshta connection is no longer valid.
                      Please reconnect."
                          │
                          ▼
                     Return error to client:
                     CONNECTION_INVALID
```

### 5.2 User-facing behavior when INVALID

- Connection appears in profile with `INVALID` badge
- All action buttons disabled except **"Update key"** (triggers `PUT` flow)
- Toast shown when user lands on profile: *"Your Nova Poshta connection requires attention"*
- Notification created in `/notifications`

### 5.3 Important distinction

| Scenario | Result |
|----------|--------|
| User provides a wrong key on `POST`/`PUT` | Operator API returns error → connection is **not saved** → return `400 INVALID_API_KEY` to client |
| Key was valid at connect time, later revoked by operator | Discovered on next operation → status set to `INVALID` automatically |

---

## 6. Operator-Specific Notes

### 6.1 Nova Poshta (implemented)

- **Auth mechanism:** API key passed as `apiKey` field in request body (Nova Poshta JSON API v2)
- **What is stored:** API key only (`apiKey` field in `UserPostalConnection`)
- **Test environment:** connected to Nova Poshta sandbox/test environment
- **Authorization error codes to catch:** HTTP 200 with `success: false` and `errorCodes` containing auth-related errors (Nova Poshta uses 200 for all responses, errors are in the body)

> Nova Poshta does not use standard HTTP error codes — all responses return HTTP 200. Auth errors must be detected by parsing the response body: `{ success: false, errorCodes: ["..."] }`.

### 6.2 Ukrposhta (future)

- To be implemented when integration is added
- Analogous `POST /postal-connections/ukrposhta`, `PUT`, `DELETE` endpoints

### 6.3 Mist (future)

- To be implemented when integration is added
- Analogous endpoints

> Each operator gets its own set of endpoints and its own connection handler. Shared logic (status management, limit checks, INVALID detection) lives in a common `PostalConnectionsService`.

---

## 7. API Endpoints

### Client endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/postal-connections` | Get all connections for the current user (all statuses) |
| `POST` | `/postal-connections/nova-poshta` | Connect Nova Poshta with provided API key |
| `PUT` | `/postal-connections/nova-poshta` | Update (overwrite) Nova Poshta API key — resets status to `ACTIVE` |
| `DELETE` | `/postal-connections/nova-poshta` | Remove Nova Poshta connection entirely |
| `POST` | `/postal-connections/ukrposhta` | *(future)* Connect Ukrposhta |
| `PUT` | `/postal-connections/ukrposhta` | *(future)* Update Ukrposhta key |
| `DELETE` | `/postal-connections/ukrposhta` | *(future)* Remove Ukrposhta connection |
| `POST` | `/postal-connections/mist` | *(future)* Connect Mist |
| `PUT` | `/postal-connections/mist` | *(future)* Update Mist key |
| `DELETE` | `/postal-connections/mist` | *(future)* Remove Mist connection |

### GET /postal-connections — Response shape

```typescript
{
  connections: [
    {
      id: number,
      postalService: {
        id: number,
        name: string,       // "Nova Poshta"
        slug: string,       // "nova-poshta"
        logoUrl: string | null
      },
      status: "ACTIVE" | "BLOCKED" | "INVALID",
      connectedAt: string,  // ISO datetime
      updatedAt: string     // ISO datetime
      // apiKey is never returned to the client
    }
  ]
}
```

> The `apiKey` is **never** returned in any response. It is write-only — stored encrypted in the database and used only server-side for operator API calls.

---

## 8. Implementation Plan

### 8.1 Backend

#### Database

- [ ] Rename `isActive: Boolean` field in `UserPostalConnection` to `status: PostalConnectionStatus` enum (`ACTIVE` | `BLOCKED` | `INVALID`)
- [ ] Add `PostalConnectionStatus` enum to Prisma schema
- [ ] Ensure `@@unique([userId, postalServiceId])` constraint exists (already in schema)
- [ ] API key must be **encrypted** (not hashed) in DB — it must be decryptable for use in operator API calls. Use AES-256 or equivalent symmetric encryption. Store encryption key in environment variables.

#### PostalConnectionsService (shared logic)

- [ ] `getConnectionsForUser(userId)` — fetch all connections with postal service details, exclude `apiKey` from response
- [ ] `checkOperatorLimit(userId)` — count `ACTIVE` connections vs `plan.maxOperators`, return `canAdd: boolean`
- [ ] `markAsInvalid(userId, postalServiceId)` — set status to `INVALID`, create `SYSTEM` notification
- [ ] `blockConnections(userId, keepConnectionId)` — set status to `BLOCKED` for all connections except the kept one (called on downgrade)
- [ ] `unblockConnections(userId)` — set all `BLOCKED` connections back to `ACTIVE` (called on upgrade)
- [ ] `encryptKey(apiKey)` / `decryptKey(encryptedKey)` — symmetric encryption helpers

#### Nova Poshta integration

- [ ] `NovaPoshtaConnectionHandler` — handles `POST` and `PUT` for Nova Poshta:
  - Validate that the provided key is a non-empty string
  - Check `@@unique` — if record exists on `POST` → return `409`
  - Check `checkOperatorLimit` on `POST` → if exceeded → return `403 OPERATOR_LIMIT_REACHED`
  - Encrypt key and upsert `UserPostalConnection` record with `status: ACTIVE`
- [ ] `NovaPoshtaApiClient` — wrapper around Nova Poshta JSON API v2:
  - Parses `{ success: false, errorCodes: [...] }` responses
  - On auth error → calls `markAsInvalid(userId, novaPoshtaServiceId)`
  - All outbound requests use decrypted key from `UserPostalConnection`

#### Error codes returned to client

| Code | HTTP | Description |
|------|------|-------------|
| `OPERATOR_LIMIT_REACHED` | 403 | Active connections at plan limit |
| `CONNECTION_ALREADY_EXISTS` | 409 | Use PUT to update existing connection |
| `CONNECTION_NOT_FOUND` | 404 | No connection found for this operator (use POST) |
| `INVALID_API_KEY` | 400 | Operator rejected the key at connect/update time |
| `CONNECTION_INVALID` | 422 | Key was revoked — detected during operation |

---

### 8.2 Frontend

#### `/profile` — Postal operators block

- [ ] Fetch all connections via `GET /postal-connections` on profile load
- [ ] For each `PostalService` in the system (from `GET /postal-connections/available` or seeded list):
  - If connected → show status badge + "Update key" + "Disconnect" buttons
  - If not connected → show "Connect" button → opens `<ConnectOperatorModal />`
- [ ] `ACTIVE` badge — green
- [ ] `BLOCKED` badge — gray + "Upgrade to activate" label + click → Upsell modal
- [ ] `INVALID` badge — red + "Update key" button → opens `<ConnectOperatorModal />` in update mode

#### `<ConnectOperatorModal />`

- [ ] Input field for API key (masked, type="password")
- [ ] Link to where user can find their API key (operator's cabinet)
- [ ] On submit → `POST` (new) or `PUT` (update) request
- [ ] Success → close modal, refresh connections, show toast: *"Nova Poshta connected successfully"*
- [ ] Error `INVALID_API_KEY` → show inline error: *"The API key was rejected by Nova Poshta. Please check and try again."*
- [ ] Error `OPERATOR_LIMIT_REACHED` → close modal, open Upsell modal

#### Global INVALID interceptor

- [ ] Intercept `CONNECTION_INVALID` error code from any API response
- [ ] Show toast: *"Your [Operator] connection is no longer valid. Please update your API key."*
- [ ] Toast includes link to `/profile` operators block

---

*— End of document —*
