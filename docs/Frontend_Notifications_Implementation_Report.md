# Frontend Notifications Implementation Report

## Summary
The backend notifications module is ready for frontend integration with a stable user-facing contract.

The frontend can now implement:
- notifications list page
- unread/all tab switching
- type filtering
- unread badge polling
- mark one as read
- mark all as read
- delete one notification
- bulk delete read notifications
- delete all notifications

Auth requirement:
- send Bearer JWT on every notifications request

## API Contract

### 1. List Notifications
`GET /notifications`

Query params:
- `tab`: `all` | `unread` (default `all`)
- `type`: `SUBSCRIPTION` | `POSTAL_CONNECTION` | `ACCOUNT` | `SYSTEM` | `SHIPMENT_STATUS`
- `page`: positive integer
- `limit`: positive integer, max `100`

Response:
```json
{
  "items": [
    {
      "id": 123,
      "type": "SUBSCRIPTION",
      "title": "Plan upgrade scheduled",
      "body": "Your plan will be upgraded to BUSINESS at the end of your billing period.",
      "isRead": false,
      "createdAt": "2026-05-17T10:00:00.000Z",
      "updatedAt": "2026-05-17T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Important:
- the list response uses the shared repo pagination shape: `items + meta`
- do not expect the old shape `{data,total,page,limit}`
- sorting is newest first by `createdAt`

### 2. Unread Count
`GET /notifications/unread-count`

Response:
```json
{
  "count": 4
}
```

Recommended frontend use:
- poll every 60 seconds for the header badge
- also refresh after mark-read, mark-all-read, delete, and bulk delete actions

### 3. Mark One as Read
`PUT /notifications/:id`

Response:
- returns the updated notification object

Behavior:
- backend always sets `isRead=true`
- no request body is required by the current controller implementation

### 4. Mark All as Read
`PUT /notifications`

Response:
```json
{
  "updated": 7
}
```

### 5. Delete One
`DELETE /notifications/:id`

Response:
- `204 No Content`

### 6. Bulk Delete
`DELETE /notifications`

Query params:
- `filter=read` deletes only read notifications
- no `filter` deletes all notifications for the current user

Response:
- `204 No Content`

## Notification Types
The frontend should treat these backend enum values as the source of truth:

- `SUBSCRIPTION`
- `POSTAL_CONNECTION`
- `ACCOUNT`
- `SYSTEM`
- `SHIPMENT_STATUS`

Recommended UI labels:
- `SUBSCRIPTION` → Subscription
- `POSTAL_CONNECTION` → Postal Connection
- `ACCOUNT` → Account
- `SYSTEM` → System
- `SHIPMENT_STATUS` → Shipment Status

Recommended filter values in UI:
- All types
- Subscription
- Postal connection
- Account
- System
- Shipment status

The request sent to backend should still use the enum values above.

## Preference Behavior
Notification preferences live under `PUT /profile/settings`.

Relevant fields:
```json
{
  "notifications": {
    "subscription": true,
    "postalConnection": true,
    "system": true,
    "email": false
  }
}
```

Behavior the frontend should know:
- `subscription`, `postalConnection`, and `system` now affect backend creation of in-app notifications
- `ACCOUNT` notifications are mandatory and cannot be disabled
- `email` is stored but currently has no delivery effect
- `SHIPMENT_STATUS` notifications follow the `system` preference

Recommended settings copy:
- do not show an editable toggle for account notifications
- if shown for transparency, render it disabled with explanatory text

## Recommended Frontend Flows

### Notifications Page
Recommended controls:
- tab switch: `All` / `Unread`
- type filter dropdown
- paginated list
- action: mark one as read
- action: delete one
- action: mark all as read
- action: delete all read
- action: delete all

Recommended empty states:
- no notifications at all
- no unread notifications
- no notifications for selected type filter

### Header Badge
Recommended behavior:
- load unread count on app bootstrap after auth is ready
- refresh every 60 seconds
- refresh immediately after any notification mutation
- if count is `0`, hide badge or show zero based on design system rules

### Optimistic Updates
Safe optimistic updates:
- mark one as read
- mark all as read
- delete one
- delete read

After optimistic update:
- revalidate unread count
- revalidate current page if needed

Be careful with:
- delete all, because pagination and empty-state transitions can change immediately

## Edge Cases
- `PUT /notifications/:id` can return `404` if the notification no longer exists
- `PUT /notifications/:id` and `DELETE /notifications/:id` can return `403` if the item does not belong to the current user
- after filtering, the current page can become empty after delete actions; frontend should move to previous page or reload page 1
- a notification can become auto-deleted after it has been read for more than 30 days
- shipment-status notifications are generated only when a cached shipment changes normalized status; users should not expect one for the first sync/import

## Acceptance Checklist
- notifications page loads with `tab=all&page=1&limit=25`
- unread tab loads with `tab=unread`
- type filter sends backend enum values
- list renders `items` and `meta`
- unread badge uses `/notifications/unread-count`
- mark one as read updates row state and badge
- mark all as read updates list state and badge
- delete one removes row and updates badge if needed
- delete read removes only read rows
- delete all requires frontend confirmation
- settings page explains that account notifications are mandatory
- settings page explains that email notification preference is stored but not active yet

## Backend Source of Truth
Relevant backend references:
- [src/module/user/notifications/notifications.controller.ts](/abs/path/C:/GitMain/SendIt-api-new-start/send-it-api/src/module/user/notifications/notifications.controller.ts:1)
- [src/module/user/notifications/notifications.service.ts](/abs/path/C:/GitMain/SendIt-api-new-start/send-it-api/src/module/user/notifications/notifications.service.ts:1)
- [src/validation/notifications/notification.schema.ts](/abs/path/C:/GitMain/SendIt-api-new-start/send-it-api/src/validation/notifications/notification.schema.ts:1)
- [docs/SendIt_API_06_content.md](/abs/path/C:/GitMain/SendIt-api-new-start/send-it-api/docs/SendIt_API_06_content.md:61)
- [docs/SendIt_API_02_profile.md](/abs/path/C:/GitMain/SendIt-api-new-start/send-it-api/docs/SendIt_API_02_profile.md:7)
