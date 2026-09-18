import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";

export const invoiceStatusSchema = z.enum(["paid", "due", "overdue", "void"]);

export const invoiceSchema = z.object({
  id: idSchema,
  organisationId: idSchema.nullable(),
  label: z.string(),
  amount: z.number().nonnegative(),
  currency: z.literal("GBP"),
  status: invoiceStatusSchema,
  issuedAt: isoDateTimeSchema,
  dueAt: isoDateTimeSchema,
  kind: z.enum(["seat_purchase", "lease_usage", "credit_topup", "payout"]),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const revenueLineSchema = z.object({
  month: z.string(),
  grossRevenue: z.number().nonnegative(),
  platformFees: z.number().nonnegative(),
  hostingCost: z.number().nonnegative(),
  aiCost: z.number().nonnegative(),
  netEarnings: z.number(),
});
export type RevenueLine = z.infer<typeof revenueLineSchema>;

export const auditLogEntrySchema = z.object({
  id: idSchema,
  actorName: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.enum([
    "allocation",
    "completion",
    "renewal",
    "matrix_requirement",
    "lease",
    "user",
    "organisation",
  ]),
  entityLabel: z.string(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  at: isoDateTimeSchema,
  ipAddress: z.string(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
                                                                                                                                                                                                                                                                      