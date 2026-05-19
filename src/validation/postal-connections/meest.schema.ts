import { z } from 'zod';

export const MeestKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});
export type MeestKeyDto = z.infer<typeof MeestKeySchema>;
