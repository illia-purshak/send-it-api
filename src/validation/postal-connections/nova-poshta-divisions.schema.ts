import { z } from 'zod';

export const NovaPoshtaDivisionsQuerySchema = z.object({
  countryCode: z.string().optional().default('UA'),
  divisionCategory: z.string().optional(),
  settlementId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type NovaPoshtaDivisionsQueryDto = z.infer<typeof NovaPoshtaDivisionsQuerySchema>;
