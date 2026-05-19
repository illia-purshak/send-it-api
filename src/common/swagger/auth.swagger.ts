const stringField = (description: string, example?: string) => ({
  type: 'string',
  description,
  ...(example ? { example } : {}),
});

const messageResponse = (message: string) => ({
  type: 'object',
  properties: {
    message: stringField('Result message', message),
  },
});

export const registerBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', example: 'user@example.com' },
    password: stringField('Password with 8-128 characters', 'StrongPass123!'),
  },
};

export const registerResponseSchema = {
  type: 'object',
  properties: {
    requiresProfileCompletion: { type: 'boolean', example: true },
    profileSetupToken: stringField('Short-lived token to complete profile setup', 'eyJhbGciOi...'),
  },
};

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', example: 'user@example.com' },
    password: stringField('Account password', 'StrongPass123!'),
  },
};

export const refreshBodySchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: stringField('Refresh token', 'refresh_token_value'),
  },
};

export const forgotPasswordBodySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email', example: 'user@example.com' },
  },
};

export const resetPasswordBodySchema = {
  type: 'object',
  required: ['token', 'newPassword'],
  properties: {
    token: stringField('Password reset token', 'reset_token_value'),
    newPassword: stringField('New password with 8-128 characters', 'NewStrongPass123!'),
  },
};

export const logoutBodySchema = refreshBodySchema;

export const totpCodeBodySchema = {
  type: 'object',
  required: ['totpCode'],
  properties: {
    totpCode: stringField('6-digit TOTP code', '123456'),
  },
};

export const verify2faBodySchema = {
  type: 'object',
  required: ['pendingToken', 'totpCode'],
  properties: {
    pendingToken: stringField('Pending 2FA token', 'pending_token_value'),
    totpCode: stringField('6-digit TOTP code', '123456'),
  },
};

export const acceptInviteBodySchema = {
  type: 'object',
  required: ['token', 'password', 'firstName', 'lastName'],
  properties: {
    token: stringField('Admin invite token', 'invite_token_value'),
    password: stringField('Password with 8-128 characters', 'AdminPass123!'),
    firstName: stringField('Admin first name', 'Alex'),
    lastName: stringField('Admin last name', 'Stone'),
  },
};

export const setPasswordBodySchema = {
  type: 'object',
  required: ['token', 'password'],
  properties: {
    token: stringField('Admin invite token', 'invite_token_value'),
    password: stringField('Password with 8-128 characters', 'AdminPass123!'),
  },
};

export const setup2faWithTokenBodySchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: stringField('Admin invite token', 'invite_token_value'),
  },
};

export const verifySetup2faBodySchema = {
  type: 'object',
  required: ['token', 'secret', 'totpCode'],
  properties: {
    token: stringField('Admin invite token', 'invite_token_value'),
    secret: stringField('Raw TOTP secret from setup step', 'JBSWY3DPEHPK3PXP'),
    totpCode: stringField('6-digit TOTP code', '123456'),
  },
};

export const setPasswordResponseSchema = messageResponse('Password set. Proceed to 2FA setup.');

export const verifySetup2faResponseSchema = {
  type: 'object',
  properties: {
    accessToken: stringField('JWT access token', 'eyJhbGciOi...'),
    refreshToken: stringField('Refresh token', 'refresh_token_value'),
    admin: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 2 },
        email: { type: 'string', format: 'email', example: 'admin@sendit.com' },
        isSuperAdmin: { type: 'boolean', example: false },
      },
    },
  },
};

export const meResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    email: { type: 'string', format: 'email', nullable: true, example: 'user@example.com' },
    phoneNumber: { type: 'string', nullable: true, example: null },
    role: { type: 'string', example: 'CLIENT' },
    status: { type: 'string', example: 'INACTIVE' },
    profileCompleted: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    profile: {
      nullable: true,
      type: 'object',
      properties: {
        companyName: { type: 'string', example: 'Acme LLC' },
        companyNameLat: { type: 'string', nullable: true, example: null },
        edrpou: { type: 'string', example: '12345678' },
        taxNumber: { type: 'string', nullable: true, example: null },
        legalAddress: { type: 'string', example: 'Kyiv, Ukraine' },
        contactPersonName: { type: 'string', nullable: true, example: null },
      },
    },
  },
};

export const tokenPairResponseSchema = {
  type: 'object',
  properties: {
    accessToken: stringField('JWT access token', 'eyJhbGciOi...'),
    refreshToken: stringField('Refresh token', 'refresh_token_value'),
  },
};

export const twoFactorChallengeResponseSchema = {
  type: 'object',
  properties: {
    requires2FA: { type: 'boolean', example: true },
    pendingToken: stringField('Pending 2FA token', 'pending_token_value'),
  },
};

export const profileSetupRequiredResponseSchema = {
  type: 'object',
  properties: {
    requiresProfileCompletion: { type: 'boolean', example: true },
    profileSetupToken: stringField('Short-lived token to complete profile setup', 'eyJhbGciOi...'),
  },
};

export const adminSetupRequiredResponseSchema = {
  type: 'object',
  properties: {
    requiresSetup: { type: 'boolean', example: true },
    setupToken: stringField('Temporary setup token for first-time admin onboarding', 'eyJhbGciOi...'),
  },
};

export const loginResponseSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        requires2FA: { type: 'boolean', example: false },
        accessToken: stringField('JWT access token', 'eyJhbGciOi...'),
        refreshToken: stringField('Refresh token', 'refresh_token_value'),
      },
    },
    twoFactorChallengeResponseSchema,
    profileSetupRequiredResponseSchema,
  ],
};

export const adminLoginResponseSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        requires2FA: { type: 'boolean', example: false },
        accessToken: stringField('JWT access token', 'eyJhbGciOi...'),
        refreshToken: stringField('Refresh token', 'refresh_token_value'),
      },
    },
    twoFactorChallengeResponseSchema,
    adminSetupRequiredResponseSchema,
  ],
};

export const setup2faResponseSchema = {
  type: 'object',
  properties: {
    qrCodeUrl: stringField('Data URL for the QR code image', 'data:image/png;base64,iVBORw0...'),
    secret: stringField('Raw TOTP secret', 'JBSWY3DPEHPK3PXP'),
  },
};

export const acceptInviteResponseSchema = {
  type: 'object',
  properties: {
    setupToken: stringField('Temporary setup token for first-time admin onboarding', 'eyJhbGciOi...'),
  },
};

export const logoutResponseSchema = messageResponse('Logged out successfully');
export const forgotPasswordResponseSchema = messageResponse(
  'If this email is registered, a reset link has been sent.',
);
export const resetPasswordResponseSchema = messageResponse('Password reset successfully');
export const enable2faResponseSchema = messageResponse('2FA enabled successfully');
export const disable2faResponseSchema = messageResponse('2FA disabled successfully');

export const adminEnable2faResponseSchema = tokenPairResponseSchema;

export const badRequestErrorSchema = {
  type: 'object',
  properties: {
    message: {
      oneOf: [
        { type: 'string', example: 'Invalid reset token' },
        {
          type: 'array',
          items: { type: 'string' },
          example: ['email: Invalid email address'],
        },
      ],
    },
    error: stringField('Error label', 'Bad Request'),
    statusCode: { type: 'integer', example: 400 },
  },
};

export const unauthorizedErrorSchema = {
  type: 'object',
  properties: {
    message: stringField('Unauthorized error message', 'Invalid credentials'),
    error: stringField('Error label', 'Unauthorized'),
    statusCode: { type: 'integer', example: 401 },
  },
};

export const forbiddenErrorSchema = {
  type: 'object',
  properties: {
    message: stringField('Forbidden error message', 'Account setup incomplete. Please complete 2FA setup.'),
    error: stringField('Error label', 'Forbidden'),
    statusCode: { type: 'integer', example: 403 },
  },
};

export const conflictErrorSchema = {
  type: 'object',
  properties: {
    message: stringField('Conflict error message', 'Email already in use'),
    error: stringField('Error label', 'Conflict'),
    statusCode: { type: 'integer', example: 409 },
  },
};

export const completeProfileBodySchema = {
  type: 'object',
  required: ['profileSetupToken', 'companyName', 'edrpou', 'legalAddress'],
  properties: {
    profileSetupToken: stringField('Profile setup token from register or login', 'eyJhbGciOi...'),
    companyName: stringField('Legal company name', 'Acme LLC'),
    companyNameLat: { type: 'string', nullable: true, description: 'Company name in Latin characters', example: null },
    edrpou: stringField('8-digit EDRPOU code', '12345678'),
    taxNumber: { type: 'string', nullable: true, description: 'Tax number (IPN)', example: null },
    legalAddress: stringField('Legal address', 'Kyiv, Ukraine, 01001'),
    contactPersonName: { type: 'string', nullable: true, description: 'Primary contact person name', example: 'John Doe' },
  },
};
