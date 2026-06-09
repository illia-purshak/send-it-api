import { z } from 'zod';

export const SaveCardSchema = z
  .object({
    cardNumber: z.string().regex(/^\d{13,19}$/),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(new Date().getFullYear()),
    cardholderName: z.string().trim().min(1).max(100),
  })
  .transform((d) => ({
    cardNumber: d.cardNumber,
    lastFour: d.cardNumber.slice(-4),
    expiryMonth: d.expiryMonth,
    expiryYear: d.expiryYear,
    cardholderName: d.cardholderName,
  }));
export type SaveCardDto = z.infer<typeof SaveCardSchema>;

export const BillingHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type BillingHistoryQueryDto = z.infer<typeof BillingHistoryQuerySchema>;
