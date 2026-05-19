import { z } from 'zod';

const ShipmentTypeEnum = z.enum([
  'DOCUMENT',
  'PACKAGE',
  'BOX',
  'CARGO',
  'PALLET',
  'UNKNOWN',
]);

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  postalServiceId: z.number().int().positive().optional(),
  shipmentType: ShipmentTypeEnum.optional(),
  templateData: z.record(z.string(), z.unknown()),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  postalServiceId: z.number().int().positive().optional(),
  shipmentType: ShipmentTypeEnum.optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
});

export const ListTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  operator: z.string().trim().min(1).optional(),
  shipmentType: ShipmentTypeEnum.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
export type ListTemplatesQueryDto = z.infer<typeof ListTemplatesQuerySchema>;
