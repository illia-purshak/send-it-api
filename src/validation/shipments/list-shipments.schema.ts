import { z } from 'zod';

const ShipmentStatusFilterSchema = z.enum([
  'DRAFT',
  'CREATED',
  'PREPARING',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'UNKNOWN',
]);

export const ListShipmentsQuerySchema = z.object({
  operator: z.string().trim().min(1).optional(),
  status: ShipmentStatusFilterSchema.optional(),
  ttn: z.string().trim().min(1).optional(),
  recipient: z.string().trim().min(1).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  valueFrom: z.coerce.number().nonnegative().optional(),
  valueTo: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'declaredValue', 'recipient']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListShipmentsQueryDto = z.infer<typeof ListShipmentsQuerySchema>;
