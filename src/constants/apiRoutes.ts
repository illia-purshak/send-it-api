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
  VALIDATE_INVITE: 'invite/:token',
  SET_PASSWORD: 'set-password',
  LOGIN: 'login',
  VERIFY_2FA: 'verify-2fa',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
  TWO_FA_SETUP: '2fa/setup',
  TWO_FA_VERIFY_SETUP: '2fa/verify-setup',
  TWO_FA_ENABLE: '2fa/enable',
  TWO_FA_DISABLE: '2fa/disable',
} as const;

export const SUBSCRIPTION_ROUTES = {
  BASE: 'subscriptions',
  PLANS: 'plans',
  ME: 'me',
  BY_ID: ':id',
} as const;

export const ADMIN_SUBSCRIPTION_ROUTES = {
  BASE: 'admin/subscriptions',
  BY_ID: ':id',
} as const;

export const ADMIN_PLAN_ROUTES = {
  BASE: 'admin/plans',
  BY_ID: ':id',
} as const;

export const BILLING_ROUTES = {
  BASE: 'billing',
  CARD: 'card',
} as const;

export const POSTAL_ROUTES = {
  BASE: 'postal-connections',
  NOVA_POST_BASE: 'nova-post',
  NOVA_POST_REQUEST_KEY: 'request-key',
  NOVA_POST_CONNECT: 'connect',
  NOVA_POSHTA: 'nova-poshta',
  NOVA_POSHTA_DIVISIONS: 'nova-poshta/divisions',
  UKRPOSHTA: 'ukrposhta',
  MEEST: 'meest',
  MIST: 'mist',
} as const;

export const ONBOARDING_ROUTES = {
  BASE: 'onboarding',
  CHECKLIST: 'checklist',
} as const;

export const DRAFT_ROUTES = {
  BASE: 'drafts',
  BY_ID: ':id',
} as const;

export const SHIPMENT_ROUTES = {
  BASE: 'shipments',
  OPERATORS: 'operators',
  DETAIL_BY_OPERATOR_REF: ':operator/:ref',
  NOVA_POSHTA: 'nova-poshta',
  NOVA_POSHTA_DETAIL: 'nova-poshta/:ref',
  UKRPOSHTA: 'ukrposhta',
  UKRPOSHTA_DETAIL: 'ukrposhta/:ref',
  MEEST: 'meest',
  MEEST_DETAIL: 'meest/:ref',
  MIST: 'mist',
} as const;

export const TEMPLATE_ROUTES = {
  BASE: 'templates',
  BY_ID: ':id',
  INCREMENT_USAGE: ':id/increment-usage',
} as const;

export const PROFILE_ROUTES = {
  BASE: 'profile',
  SETTINGS: 'settings',
} as const;

export const USERS_ROUTES = {
  BASE: 'users',
  ME: 'me',
  ME_RESTORE: 'me/restore',
} as const;

export const ADMIN_PROFILE_ROUTES = {
  BASE: 'admin/profile',
  SETTINGS: 'settings',
} as const;

export const RECIPIENT_ROUTES = {
  BASE: 'recipients',
  BY_ID: ':id',
} as const;

export const NOTIFICATION_ROUTES = {
  BASE: 'notifications',
  BY_ID: ':id',
  UNREAD_COUNT: 'unread-count',
} as const;

export const ADMIN_USERS_ROUTES = {
  BASE: 'admin/users',
  BY_ID: ':id',
} as const;

export const ADMIN_SERVICES_ROUTES = {
  BASE: 'admin/services',
  BY_ID: ':id',
} as const;

export const ADMIN_STATISTICS_ROUTES = {
  BASE: 'admin/statistics',
} as const;

export const SUPPORT_ROUTES = {
  BASE: 'support',
  TICKETS: 'tickets',
  TICKET_BY_ID: 'tickets/:id',
  TICKET_MESSAGE: 'tickets/:id/message',
  TICKET_READ: 'tickets/:id/read',
} as const;

export const ADMIN_SUPPORT_ROUTES = {
  BASE: 'admin/support',
  TICKETS: 'tickets',
  TICKETS_MY: 'tickets/my',
  TICKET_BY_ID: 'tickets/:id',
  TICKET_MESSAGE: 'tickets/:id/message',
  TICKET_READ: 'tickets/:id/read',
} as const;

export const ADMIN_ADMINS_ROUTES = {
  BASE: 'admin/admins',
  BY_ID: ':id',
  INVITE: 'invite',
  RESEND_INVITE: ':id/resend-invite',
} as const;
