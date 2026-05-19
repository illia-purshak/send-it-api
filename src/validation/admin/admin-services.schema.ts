import { z } from 'zod';

export const CreatePostalServiceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, and hyphens only'),
  logoUrl: z.string().url().optional(),
});
export type CreatePostalServiceDto = z.infer<typeof CreatePostalServiceSchema>;

export const UpdatePostalServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePostalServiceDto = z.infer<typeof UpdatePostalServiceSchema>;
