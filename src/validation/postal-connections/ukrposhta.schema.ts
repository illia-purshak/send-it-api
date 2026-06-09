import { z } from 'zod';

export const UkrposhtaKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});
export type UkrposhtaKeyDto = z.infer<typeof UkrposhtaKeySchema>;
