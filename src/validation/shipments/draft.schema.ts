import { z } from 'zod';

export const SaveDraftSchema = z.object({
  postalServiceId: z.number().int().positive().optional(),
  draftData: z.record(z.string(), z.unknown()),
});

export const UpdateDraftSchema = z.object({
  postalServiceId: z.number().int().positive().optional(),
  draftData: z.record(z.string(), z.unknown()),
});

export type SaveDraftDto = z.infer<typeof SaveDraftSchema>;
export type UpdateDraftDto = z.infer<typeof UpdateDraftSchema>;
