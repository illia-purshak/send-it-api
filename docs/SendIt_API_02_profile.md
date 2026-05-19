# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Profile — User
Manages CLIENT organization data, app settings (language/timezone/dateFormat→DB, theme/pageSize→localStorage),
and notification preferences. Does NOT handle subscription, card, 2FA, operators, or account deletion.

GET /profile
  OUT 200: {id, email, phone, avatarUrl, profile:{companyName,companyNameLat,ownershipForm,edrpou,taxNumber,legalAddress,contactPersonName}, settings:{language,timezone,dateFormat}, notifications:{subscription,postalConnection,account,system,email}}

PUT /profile
  IN: any subset of editable fields (edrpou silently ignored)
  LOGIC: update User + UserProfile records
  OUT 200: updated profile object

PUT /profile/settings
  IN: {language?, timezone?, dateFormat?, notifications:{subscription?,postalConnection?,system?,email?}}
  LOGIC: update User fields. notifications.account silently ignored (cannot be disabled).
         subscription/postalConnection/system flags control in-app notification creation by category.
         notifEmail accepted but has no effect until email service is integrated.
  OUT 200: updated settings object

DELETE /users/me
  LOGIC: set User.status=DELETED, scheduledDeletionAt=now()+30d, revoke all refresh tokens
         creates ACCOUNT notification
  OUT 204

POST /users/me/restore
  LOGIC: set User.status=ACTIVE, clear scheduledDeletionAt, create ACCOUNT notification
  OUT 200: {message}
  ERR: 400 if not in DELETED status or 30d window passed

# MODULE: Profile — Admin
Simpler than client profile. No subscription, operators, or danger zone.

GET /admin/profile
  OUT 200: {id, email, firstName, lastName, role, avatarUrl, invitedBy:{id,firstName,lastName,email}|null, twoFactorEnabled, settings:{language,timezone,dateFormat}}
  NOTE: invitedBy is null for first SUPER_ADMIN

PUT /admin/profile
  IN: {firstName?, lastName?, avatarUrl?}
  NOTE: email is always read-only (tied to invite)
  OUT 200: updated profile

PUT /admin/profile/settings
  IN: {language?, timezone?, dateFormat?}
  OUT 200: updated settings

STORAGE RULES:
  DB (consistent across devices): language, timezone, dateFormat, notifSubscription, notifPostalConnection, notifAccount, notifSystem, notifEmail
  localStorage (UI only): sendit_theme (default:"light"), sendit_table_page_size (default:25)
