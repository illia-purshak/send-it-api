import { z } from 'zod';

export const ConnectOperatorQuerySchema = z.object({
  operator: z.enum(['nova-post', 'ukrposhta', 'meest']),
});

export const ConnectOperatorBodySchema = z.object({
  apiKey: z.string().min(1),
});

export const UpdateConnectionKeySchema = z.object({
  apiKey: z.string().min(1),
});

export type ConnectOperatorQueryDto = z.infer<typeof ConnectOperatorQuerySchema>;
export type ConnectOperatorBodyDto = z.infer<typeof ConnectOperatorBodySchema>;
export type UpdateConnectionKeyDto = z.infer<typeof UpdateConnectionKeySchema>;
