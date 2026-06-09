import { z } from 'zod';

export const AdminListUsersQuerySchema = z.object({
  plan: z.coerce.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED', 'DELETED']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListUsersQueryDto = z.infer<typeof AdminListUsersQuerySchema>;

export const AdminTestListUsersQuerySchema = z.object({
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminTestListUsersQueryDto = z.infer<typeof AdminTestListUsersQuerySchema>;

export const AdminUpdateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'BANNED', 'INACTIVE']),
});
export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;
