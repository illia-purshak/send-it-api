import { z } from 'zod';

export const SetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});
export type SetPasswordDto = z.infer<typeof SetPasswordSchema>;

export const Setup2faWithTokenSchema = z.object({
  token: z.string().min(1),
});
export type Setup2faWithTokenDto = z.infer<typeof Setup2faWithTokenSchema>;

export const VerifySetup2faSchema = z.object({
  token: z.string().min(1),
  secret: z.string().min(1),
  totpCode: z.string().length(6),
});
export type VerifySetup2faDto = z.infer<typeof VerifySetup2faSchema>;

export const AdminLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;

export const AdminVerify2faSchema = z.object({
  pendingToken: z.string().min(1),
  totpCode: z.string().length(6),
});
export type AdminVerify2faDto = z.infer<typeof AdminVerify2faSchema>;

export const AdminRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type AdminRefreshDto = z.infer<typeof AdminRefreshSchema>;

export const AdminLogoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type AdminLogoutDto = z.infer<typeof AdminLogoutSchema>;

export const Admin2faCodeSchema = z.object({
  totpCode: z.string().length(6),
});
export type Admin2faCodeDto = z.infer<typeof Admin2faCodeSchema>;
