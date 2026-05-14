import { z } from 'zod';
import { DiscountType } from '../../../generated/prisma/enums.js';

export const ChangePlanSchema = z.object({
  planId: z.number().int().positive(),
});
export type ChangePlanDto = z.infer<typeof ChangePlanSchema>;

export const AdminDiscountSchema = z.object({
  amount: z.number().positive(),
  discountType: z.nativeEnum(DiscountType),
});
export type AdminDiscountDto = z.infer<typeof AdminDiscountSchema>;

export const AdminGetSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  plan: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});
export type AdminGetSubscriptionsQueryDto = z.infer<typeof AdminGetSubscriptionsQuerySchema>;
