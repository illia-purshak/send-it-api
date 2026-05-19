import { z } from 'zod';

export const NovaPostRequestKeySchema = z.object({
  phone: z.string().min(9).max(15).regex(/^\d+$/),
});

export type NovaPostRequestKeyDto = z.infer<typeof NovaPostRequestKeySchema>;

export const NovaPostConnectSchema = z.object({
  apiKey: z.string().min(1),
});

export type NovaPostConnectDto = z.infer<typeof NovaPostConnectSchema>;
