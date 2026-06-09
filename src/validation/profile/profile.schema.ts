import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  companyName: z.string().min(1).max(200).optional(),
  companyNameLat: z.string().min(1).max(200).optional(),
  ownershipForm: z.string().max(50).optional(),
  taxNumber: z.string().max(20).optional(),
  legalAddress: z.string().max(500).optional(),
  contactPersonName: z.string().max(200).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const UpdateSettingsSchema = z.object({
  language: z.enum(['uk', 'en']).optional(),
  timezone: z.string().min(1).max(100).optional(),
  dateFormat: z.string().min(1).max(30).optional(),
  notifications: z
    .object({
      subscription: z.boolean().optional(),
      postalConnection: z.boolean().optional(),
      system: z.boolean().optional(),
      email: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateSettingsDto = z.infer<typeof UpdateSettingsSchema>;
