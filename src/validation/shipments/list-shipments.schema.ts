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
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  valueFrom: z.coerce.number().nonnegative().optional(),
  valueTo: z.coerce.number().nonnegative().optional(),
});

export type ListShipmentsQueryDto = z.infer<typeof ListShipmentsQuerySchema>;
