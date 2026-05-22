const BASE_URL = 'api/v1';

const API_ROUTES = {
  AUTH_ROUTES: {
    BASE: `${BASE_URL}/auth`,
    ME: `${BASE_URL}/auth/me`,
    REGISTER: `${BASE_URL}/auth/register`,
    LOGIN: `${BASE_URL}/auth/login`,
    REFRESH: `${BASE_URL}/auth/refresh`,
    FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    TWO_FA_SETUP: `${BASE_URL}/auth/2fa/setup`,
    TWO_FA_ENABLE: `${BASE_URL}/auth/2fa/enable`,
    TWO_FA_DISABLE: `${BASE_URL}/auth/2fa/disable`,
    TWO_FA_VERIFY: `${BASE_URL}/auth/2fa/verify`,
    COMPLETE_PROFILE: `${BASE_URL}/auth/complete-profile`,
  },
  ADMIN_AUTH_ROUTES: {
    BASE: `${BASE_URL}/admin/auth`,
    VALIDATE_INVITE: `${BASE_URL}/admin/auth/invite/:token`,
    SET_PASSWORD: `${BASE_URL}/admin/auth/set-password`,
    LOGIN: `${BASE_URL}/admin/auth/login`,
    VERIFY_2FA: `${BASE_URL}/admin/auth/verify-2fa`,
    REFRESH: `${BASE_URL}/admin/auth/refresh`,
    LOGOUT: `${BASE_URL}/admin/auth/logout`,
    TWO_FA_SETUP: `${BASE_URL}/admin/auth/2fa/setup`,
    TWO_FA_VERIFY_SETUP: `${BASE_URL}/admin/auth/2fa/verify-setup`,
    TWO_FA_ENABLE: `${BASE_URL}/admin/auth/2fa/enable`,
    TWO_FA_DISABLE: `${BASE_URL}/admin/auth/2fa/disable`,
  },
  SUBSCRIPTION_ROUTES: {
    BASE: `${BASE_URL}/subscriptions`,
    PLANS: `${BASE_URL}/subscriptions/plans`,
    ME: `${BASE_URL}/subscriptions/me`,
    BY_ID: `${BASE_URL}/subscriptions/:id`,
  },
  ADMIN_SUBSCRIPTION_ROUTES: {
    BASE: `${BASE_URL}/admin/subscriptions`,
    BY_ID: `${BASE_URL}/admin/subscriptions/:id`,
  },
  ADMIN_PLAN_ROUTES: {
    BASE: `${BASE_URL}/admin/plans`,
    BY_ID: `${BASE_URL}/admin/plans/:id`,
  },
  BILLING_ROUTES: {
    BASE: `${BASE_URL}/billing`,
    CARD: `${BASE_URL}/billing/card`,
  },
  POSTAL_ROUTES: {
    BASE: `${BASE_URL}/postal-connections`,
    NOVA_POST_BASE: `${BASE_URL}/postal-connections/nova-post`,
    NOVA_POST_REQUEST_KEY: `${BASE_URL}/postal-connections/nova-post/request-key`,
    NOVA_POST_CONNECT: `${BASE_URL}/postal-connections/nova-post/connect`,
    NOVA_POSHTA: `${BASE_URL}/postal-connections/nova-poshta`,
    NOVA_POSHTA_DIVISIONS: `${BASE_URL}/postal-connections/nova-poshta/divisions`,
    UKRPOSHTA: `${BASE_URL}/postal-connections/ukrposhta`,
    MEEST: `${BASE_URL}/postal-connections/meest`,
    MIST: `${BASE_URL}/postal-connections/mist`,
  },
  ONBOARDING_ROUTES: {
    BASE: `${BASE_URL}/onboarding`,
    CHECKLIST: `${BASE_URL}/onboarding/checklist`,
  },
  DRAFT_ROUTES: {
    BASE: `${BASE_URL}/drafts`,
    BY_ID: `${BASE_URL}/drafts/:id`,
  },
  SHIPMENT_ROUTES: {
    BASE: `${BASE_URL}/shipments`,
    OPERATORS: `${BASE_URL}/shipments/operators`,
    DETAIL_BY_OPERATOR_REF: `${BASE_URL}/shipments/:operator/:ref`,
    NOVA_POSHTA: `${BASE_URL}/shipments/nova-poshta`,
    NOVA_POSHTA_DETAIL: `${BASE_URL}/shipments/nova-poshta/:ref`,
    UKRPOSHTA: `${BASE_URL}/shipments/ukrposhta`,
    UKRPOSHTA_DETAIL: `${BASE_URL}/shipments/ukrposhta/:ref`,
    MEEST: `${BASE_URL}/shipments/meest`,
    MEEST_DETAIL: `${BASE_URL}/shipments/meest/:ref`,
    MIST: `${BASE_URL}/shipments/mist`,
  },
  TEMPLATE_ROUTES: {
    BASE: `${BASE_URL}/templates`,
    BY_ID: `${BASE_URL}/templates/:id`,
    INCREMENT_USAGE: `${BASE_URL}/templates/:id/increment-usage`,
  },
  PROFILE_ROUTES: {
    BASE: `${BASE_URL}/profile`,
    SETTINGS: `${BASE_URL}/profile/settings`,
  },
  USERS_ROUTES: {
    BASE: `${BASE_URL}/users`,
    ME: `${BASE_URL}/users/me`,
    ME_RESTORE: `${BASE_URL}/users/me/restore`,
  },
  ADMIN_PROFILE_ROUTES: {
    BASE: `${BASE_URL}/admin/profile`,
    SETTINGS: `${BASE_URL}/admin/profile/settings`,
  },
  RECIPIENT_ROUTES: {
    BASE: `${BASE_URL}/recipients`,
    BY_ID: `${BASE_URL}/recipients/:id`,
  },
  NOTIFICATION_ROUTES: {
    BASE: `${BASE_URL}/notifications`,
    BY_ID: `${BASE_URL}/notifications/:id`,
    UNREAD_COUNT: `${BASE_URL}/notifications/unread-count`,
  },
  ADMIN_USERS_ROUTES: {
    BASE: `${BASE_URL}/admin/users`,
    BY_ID: `${BASE_URL}/admin/users/:id`,
  },
  ADMIN_SERVICES_ROUTES: {
    BASE: `${BASE_URL}/admin/services`,
    BY_ID: `${BASE_URL}/admin/services/:id`,
  },
  ADMIN_STATISTICS_ROUTES: {
    BASE: `${BASE_URL}/admin/statistics`,
  },
  SUPPORT_ROUTES: {
    BASE: `${BASE_URL}/support`,
    TICKETS: `${BASE_URL}/support/tickets`,
    TICKET_BY_ID: `${BASE_URL}/support/tickets/:id`,
    TICKET_MESSAGE: `${BASE_URL}/support/tickets/:id/message`,
    TICKET_READ: `${BASE_URL}/support/tickets/:id/read`,
  },
  ADMIN_SUPPORT_ROUTES: {
    BASE: `${BASE_URL}/admin/support`,
    TICKETS: `${BASE_URL}/admin/support/tickets`,
    TICKETS_MY: `${BASE_URL}/admin/support/tickets/my`,
    TICKET_BY_ID: `${BASE_URL}/admin/support/tickets/:id`,
    TICKET_MESSAGE: `${BASE_URL}/admin/support/tickets/:id/message`,
    TICKET_READ: `${BASE_URL}/admin/support/tickets/:id/read`,
  },
  ADMIN_ADMINS_ROUTES: {
    BASE: `${BASE_URL}/admin/admins`,
    BY_ID: `${BASE_URL}/admin/admins/:id`,
    INVITE: `${BASE_URL}/admin/admins/invite`,
    RESEND_INVITE: `${BASE_URL}/admin/admins/:id/resend-invite`,
  },
} as const;

export const AUTH_ROUTES = API_ROUTES.AUTH_ROUTES;
export const ADMIN_AUTH_ROUTES = API_ROUTES.ADMIN_AUTH_ROUTES;
export const SUBSCRIPTION_ROUTES = API_ROUTES.SUBSCRIPTION_ROUTES;
export const ADMIN_SUBSCRIPTION_ROUTES = API_ROUTES.ADMIN_SUBSCRIPTION_ROUTES;
export const ADMIN_PLAN_ROUTES = API_ROUTES.ADMIN_PLAN_ROUTES;
export const BILLING_ROUTES = API_ROUTES.BILLING_ROUTES;
export const POSTAL_ROUTES = API_ROUTES.POSTAL_ROUTES;
export const ONBOARDING_ROUTES = API_ROUTES.ONBOARDING_ROUTES;
export const DRAFT_ROUTES = API_ROUTES.DRAFT_ROUTES;
export const SHIPMENT_ROUTES = API_ROUTES.SHIPMENT_ROUTES;
export const TEMPLATE_ROUTES = API_ROUTES.TEMPLATE_ROUTES;
export const PROFILE_ROUTES = API_ROUTES.PROFILE_ROUTES;
export const USERS_ROUTES = API_ROUTES.USERS_ROUTES;
export const ADMIN_PROFILE_ROUTES = API_ROUTES.ADMIN_PROFILE_ROUTES;
export const RECIPIENT_ROUTES = API_ROUTES.RECIPIENT_ROUTES;
export const NOTIFICATION_ROUTES = API_ROUTES.NOTIFICATION_ROUTES;
export const ADMIN_USERS_ROUTES = API_ROUTES.ADMIN_USERS_ROUTES;
export const ADMIN_SERVICES_ROUTES = API_ROUTES.ADMIN_SERVICES_ROUTES;
export const ADMIN_STATISTICS_ROUTES = API_ROUTES.ADMIN_STATISTICS_ROUTES;
export const SUPPORT_ROUTES = API_ROUTES.SUPPORT_ROUTES;
export const ADMIN_SUPPORT_ROUTES = API_ROUTES.ADMIN_SUPPORT_ROUTES;
export const ADMIN_ADMINS_ROUTES = API_ROUTES.ADMIN_ADMINS_ROUTES;
