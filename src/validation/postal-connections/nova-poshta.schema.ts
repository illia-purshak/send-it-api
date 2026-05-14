import { z } from 'zod';

export const NovaPoshtaKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});
export type NovaPoshtaKeyDto = z.infer<typeof NovaPoshtaKeySchema>;
