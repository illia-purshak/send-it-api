import { z } from 'zod';

export const NovaPostConnectSchema = z.object({
  phone: z.string().min(9).max(15).regex(/^\d+$/),
});

export type NovaPostConnectDto = z.infer<typeof NovaPostConnectSchema>;
