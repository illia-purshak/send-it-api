import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutDto = z.infer<typeof LogoutSchema>;

export const TwoFactorEnableSchema = z.object({
  totpCode: z.string().length(6),
});
export type TwoFactorEnableDto = z.infer<typeof TwoFactorEnableSchema>;

export const TwoFactorVerifySchema = z.object({
  pendingToken: z.string().min(1),
  totpCode: z.string().length(6),
});
export type TwoFactorVerifyDto = z.infer<typeof TwoFactorVerifySchema>;

export const CompleteProfileSchema = z.object({
  profileSetupToken: z.string().min(1),
  companyName: z.string().min(1).max(255),
  companyNameLat: z.string().max(255).optional(),
  edrpou: z.string().length(8),
  taxNumber: z.string().optional(),
  legalAddress: z.string().min(1).max(500),
  contactPersonName: z.string().max(255).optional(),
});
export type CompleteProfileDto = z.infer<typeof CompleteProfileSchema>;
