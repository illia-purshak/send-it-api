# CONVENTIONS
AUTH: Bearer JWT in Authorization header on all endpoints except public auth routes.
OWNERSHIP: All user endpoints auto-filter by authenticated user ID.
REST: GET list, GET /:id, POST create, PUT /:id update, DELETE /:id delete — unless noted.
ERRORS: {"statusCode":N,"error":"CODE","message":"..."} 

# MODULE: Auth — User
Handles CLIENT registration, login, token lifecycle, password change, and TOTP 2FA.
JWT access token (short-lived) + refresh token stored in RefreshToken table.

POST /auth/register
  IN: {email, password, phone}
  LOGIC: validate unique email+phone, hash password, create User(status:ACTIVE) + UserCredentials
  OUT 201: {id, email, status}
  ERR: 409 email/phone exists

POST /auth/login
  IN: {email, password, totpCode?}
  totpCode required only if 2FA enabled. Missing → 403 TWO_FACTOR_REQUIRED
  LOGIC: validate creds, check status (rejects BANNED/DELETED past 30d/INACTIVE)
         DELETED within 30d → allow login, flag scheduledForDeletion:true in response
         validate TOTP if isEnabled
  OUT 200: {accessToken, refreshToken, user:{id,email,status,scheduledForDeletion}}
  ERR: 401 bad creds, 403 TWO_FACTOR_REQUIRED|ACCOUNT_BANNED|ACCOUNT_DELETED

POST /auth/refresh
  IN: {refreshToken}
  LOGIC: validate hash vs RefreshToken table, check revokedAt=null + expiresAt not passed, issue new accessToken
  OUT 200: {accessToken}
  ERR: 401 invalid/expired/revoked

POST /auth/logout
  IN: {refreshToken}
  LOGIC: set RefreshToken.revokedAt=now()
  OUT 204

PUT /auth/password
  IN: {currentPassword, newPassword}
  LOGIC: verify current hash, update UserCredentials.passwordHash, revoke all refresh tokens
  OUT 200: {message}
  ERR: 401 wrong currentPassword

POST /auth/2fa/setup
  IN: none (uses JWT identity)
  LOGIC: generate TOTP secret, do NOT save yet — return for scanning
  OUT 200: {qrCodeUrl, manualKey}

POST /auth/2fa/verify
  IN: {secret, totpCode}
  LOGIC: validate code vs secret, save encrypted secret to TwoFactorAuth, set isEnabled:true
  OUT 200: {message}
  ERR: 400 INVALID_TOTP_CODE

DELETE /auth/2fa
  IN: {totpCode}
  LOGIC: validate code vs stored secret, set isEnabled:false, clear secret
  OUT 204
  ERR: 400 INVALID_TOTP_CODE

# MODULE: Auth — Admin
Admins cannot self-register — invite-only via SUPER_ADMIN.
ADMIN role requires mandatory TOTP. SUPER_ADMIN does not.
Uses AdminRefreshToken table (separate from user tokens).

GET /admin/auth/invite/:token
  LOGIC: lookup AdminInvite by token, check usedAt=null + expiresAt not passed
  OUT 200: {email, valid:true}
  ERR: 404 not found, 410 INVITE_EXPIRED, 409 INVITE_ALREADY_USED

POST /admin/auth/register
  IN: {inviteToken, firstName, lastName, password}
  LOGIC: validate invite, create Admin(status:ACTIVE) + AdminCredentials, mark invite usedAt=now()
         ADMIN role → requiresTwoFactorSetup:true in response (frontend must redirect to /admin/onboarding/2fa-setup)
  OUT 201: {accessToken, refreshToken, admin:{id,role,requiresTwoFactorSetup}}

POST /admin/auth/login
  IN: {email, password, totpCode?}
  totpCode required for ADMIN (mandatory 2FA), not required for SUPER_ADMIN
  OUT 200: same shape as user login

POST /admin/auth/refresh
  LOGIC: same as user refresh but uses AdminRefreshToken
  OUT 200: {accessToken}

POST /admin/auth/logout
  OUT 204

PUT /admin/auth/password
  IN: {currentPassword, newPassword}
  OUT 200

POST /admin/auth/2fa/setup
  LOGIC: generate TOTP secret for admin onboarding — same as user setup
  OUT 200: {qrCodeUrl, manualKey}

POST /admin/auth/2fa/verify
  IN: {secret, totpCode}
  LOGIC: validate, save to AdminTwoFactorAuth, mark 2FA onboarding complete → admin can access dashboard
  OUT 200
