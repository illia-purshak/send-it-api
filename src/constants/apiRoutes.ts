export const AUTH_ROUTES = {
  BASE: 'auth',
  ME: 'me',
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
  COMPLETE_PROFILE: 'complete-profile',
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

export const SUBSCRIPTION_ROUTES = {
  BASE: 'subscriptions',
  PLANS: 'plans',
  ME: 'me',
  UPGRADE: 'upgrade',
  DOWNGRADE: 'downgrade',
  CANCEL: 'cancel',
  CANCEL_SCHEDULED: 'cancel-scheduled',
} as const;

export const ADMIN_SUBSCRIPTION_ROUTES = {
  BASE: 'admin/subscriptions',
} as const;

export const BILLING_ROUTES = {
  BASE: 'billing',
  HISTORY: 'history',
  CARD: 'card',
  CARD_BY_ID: 'card/:id',
} as const;

export const POSTAL_ROUTES = {
  BASE: 'postal-connections',
  NOVA_POST_BASE: 'nova-post',
  NOVA_POST_CONNECT: 'connect',
  NOVA_POSHTA: 'nova-poshta',
} as const;

export const ONBOARDING_ROUTES = {
  BASE: 'onboarding',
  CHECKLIST: 'checklist',
} as const;

export const SHIPMENT_ROUTES = {
  BASE: 'shipments',
  DETAIL_BY_OPERATOR_REF: ':operator/:ref',
  DRAFTS: 'drafts',
  DRAFT_BY_ID: 'drafts/:id',
  DRAFT_DUPLICATE: 'drafts/:id/duplicate-data',
  TEMPLATES: 'templates',
  TEMPLATE_BY_ID: 'templates/:id',
  NOVA_POST: 'nova-post',
  NOVA_POST_DUPLICATE: 'nova-post/:ttn/duplicate-data',
  UKRPOSHTA: 'ukrposhta',
  MIST: 'mist',
} as const;
