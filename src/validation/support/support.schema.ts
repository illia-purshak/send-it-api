import { z } from 'zod';

export const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  category: z.enum(['QUESTION', 'TECHNICAL', 'BILLING', 'SUGGESTION', 'OTHER']),
  body: z.string().min(1).max(5000),
});
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;

export const PostMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type PostMessageDto = z.infer<typeof PostMessageSchema>;

export const ListTicketsQuerySchema = z.object({
  status: z.enum(['WAITING', 'IN_PROGRESS', 'CLOSED', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListTicketsQueryDto = z.infer<typeof ListTicketsQuerySchema>;
