import { z } from 'zod';

export const SaveTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  postalServiceId: z.number().int().positive().optional(),
  templateData: z.record(z.string(), z.unknown()),
});

export type SaveTemplateDto = z.infer<typeof SaveTemplateSchema>;
