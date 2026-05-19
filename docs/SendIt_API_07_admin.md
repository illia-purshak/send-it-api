# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Admin — Users
Admins view and manage CLIENT accounts. Cannot change passwords or impersonate users.

GET /admin/users
  params: plan(FREE|PRO|BUSINESS), status(UserStatus), search(companyName+email), sortBy, sortOrder, page, limit
  OUT 200: {data:[{id,email,status,companyName,plan,createdAt}],total,page,limit}

GET /admin/users/:id
  OUT 200: full user with nested profile, subscription, connections, supportTicketCount

PUT /admin/users/:id
  IN: {status:"ACTIVE"|"BANNED"|"INACTIVE"}
  OUT 200: updated user

# MODULE: Admin — Subscriptions
Admin overrides bypass normal next-period logic and take effect immediately.

GET /admin/subscriptions
  params: plan, status, search(companyName), page, limit
  OUT 200: paginated subscription list with user info

GET /admin/subscriptions/:id
  OUT 200: full subscription with user and plan details

PUT /admin/subscriptions/:id
  IN: {action, planId?, discountAmount?, discountType?}
  ACTIONS:
    changePlan    → requires planId, immediately switches plan (skips next-period logic)
    extend        → currentPeriodEnd += 1 month
    cancel        → force cancel, moves to FREE at period end
    setDiscount   → requires discountAmount + discountType(ONE_TIME|PERMANENT)
                    ONE_TIME: applied to next billing cycle then customAmount reset to null
  OUT 200: updated subscription

# MODULE: Admin — Support
Admins manage and respond to client support tickets.
Closed tickets are read-only for both sides.

GET /admin/support/tickets
  params: status(OPEN|CLOSED), search(subject+company), page, limit
  OUT 200: list of tickets with client info + last message preview

GET /admin/support/tickets/:id
  OUT 200: full ticket with complete message thread

PUT /admin/support/tickets/:id
  IN: {status:"CLOSED"}
  LOGIC: set ticket read-only for both client and admin
  OUT 200: updated ticket

POST /admin/support/messages
  IN: {ticketId, body}
  LOGIC: validate ticket is OPEN (→403 TICKET_CLOSED if not), create SupportMessage with adminId
  OUT 201: created message

# MODULE: Admin — Services
Manages postal operator catalogue. Determines which operators clients can connect to.
Deactivating operator does NOT disconnect existing user connections.

GET /admin/services
  OUT 200: {data:[{id,name,slug,logoUrl,isActive,createdAt}]}

GET /admin/services/:id
  OUT 200: full service object

POST /admin/services
  IN: {name, slug, logoUrl?}
  OUT 201: created service

PUT /admin/services/:id
  IN: {name?, logoUrl?, isActive?}
  OUT 200: updated service

DELETE /admin/services/:id
  LOGIC: allowed only if no active user connections exist for this service
  OUT 204
  ERR: 409 SERVICE_HAS_ACTIVE_CONNECTIONS

# MODULE: Admin — Admins
SUPER_ADMIN only. Regular ADMIN returns 403 on all endpoints here.

GET /admin/admins
  params: status, search(name+email), page, limit
  OUT 200: {data:[{id,email,firstName,lastName,role,status,invitedBy:{id,email},createdAt}]}

GET /admin/admins/:id
  OUT 200: full admin object

POST /admin/admins/invite
  IN: {email}
  LOGIC: check no active admin or pending invite for this email
         create AdminInvite(token, expiresAt=now()+7d)
         send invite email (when email service connected)
  OUT 201: {id,email,expiresAt}
  ERR: 409 already registered or pending invite

PUT /admin/admins/:id
  IN: {status:"ACTIVE"|"INACTIVE"}
  OUT 200: updated admin

DELETE /admin/admins/:id
  OUT 204
  ERR: 403 if trying to delete own account or another SUPER_ADMIN
