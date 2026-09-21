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
  "per_launch",
  "unlimited_org_licence",
  "licence_bundle",
]);
export type LeaseBillingModel = z.infer<typeof leaseBillingModelSchema>;

export const LEASE_BILLING_LABELS: Record<LeaseBillingModel, string> = {
  fixed_fee: "Fixed fee",
  per_seat: "Per learner",
  per_completion: "Per completion",
  per_active_user_monthly: "Per active user / month",
  usage_metered: "Usage metered",
  revenue_share: "Revenue share",
  per_launch: "Per course launch",
  unlimited_org_licence: "Unlimited organisational licence",
  licence_bundle: "Licence bundle",
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
  /** Links a lease to an actual seeded organisation so that org's own
   * persona can see leases where they're the customer, not just the
   * owner looking outward. Null for leases whose customer isn't one of
   * this prototype's seeded organisations (most of them — real
   * customers in the demo data are external companies with no account
   * here, same as production before they're onboarded). */
  customerOrganisationId: idSchema.nullable(),
  customerLogoColor: z.string(),
  contactPersonName: z.string(),
  contactPersonEmail: z.string(),
  status: leaseStatusSchema,
  billingModel: leaseBillingModelSchema,
  price: z.number().nonnegative(),
  licencesTotal: z.number().int().nonnegative(),
  licencesUsed: z.number().int().nonnegative(),
  /** Distinct from licencesUsed (seats consumed) — M9 owner dashboard:
   * "Learners launched" and "Completions" are named as separate figures
   * from licence consumption. */
  learnersLaunched: z.number().int().nonnegative(),
  completions: z.number().int().nonnegative(),
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

/** Approval Workflow (M9 spec #12) — a lease listing request sitting
 * between "customer clicked Request Access/Quote" and an actual Lease
 * record. Distinct from Lease itself because a request can be declined
 * or re-quoted without ever becoming a lease. */
export const leaseRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "terms_changed",
  "quote_sent",
  "declined",
]);
export type LeaseRequestStatus = z.infer<typeof leaseRequestStatusSchema>;

export const leaseRequestSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  masterCourseTitle: z.string(),
  route: z.enum(["request_access", "request_quote"]),
  requesterOrgName: z.string(),
  requesterContactEmail: z.string(),
  learnerCount: z.number().int().positive(),
  note: z.string(),
  status: leaseRequestStatusSchema,
  responseNote: z.string().nullable(),
  requestedAt: isoDateTimeSchema,
  respondedAt: isoDateTimeSchema.nullable(),
});
export type LeaseRequest = z.infer<typeof leaseRequestSchema>;

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
  /** Marketplace listing fields (Distribution Hub spec #10) — the ones
   * that weren't modelled before: country, level, learning outcomes,
   * duration, the full set of delivery methods this listing supports
   * (a listing can support more than the one method a given lease ends
   * up using), and a lightweight creator/expert profile line. */
  country: z.string(),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "All levels"]),
  learningOutcomes: z.array(z.string()),
  durationMinutes: z.number().int().positive(),
  deliveryMethods: z.array(deliveryMethodSchema),
  creatorName: z.string(),
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
