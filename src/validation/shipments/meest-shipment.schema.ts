import { z } from 'zod';

const phoneRegex = /^\d{9,15}$/;

export const MeestTemplateDataSchema = z.object({
  sender: z
    .object({
      name: z.string().min(1),
      phone: z.string().regex(phoneRegex, 'Phone must be 9–15 digits'),
    })
    .partial()
    .optional(),
  recipient: z
    .object({
      name: z.string().min(1),
      phone: z.string().regex(phoneRegex, 'Phone must be 9–15 digits'),
      address: z.string().min(1),
      city: z.string().min(1),
    })
    .partial()
    .optional(),
  weight: z.number().positive().optional(),
  declaredValue: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

export const CreateMeestShipmentSchema = z.object({
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

export type CreateMeestShipmentDto = z.infer<typeof CreateMeestShipmentSchema>;
