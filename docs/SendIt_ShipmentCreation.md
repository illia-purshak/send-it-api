# SendIt — Shipment Creation Module

> Version 1.0 · 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Shipments Table](#2-shipments-table)
3. [Creation Form](#3-creation-form)
4. [Exit & Draft Flow](#4-exit--draft-flow)
5. [Draft Management](#5-draft-management)
6. [Duplicate Flow](#6-duplicate-flow)
7. [Save as Template](#7-save-as-template)
8. [Error Handling](#8-error-handling)
9. [Implementation Plan](#9-implementation-plan)

---

## 1. Overview

The shipment creation module covers the full lifecycle of creating a shipment — from the shipments list page through the creation form, draft saving, duplication, and template creation. Nova Poshta is the only real integration; Ukrposhta and Mist are stubs/mocks for future implementation.

**Data sources for the shipments table:**

| Source | Type | Description |
|--------|------|-------------|
| Nova Poshta API | Real | Fetched on mount via NP API using user's stored API key |
| Ukrposhta API | Mock / future | Stub data until real integration |
| Mist API | Mock / future | Stub data until real integration |
| SendIt DB | Real | Drafts only — stored locally, no TTN |

---

## 2. Shipments Table

### 2.1 Data fetching

- Data is fetched **on mount only** (no polling, no auto-refresh)
- Each connected operator is fetched independently and results are merged into a single list
- After creating a new shipment → redirect to `/shipments` + trigger **selective refresh** for the operator that was just used (not a full re-fetch of all operators)
- Manual refresh button available to re-fetch all operators on demand

### 2.2 Table structure

Single unified table. All operators mixed together, sorted by creation date descending (newest first) by default.

**Columns:**

| Column | Description |
|--------|-------------|
| TTN | Tracking number. `—` for drafts |
| Operator | Operator badge (logo + name). "Draft" badge for local drafts |
| Status | Normalized SendIt status badge (color-coded) |
| Recipient | Recipient name or organization |
| Created at | Creation date and time |
| Value | Declared value. `—` if absent |
| Actions | Action buttons (see 2.3) |

### 2.3 Filters

- **Operator** — filter by specific operator (Nova Poshta, Ukrposhta, Mist, Drafts) or show all
- **Status** — normalized SendIt statuses + `DRAFT`
- **TTN search** — text search by tracking number
- **Date range** — created from / to
- **Value range** — declared value from / to

> Additional filters may be added per operator during integration as each operator may expose additional filterable fields.

### 2.4 Row actions

| Action | Availability |
|--------|-------------|
| **View** (modal) | Always |
| **Edit** | `DRAFT`, `CREATED`, `PREPARING` only |
| **Cancel** | `DRAFT`, `CREATED`, `PREPARING` only (rules per operator, see `SendIt_Shipments.md`) |
| **Duplicate** | Always — all statuses including `DRAFT` |

### 2.5 Buttons above table

```
[+ Create shipment]    [Filters ▼]    [Search by TTN...]    [↻ Refresh]
```

---

## 3. Creation Form

### 3.1 Navigation to form

Clicking **"Create shipment"** navigates to `/shipments/new` (separate page, not a modal).

**Guard — no operators connected:**
- If user has no connected operators → do NOT redirect away
- Instead, show a **non-blocking banner** at the top of the form:
  ```
  "You have no connected postal operators.
   Connect an operator to create a shipment."
  [Go to profile →]
  ```
- User can still interact with the form and save as draft or template
- The **"Create shipment"** submit button is disabled — replaced with **"Save as draft"** and **"Save as template"** only

### 3.2 Operator selection

At the top of the form, operator selector buttons are displayed:

```
[ Nova Poshta ]   [ Ukrposhta ]   [ Mist ]
```

- **Connected + ACTIVE** → enabled, clickable
- **Connected + BLOCKED** → disabled, tooltip: *"Upgrade your plan to use this operator"*
- **Connected + INVALID** → disabled, tooltip: *"Reconnect this operator in your profile"*
- **Not connected** → disabled, tooltip: *"Connect this operator in your profile"*

Selecting an operator loads the corresponding form fields for that operator. Switching operator resets the form (with confirmation if fields are already filled).

### 3.3 Form fields

Form fields are **dynamic** — each operator has its own field set. Some fields are common across operators, others are operator-specific.

**Common fields (all operators):**

| Field | Description |
|-------|-------------|
| Recipient name | Full name or organization name |
| Recipient phone | Phone number |
| Recipient email | Optional |
| Delivery address / branch | Address or branch number depending on delivery type |
| Declared value | Estimated value of contents |
| Weight | Package weight |
| Description | Contents description |

**Operator-specific fields** are defined per operator during integration and rendered dynamically from a field config. Nova Poshta-specific fields will be documented separately once the API documentation is provided.

### 3.4 Prefilling form data

The form can be prefilled from three sources:

| Source | How triggered | Behavior |
|--------|--------------|----------|
| **Draft** | Opening a draft from `/shipments` table | Form opens with all previously saved fields. Operator is pre-selected but can be changed. |
| **Duplicate** | Clicking "Duplicate" on any shipment row | Form opens with relevant fields copied from the source shipment. TTN, dates, and status are excluded. |
| **Template** | *(future)* Selecting a template in the form | Form prefilled from saved template data. |

### 3.5 Form actions (bottom of form)

```
[Create shipment]   [Save as draft]   [Save as template]   [Cancel]
```

- **Create shipment** — disabled if no active operator selected or no operator connected
- **Save as draft** — always available, saves current form state to DB
- **Save as template** — always available, saves as reusable template (see section 7)
- **Cancel** — triggers exit confirmation modal (see section 4)

### 3.6 Successful creation

On successful `POST` to operator API:

1. Operator creates the shipment and returns TTN + initial status
2. SendIt stores metadata locally (TTN, operator, normalized status, `userId`)
3. Toast: *"Shipment created successfully"*
4. Redirect to `/shipments`
5. Selective refresh triggered for the used operator only

---

## 4. Exit & Draft Flow

### 4.1 When exit modal is triggered

The exit confirmation modal appears when:
- User clicks browser back button
- User clicks **"Cancel"** button in the form
- User attempts to navigate away (route change intercepted)

The modal is **not triggered** if the form is completely empty (no fields filled).

### 4.2 Exit modal options

```
┌─────────────────────────────────────────┐
│  Are you sure you want to leave?        │
│                                         │
│  Your progress will be lost.            │
│                                         │
│  [Continue editing]                     │
│  [Save as draft]                        │
│  [Leave without saving]                 │
└─────────────────────────────────────────┘
```

| Option | Behavior |
|--------|----------|
| **Continue editing** | Close modal, stay on form |
| **Save as draft** | Save current form state to DB → navigate away → toast: *"Draft saved"* |
| **Leave without saving** | Navigate away without saving anything |

---

## 5. Draft Management

### 5.1 What is a draft

A draft is an incomplete shipment form saved locally in SendIt's database. It has no TTN and has never been sent to any operator's API.

| Property | Value |
|----------|-------|
| Storage | SendIt DB (`ShipmentDraft` table) |
| TTN | None |
| Operator | Nullable — draft can exist without a selected operator |
| Status | `DRAFT` (displayed in shipments table) |
| Editable | Always |
| Deletable | Always |

### 5.2 Draft in the shipments table

Drafts appear in the unified shipments table alongside real shipments:
- Operator column shows **"Draft"** badge (neutral color)
- TTN column shows `—`
- Status column shows `DRAFT` badge
- All standard row actions available (view modal, edit, delete, duplicate)

### 5.3 Opening a draft

Clicking **"Edit"** on a draft row → navigates to `/shipments/new?draftId=<id>`

On load:
- Form fetches draft data by `draftId` from DB
- Operator is pre-selected (if was set when saved)
- All previously filled fields are restored
- User can change the operator, edit any field, submit as real shipment, re-save as draft, or save as template

### 5.4 Multiple drafts

A user can have multiple drafts simultaneously — each with its own `id`, each potentially for a different operator. There is no limit on the number of drafts.

### 5.5 Draft → real shipment

When a draft is submitted as a real shipment:
- Form sends request to operator API
- On success → draft record is **deleted** from DB
- New shipment appears in table (fetched from operator)

---

## 6. Duplicate Flow

### 6.1 What duplication does

Duplicate creates a **new prefilled form** based on an existing shipment's data. It works for all shipments regardless of status — including drafts and delivered shipments.

Only **form-relevant fields** are copied. Fields that belong to the shipment's history (TTN, timestamps, status, operator-assigned IDs) are excluded.

### 6.2 Duplication by source type

**From a real shipment (has TTN):**
- Fetch shipment details from operator API
- Extract only form-relevant fields (recipient, weight, declared value, delivery type, etc.)
- Open `/shipments/new` with these fields prefilled
- Operator is pre-selected to match the source shipment's operator

**From a draft (no TTN):**
- Fetch draft data from SendIt DB by `draftId`
- Open `/shipments/new` with draft fields prefilled
- This creates a new independent form session — does not modify the original draft

### 6.3 Duplication entry points

- **Row action button** in the shipments table
- **"Duplicate"** button inside the shipment view modal

---

## 7. Save as Template

### 7.1 Overview

> **Note:** Full template management (`/templates` page) is a separate upcoming module. This section describes only the "Save as template" action available within the creation form.

A template is a named reusable preset of form fields. Unlike a draft, a template is not a "work in progress" — it is an intentionally saved configuration for repeated use (e.g. standard shipment to a regular client).

### 7.2 Saving a template from the form

Clicking **"Save as template"** in the form:
1. Opens a small modal asking for a **template name**
2. On confirm → saves current form state as a `ShipmentTemplate` record in DB
3. Toast: *"Template saved"*
4. User stays on the form (saving a template does not navigate away)

### 7.3 Using templates (future)

When the templates module is implemented, users will be able to select a saved template at the top of the creation form to prefill all fields. This will be documented in `SendIt_Templates.md`.

---

## 8. Error Handling

### 8.1 INVALID connection error during creation

If the operator returns an authorization error when the user attempts to create a shipment:

1. SendIt catches the auth error from the operator API
2. Updates `UserPostalConnection.status` → `INVALID` (see `SendIt_PostalConnections.md`)
3. Creates a `SYSTEM` notification for the user
4. Returns `CONNECTION_INVALID` error to the frontend
5. Frontend shows an inline error on the form:
   ```
   "Your Nova Poshta connection is no longer valid.
    Please reconnect your API key to continue."
   [Reconnect in profile →]
   ```
6. Submit button is disabled until user reconnects

### 8.2 General operator API errors

| Error type | User-facing message |
|------------|---------------------|
| Connection timeout | *"Could not reach Nova Poshta. Please try again."* |
| Validation error from operator | Show operator's error message inline on the relevant field |
| Unknown operator error | *"An error occurred while creating the shipment. Please try again."* |

### 8.3 No operator connected (on form load)

- Non-blocking banner shown (see section 3.1)
- "Create shipment" button disabled
- "Save as draft" and "Save as template" remain available

---

## 9. Implementation Plan

### 9.1 Backend

#### Database

- [ ] Add `ShipmentDraft` model to Prisma schema:
  ```prisma
  model ShipmentDraft {
    id              Int       @id @default(autoincrement())
    userId          Int
    postalServiceId Int?      // nullable — draft may have no operator selected
    formData        Json      // all filled form fields
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    user          User           @relation(...)
    postalService PostalService? @relation(...)

    @@index([userId])
  }
  ```

#### Shipments Module — Endpoints

**Fetching shipments:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/shipments` | Fetch all shipments for current user across all connected operators + drafts from DB. Supports filters: operator, status, TTN, date range, value range. |
| `GET` | `/shipments/nova-poshta` | Fetch shipments from Nova Poshta API only (used for selective refresh after creation) |
| `GET` | `/shipments/drafts` | Fetch all drafts for current user from DB |
| `GET` | `/shipments/drafts/:id` | Fetch specific draft by ID |

**Creating shipments:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/shipments/nova-poshta` | Create shipment via Nova Poshta API. On success → store TTN + metadata locally. On auth error → mark connection `INVALID`. |
| `POST` | `/shipments/ukrposhta` | *(future / mock)* |
| `POST` | `/shipments/mist` | *(future / mock)* |

**Drafts:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/shipments/drafts` | Save new draft |
| `PUT` | `/shipments/drafts/:id` | Update existing draft |
| `DELETE` | `/shipments/drafts/:id` | Delete draft (called after successful shipment creation) |

**Duplicate:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/shipments/nova-poshta/:ttn/duplicate-data` | Fetch shipment from NP API and return only form-relevant fields for prefilling |
| `GET` | `/shipments/drafts/:id/duplicate-data` | Return draft fields formatted for form prefilling |

#### Nova Poshta integration

> Full field mapping and request/response structure will be documented separately once Nova Poshta API documentation is provided.

- [ ] `NovaPoshtaShipmentService`:
  - `createShipment(userId, formData)` — build NP API request body from form data, send to NP API, parse response, store TTN + metadata
  - `getShipments(userId)` — fetch all shipments for user's NP account
  - `getShipmentForDuplicate(ttn)` — fetch single shipment and extract form-relevant fields
  - Handle NP-specific error format (`{ success: false, errorCodes: [...] }`)
  - On auth error → call `PostalConnectionsService.markAsInvalid()`

---

### 9.2 Frontend

#### Pages & routing

- [ ] `/shipments` — shipments list page
- [ ] `/shipments/new` — creation form (with optional `?draftId=<id>` query param for draft restore)

#### Components

**`/shipments` page:**
- [ ] `<ShipmentsTable />` — unified table with filters, pagination, row actions
- [ ] `<ShipmentViewModal />` — quick view modal on row click, includes Duplicate button
- [ ] `<RefreshButton />` — manual re-fetch all operators

**`/shipments/new` page:**
- [ ] `<OperatorSelector />` — operator buttons (active / disabled states)
- [ ] `<NoOperatorBanner />` — shown when no operators connected (non-blocking)
- [ ] `<DynamicShipmentForm />` — renders field set based on selected operator
- [ ] `<ExitConfirmationModal />` — 3-option modal (continue / save draft / leave)
- [ ] `<SaveAsTemplateModal />` — name input modal triggered by "Save as template" button

#### Route guard & navigation interception

- [ ] Intercept browser back button and route changes while form has unsaved data → trigger `<ExitConfirmationModal />`
- [ ] On `?draftId` query param present → fetch draft on mount and prefill form

#### State management

- [ ] `shipmentFormStore` — holds current form state, selected operator, `draftId` (if editing draft), `isDirty` flag
- [ ] `isDirty` flag — set to `true` when any field is changed, used to decide whether to show exit modal
- [ ] On successful creation → invalidate `/shipments` cache for the used operator only (selective refresh)

#### UX details

- [ ] Switching operator after fields are filled → show confirmation: *"Switching operator will reset the form. Continue?"*
- [ ] "Save as draft" in exit modal → show loading state, then navigate away only after save is confirmed
- [ ] Draft restored from `?draftId` → show subtle notice: *"Editing draft"* near form title
- [ ] After duplication → show subtle notice: *"Form prefilled from existing shipment"*

---

*— End of document —*
