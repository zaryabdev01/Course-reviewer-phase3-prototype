import type { Lease, LeaseListing, Deployment, UsageAlert, LeaseBillingModel, DeliveryMethod } from "@/contracts";
import { freshFaker, ORG_ACME_ID } from "../seed";
import { masterCourses } from "./courses";

const faker = freshFaker();

const CUSTOMER_NAMES = [
  "Northfield Retail Group",
  "Harbour View Care Homes",
  "Meridian Construction plc",
  "BlueLeaf Hospitality",
  "Castlegate Council",
];

const BILLING_MODELS: LeaseBillingModel[] = [
  "fixed_fee",
  "per_seat",
  "per_completion",
  "per_active_user_monthly",
  "usage_metered",
  "revenue_share",
];

const DELIVERY_METHODS: DeliveryMethod[] = [
  "hosted_launch",
  "scorm_dispatch",
  "lti_1_3",
  "xapi_cmi5",
  "api",
];

const leasableCourses = masterCourses.slice(0, 6);

export const leases: Lease[] = CUSTOMER_NAMES.flatMap((customer, ci) =>
  faker.helpers.arrayElements(leasableCourses, { min: 1, max: 2 }).map((course, i) => {
    const licencesTotal = faker.number.int({ min: 25, max: 300 });
    const licencesUsed = faker.number.int({ min: 0, max: licencesTotal });
    return {
      id: `lease_${ci}_${i}`,
      masterCourseId: course.id,
      masterCourseTitle: course.title,
      ownerOrganisationId: ORG_ACME_ID,
      customerName: customer,
      customerLogoColor: faker.helpers.arrayElement(["#0d9488", "#f79009", "#4f39f6", "#e62e2e", "#106b32"]),
      status: faker.helpers.weightedArrayElement([
        { value: "active" as const, weight: 6 },
        { value: "pending_approval" as const, weight: 1 },
        { value: "paused" as const, weight: 1 },
        { value: "expired" as const, weight: 1 },
      ]),
      billingModel: faker.helpers.arrayElement(BILLING_MODELS),
      price: faker.number.int({ min: 400, max: 6000 }),
      licencesTotal,
      licencesUsed,
      deliveryMethod: faker.helpers.arrayElement(DELIVERY_METHODS),
      pinnedVersion: course.currentVersion,
      startDate: faker.date.past({ years: 1 }).toISOString().slice(0, 10),
      endDate: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.soon({ days: 300 }).toISOString().slice(0, 10) : null,
      allowedCountries: faker.helpers.arrayElements(["GB", "IE", "US", "AU", "CA"], { min: 1, max: 3 }),
      allowedDomains: [`@${customer.toLowerCase().replace(/[^a-z]/g, "")}.com`],
      allowedIps: faker.datatype.boolean({ probability: 0.35 })
        ? [faker.internet.ipv4() + "/24", faker.internet.ipv4() + "/32"]
        : [],
      certificatesEnabled: faker.datatype.boolean({ probability: 0.8 }),
      autoUpdateVersions: faker.datatype.boolean({ probability: 0.5 }),
      hasClientOverlay: faker.datatype.boolean({ probability: 0.4 }),
      createdAt: faker.date.past({ years: 1 }).toISOString(),
    };
  }),
);

export const leaseListings: LeaseListing[] = leasableCourses.map((c, i) => ({
  id: `listing_${i}`,
  masterCourseId: c.id,
  title: c.title,
  description: c.description,
  ownerOrganisationName: "Acme Logistics Ltd",
  route: faker.helpers.arrayElement(["buy_instantly", "request_access", "request_quote"] as const),
  fromPrice: faker.number.int({ min: 3, max: 25 }),
  billingModel: faker.helpers.arrayElement(BILLING_MODELS),
  sector: c.sector,
  thumbnailColor: c.thumbnailColor,
}));

export const deployments: Deployment[] = leases.map((lease, i) => ({
  id: `deploy_${i}`,
  leaseId: lease.id,
  deliveryMethod: lease.deliveryMethod,
  status: faker.helpers.weightedArrayElement([
    { value: "live" as const, weight: 6 },
    { value: "test_passed" as const, weight: 2 },
    { value: "test_pending" as const, weight: 1 },
    { value: "not_configured" as const, weight: 1 },
  ]),
  launchUrl: lease.deliveryMethod === "hosted_launch" ? `https://launch.coursereviewer.io/l/${lease.id}` : null,
  scormPackageReady: lease.deliveryMethod === "scorm_dispatch",
  apiKeyLast4: lease.deliveryMethod === "api" ? faker.string.numeric(4) : null,
  lastTestAt: faker.date.recent({ days: 20 }).toISOString(),
}));

export const usageAlerts: UsageAlert[] = leases
  .filter((l) => l.licencesUsed / l.licencesTotal > 0.8)
  .map((l, i) => ({
    id: `alert_${i}`,
    leaseId: l.id,
    customerName: l.customerName,
    thresholdPercent: 80,
    currentPercent: Math.round((l.licencesUsed / l.licencesTotal) * 100),
    triggeredAt: faker.date.recent({ days: 5 }).toISOString(),
  }));
