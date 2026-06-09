import { z } from 'zod';

export const AdminListAdminsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListAdminsQueryDto = z.infer<typeof AdminListAdminsQuerySchema>;

export const AdminInviteAdminSchema = z.object({
  email: z.string().email(),
});
export type AdminInviteAdminDto = z.infer<typeof AdminInviteAdminSchema>;

export const AdminUpdateAdminSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type AdminUpdateAdminDto = z.infer<typeof AdminUpdateAdminSchema>;
