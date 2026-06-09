// Manual mock for otplib — prevents @scure/base (ESM-only) from loading in Jest's CJS environment
module.exports = {
  generateSecret: jest.fn().mockReturnValue('MOCK_TOTP_SECRET'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/mock?secret=MOCK_TOTP_SECRET'),
  verifySync: jest.fn().mockReturnValue(true),
};
