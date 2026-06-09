import { z } from 'zod';

export const AdminListTicketsQuerySchema = z.object({
  status: z.enum(['WAITING', 'IN_PROGRESS', 'CLOSED', 'all']).default('all'),
  category: z.enum(['QUESTION', 'TECHNICAL', 'BILLING', 'SUGGESTION', 'OTHER']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListTicketsQueryDto = z.infer<typeof AdminListTicketsQuerySchema>;

export const AdminListMyTicketsQuerySchema = z.object({
  status: z.enum(['WAITING', 'IN_PROGRESS', 'CLOSED', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type AdminListMyTicketsQueryDto = z.infer<typeof AdminListMyTicketsQuerySchema>;

export const AdminTicketActionSchema = z.object({
  action: z.enum(['assign', 'leave', 'close']),
});
export type AdminTicketActionDto = z.infer<typeof AdminTicketActionSchema>;

export const AdminPostMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type AdminPostMessageDto = z.infer<typeof AdminPostMessageSchema>;
