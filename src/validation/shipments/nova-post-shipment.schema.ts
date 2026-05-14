import { z } from 'zod';

const AddressPartsSchema = z.object({
  city: z.string().max(100),
  street: z.string().max(100),
  postCode: z.string().max(10),
  building: z.string().max(100),
  region: z.string().max(100).optional(),
  flat: z.string().max(10).optional(),
  block: z.string().max(100).nullable().optional(),
  note: z.string().max(100).optional(),
});

const SenderSchema = z.object({
  name: z.string().max(100),
  phone: z.string(),
  countryCode: z.string().length(2),
  companyTin: z.string().max(20).nullable().optional(),
  companyName: z.string().max(100).nullable().optional(),
  eoriCode: z.string().min(3).max(17).nullable().optional(),
  email: z.string().email().optional(),
  ioss: z.string().max(12).optional(),
  divisionNumber: z.string().nullable().optional(),
  divisionID: z.number().int().positive().nullable().optional(),
  addressParts: AddressPartsSchema.optional(),
});

const RecipientSchema = z.object({
  name: z.string().max(100),
  phone: z.string(),
  countryCode: z.string().length(2),
  companyTin: z.string().max(20).nullable().optional(),
  companyName: z.string().max(100).nullable().optional(),
  eoriCode: z.string().min(3).max(17).nullable().optional(),
  email: z.string().email().optional(),
  divisionNumber: z.string().nullable().optional(),
  divisionID: z.number().int().positive().nullable().optional(),
  addressParts: AddressPartsSchema.optional(),
});

const ParcelSchema = z.object({
  cargoCategory: z.enum(['parcel', 'documents', 'pallet']),
  parcelDescription: z.string().max(255),
  insuranceCost: z.number().positive(),
  insuranceCurrencyCode: z.string().length(3).optional(),
  rowNumber: z.number().int().min(1),
  width: z.number().int().positive(),
  length: z.number().int().positive(),
  height: z.number().int().positive(),
  actualWeight: z.number().int().positive(),
});

const InvoiceSchema = z.object({
  cost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  customerNumber: z.string().max(50).nullable().optional(),
  customerCreatedAt: z.string().optional(),
  type: z.enum(['Invoice', 'ProformaInvoice']).optional(),
  incoterm: z.enum(['DAP', 'DDP']).optional(),
  exportReason: z
    .enum(['ForPersonalPurposes', 'Selling', 'Repair', 'Return', 'Other'])
    .optional(),
  payerFeesCustoms: z.enum(['Sender', 'Recipient', 'ThirdPerson']).optional(),
});

export const CreateNovaPostShipmentSchema = z.object({
  clientOrder: z.string().max(50).optional(),
  note: z.string().max(255).optional(),
  deliveryType: z.enum(['standard', 'economy', 'express']).optional(),
  payerType: z.enum(['Sender', 'Recipient', 'ThirdPerson']),
  payerContractNumber: z.string().min(2).max(20).nullable().optional(),
  sender: SenderSchema,
  recipient: RecipientSchema,
  parcels: z.array(ParcelSchema).min(1),
  invoice: InvoiceSchema.optional(),
  draftId: z.number().int().positive().optional(),
});

export type CreateNovaPostShipmentDto = z.infer<
  typeof CreateNovaPostShipmentSchema
>;
