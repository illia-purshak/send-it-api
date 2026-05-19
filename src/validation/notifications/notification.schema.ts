import { z } from 'zod';
import { NotificationType } from '../../../generated/prisma/enums.js';

export const ListNotificationsQuerySchema = z.object({
  tab: z.enum(['unread', 'all']).default('all'),
  type: z.nativeEnum(NotificationType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListNotificationsQueryDto = z.infer<typeof ListNotificationsQuerySchema>;

export const BulkDeleteNotificationsQuerySchema = z.object({
  filter: z.enum(['read']).optional(),
});
export type BulkDeleteNotificationsQueryDto = z.infer<typeof BulkDeleteNotificationsQuerySchema>;
