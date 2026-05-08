export const AUTH_ROUTES = {
  BASE: 'auth',
  REGISTER: 'register',
  LOGIN: 'login',
  REFRESH: 'refresh',
  FORGOT_PASSWORD: 'forgot-password',
  RESET_PASSWORD: 'reset-password',
  LOGOUT: 'logout',
  TWO_FA_SETUP: '2fa/setup',
  TWO_FA_ENABLE: '2fa/enable',
  TWO_FA_DISABLE: '2fa/disable',
  TWO_FA_VERIFY: '2fa/verify',
} as const;

export const ADMIN_AUTH_ROUTES = {
  BASE: 'admin/auth',
  ACCEPT_INVITE: 'accept-invite',
  LOGIN: 'login',
  VERIFY_2FA: 'verify-2fa',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
  TWO_FA_SETUP: '2fa/setup',
  TWO_FA_ENABLE: '2fa/enable',
  TWO_FA_DISABLE: '2fa/disable',
} as const;
