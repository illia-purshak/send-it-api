import { z } from 'zod';
import {
  DiscountType,
  SubscriptionBalanceStatus,
  SubscriptionPeriodType,
} from '../../../generated/prisma/enums.js';

// ─── User endpoints ───────────────────────────────────────────────────────────

export const BuySubscriptionSchema = z.object({
  planId: z.number().int().positive(),
  periodType: z.nativeEnum(SubscriptionPeriodType).default(SubscriptionPeriodType.MONTHLY),
  activateNow: z.boolean().optional(),
});
export type BuySubscriptionDto = z.infer<typeof BuySubscriptionSchema>;

export const UpdateBalanceSchema = z
  .object({
    autoRenew: z.boolean().optional(),
    scheduledSwitchTo: z.number().int().positive().optional(),
    cancelSwitch: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });
export type UpdateBalanceDto = z.infer<typeof UpdateBalanceSchema>;

// ─── Admin subscription endpoints ────────────────────────────────────────────

export const AdminUpdateBalanceSchema = z
  .object({
    action: z.enum(['changePlan', 'extend', 'cancel', 'setDiscount', 'suspend', 'reactivate']),
    planId: z.number().int().positive().optional(),
    days: z.number().int().positive().optional(),
    amount: z.number().positive().optional(),
    discountType: z.nativeEnum(DiscountType).optional(),
  })
  .refine(
    (d) => {
      if (d.action === 'changePlan') return d.planId !== undefined;
      if (d.action === 'extend') return d.days !== undefined;
      if (d.action === 'setDiscount') return d.amount !== undefined && d.discountType !== undefined;
      return true;
    },
    { message: 'Missing required fields for the given action' },
  );
export type AdminUpdateBalanceDto = z.infer<typeof AdminUpdateBalanceSchema>;

export const AdminGetSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  level: z.coerce.number().int().optional(),
  status: z.nativeEnum(SubscriptionBalanceStatus).optional(),
  search: z.string().optional(),
});
export type AdminGetSubscriptionsQueryDto = z.infer<typeof AdminGetSubscriptionsQuerySchema>;

// ─── Admin plans endpoints ────────────────────────────────────────────────────

const AdminPlanShape = {
  name: z.string().min(1).max(100),
  level: z.number().int().min(0),
  price: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0).nullable().optional(),
  maxOperators: z.number().int().positive(),
  hasAnalytics: z.boolean().default(false),
  hasTemplates: z.boolean().default(false),
  hasRecipients: z.boolean().default(false),
  hasSupport: z.boolean().default(true),
  autoRenewDefault: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  isPersonal: z.boolean().default(false),
  targetUserId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
} satisfies z.ZodRawShape;

const CreateAdminPlanBaseSchema = z.object(AdminPlanShape);

export const CreateAdminPlanSchema = CreateAdminPlanBaseSchema.refine(
  (d) => !d.isPersonal || (d.targetUserId !== undefined && d.targetUserId !== null),
  { message: 'targetUserId is required for personal plans', path: ['targetUserId'] },
);
export type CreateAdminPlanDto = z.infer<typeof CreateAdminPlanSchema>;

export const UpdateAdminPlanSchema = CreateAdminPlanBaseSchema.partial().omit({ isPersonal: true });
export type UpdateAdminPlanDto = z.infer<typeof UpdateAdminPlanSchema>;

export const AdminGetPlansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isPersonal: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isPublic: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type AdminGetPlansQueryDto = z.infer<typeof AdminGetPlansQuerySchema>;

export const AdminGetUserSubscriptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type AdminGetUserSubscriptionHistoryQueryDto = z.infer<typeof AdminGetUserSubscriptionHistoryQuerySchema>;
