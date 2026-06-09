import { z } from 'zod';
import { CreateNovaPostShipmentSchema } from './nova-post-shipment.schema.js';
import { CreateUkrposhtaShipmentSchema } from './ukrposhta-shipment.schema.js';
import { CreateMeestShipmentSchema } from './meest-shipment.schema.js';

export const CreateShipmentSchema = z.discriminatedUnion('operator', [
  CreateNovaPostShipmentSchema.extend({ operator: z.literal('nova-post') }),
  CreateUkrposhtaShipmentSchema.extend({ operator: z.literal('ukrposhta') }),
  CreateMeestShipmentSchema.extend({ operator: z.literal('meest') }),
]);

export type CreateShipmentDto = z.infer<typeof CreateShipmentSchema>;
