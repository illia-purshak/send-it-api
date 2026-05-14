import { z } from 'zod';

export const SaveCardSchema = z
  .object({
    cardNumber: z.string().regex(/^\d{13,19}$/).optional(),
    lastFour: z.string().regex(/^\d{4}$/).optional(),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(new Date().getFullYear()),
  })
  .refine(
    (d) => d.cardNumber !== undefined || d.lastFour !== undefined,
    { message: 'Either cardNumber or lastFour must be provided' },
  )
  .transform((d) => ({
    lastFour: d.cardNumber ? d.cardNumber.slice(-4) : d.lastFour!,
    expiryMonth: d.expiryMonth,
    expiryYear: d.expiryYear,
  }));
export type SaveCardDto = z.infer<typeof SaveCardSchema>;

export const BillingHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type BillingHistoryQueryDto = z.infer<typeof BillingHistoryQuerySchema>;
