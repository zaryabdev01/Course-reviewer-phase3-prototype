import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";

/** Training Distribution Hub (M9/M10) — leasing master courses into other
 * organisations' LMSs. A lease is a contract object checked on every
 * launch (billing model, limits, restrictions, pinned version). */

export const leaseBillingModelSchema = z.enum([
  "fixed_fee",
  "per_seat",
  "per_completion",
  "per_active_user_monthly",
  "usage_metered",
  "revenue_share",
]);
export type LeaseBillingModel = z.infer<typeof leaseBillingModelSchema>;

export const LEASE_BILLING_LABELS: Record<LeaseBillingModel, string> = {
  fixed_fee: "Fixed fee",
  per_seat: "Per seat",
  per_completion: "Per completion",
  per_active_user_monthly: "Per active user / month",
  usage_metered: "Usage metered",
  revenue_share: "Revenue share",
};

export const deliveryMethodSchema = z.enum([
  "hosted_launch",
  "scorm_dispatch",
  "lti_1_3",
  "xapi_cmi5",
  "api",
]);
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  hosted_launch: "Hosted Course Launch",
  scorm_dispatch: "SCORM Dispatch",
  lti_1_3: "LTI 1.3",
  xapi_cmi5: "xAPI / cmi5",
  api: "API Delivery",
};

export const leaseStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "active",
  "paused",
  "expired",
  "revoked",
]);
export type LeaseStatus = z.infer<typeof leaseStatusSchema>;

export const leaseSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  masterCourseTitle: z.string(),
  ownerOrganisationId: idSchema,
  customerName: z.string(),
  customerLogoColor: z.string(),
  status: leaseStatusSchema,
  billingModel: leaseBillingModelSchema,
  price: z.number().nonnegative(),
  licencesTotal: z.number().int().nonnegative(),
  licencesUsed: z.number().int().nonnegative(),
  deliveryMethod: deliveryMethodSchema,
  pinnedVersion: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  allowedCountries: z.array(z.string()),
  allowedDomains: z.array(z.string()),
  /** IP/CIDR allowlist — M9: "domain/country/IP limits". GeoIP lookup is
   * the real enforcement mechanism; here it's just the configured list. */
  allowedIps: z.array(z.string()),
  certificatesEnabled: z.boolean(),
  autoUpdateVersions: z.boolean(),
  /** Client-specific overlay on the master (branding/policy applied at
   * render time) — M9: "Client-specific versions as overlays on the
   * master". False = the customer sees the master as published. */
  hasClientOverlay: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type Lease = z.infer<typeof leaseSchema>;

export const leaseAcquisitionRouteSchema = z.enum([
  "buy_instantly",
  "request_access",
  "request_quote",
]);
export type LeaseAcquisitionRoute = z.infer<typeof leaseAcquisitionRouteSchema>;

export const leaseListingSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  title: z.string(),
  description: z.string(),
  ownerOrganisationName: z.string(),
  route: leaseAcquisitionRouteSchema,
  fromPrice: z.number().nonnegative(),
  billingModel: leaseBillingModelSchema,
  sector: z.string(),
  thumbnailColor: z.string(),
});
export type LeaseListing = z.infer<typeof leaseListingSchema>;

export const usageEventTypeSchema = z.enum([
  "launch",
  "completion",
  "active_user_tick",
]);

export const usageAlertSchema = z.object({
  id: idSchema,
  leaseId: idSchema,
  customerName: z.string(),
  thresholdPercent: z.number(),
  currentPercent: z.number(),
  triggeredAt: isoDateTimeSchema,
});
export type UsageAlert = z.infer<typeof usageAlertSchema>;

export const deploymentSchema = z.object({
  id: idSchema,
  leaseId: idSchema,
  deliveryMethod: deliveryMethodSchema,
  status: z.enum(["not_configured", "test_pending", "test_passed", "live"]),
  launchUrl: z.string().nullable(),
  scormPackageReady: z.boolean(),
  apiKeyLast4: z.string().nullable(),
  lastTestAt: isoDateTimeSchema.nullable(),
});
export type Deployment = z.infer<typeof deploymentSchema>;
