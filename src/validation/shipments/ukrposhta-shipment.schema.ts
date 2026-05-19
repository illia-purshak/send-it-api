import { z } from 'zod';

const phoneRegex = /^\d{9,15}$/;

export const CreateUkrposhtaShipmentSchema = z.object({
  sender: z.object({
    name: z.string().min(1),
    phone: z.string().regex(phoneRegex, 'Phone must be 9–15 digits'),
  }),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().regex(phoneRegex, 'Phone must be 9–15 digits'),
    address: z.string().min(1),
    city: z.string().min(1),
  }),
  weight: z.number().positive(),
  declaredValue: z.number().nonnegative(),
  description: z.string().optional(),
  draftId: z.number().int().positive().optional(),
});

export type CreateUkrposhtaShipmentDto = z.infer<typeof CreateUkrposhtaShipmentSchema>;
