import { z } from 'zod';

const RecipientAddressSchema = z.object({
  type: z.enum(['BRANCH', 'COURIER', 'PARCEL_LOCKER']),
  city: z.string().min(1),
  branchNumber: z.string().optional(),
  street: z.string().optional(),
  building: z.string().optional(),
  flat: z.string().optional(),
  postCode: z.string().optional(),
});

export const CreateRecipientSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION']).default('INDIVIDUAL'),
  companyName: z.string().min(1).max(200).optional(),
  ownershipForm: z.string().max(50).optional(),
  edrpou: z.string().max(10).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  patronymic: z.string().max(100).optional(),
  phone: z.string().min(1).max(20),
  email: z.string().email().optional(),
  note: z.string().max(500).optional(),
  address: RecipientAddressSchema.optional(),
});
export type CreateRecipientDto = z.infer<typeof CreateRecipientSchema>;

export const UpdateRecipientSchema = CreateRecipientSchema.partial();
export type UpdateRecipientDto = z.infer<typeof UpdateRecipientSchema>;

export const ListRecipientsQuerySchema = z.object({
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'lastName', 'companyName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListRecipientsQueryDto = z.infer<typeof ListRecipientsQuerySchema>;
