import { z } from 'zod';

export const UpdateAdminProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateAdminProfileDto = z.infer<typeof UpdateAdminProfileSchema>;

export const UpdateAdminSettingsSchema = z.object({
  language: z.enum(['uk', 'en']).optional(),
  timezone: z.string().min(1).max(100).optional(),
  dateFormat: z.string().min(1).max(30).optional(),
});
export type UpdateAdminSettingsDto = z.infer<typeof UpdateAdminSettingsSchema>;
