import type { Lease, LeaseListing, Deployment, UsageAlert, LeaseBillingModel, DeliveryMethod, LeaseRequest } from "@/contracts";
import { freshFaker, ORG_ACME_ID, ORG_NORTHFIELD_ID } from "../seed";
import { masterCourses } from "./courses";

const faker = freshFaker();

const CUSTOMER_NAMES = [
  "Northfield Retail Group",
  "Harbour View Care Homes",
  "Meridian Construction plc",
  "BlueLeaf Hospitality",
  "Castlegate Council",
];

// Only "Northfield Retail Group" is a real seeded organisation in this
// prototype (mocks/generators/organisations.ts) — the rest are external
// companies with no account here, same as production before onboarding.
const CUSTOMER_ORG_ID: Record<string, string | null> = {
  "Northfield Retail Group": ORG_NORTHFIELD_ID,
};

const BILLING_MODELS: LeaseBillingModel[] = [
  "fixed_fee",
  "per_seat",
  "per_completion",
  "per_active_user_monthly",
  "usage_metered",
  "revenue_share",
  "per_launch",
  "unlimited_org_licence",
  "licence_bundle",
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
    const learnersLaunched = faker.number.int({ min: Math.round(licencesUsed * 0.7), max: licencesUsed });
    const completions = faker.number.int({ min: 0, max: learnersLaunched });
    const contactPersonName = faker.person.fullName();
    return {
      id: `lease_${ci}_${i}`,
      masterCourseId: course.id,
      masterCourseTitle: course.title,
      ownerOrganisationId: ORG_ACME_ID,
      customerName: customer,
      customerOrganisationId: CUSTOMER_ORG_ID[customer] ?? null,
      customerLogoColor: faker.helpers.arrayElement(["#0d9488", "#f79009", "#4f39f6", "#e62e2e", "#106b32"]),
      contactPersonName,
      contactPersonEmail: `${contactPersonName.toLowerCase().replace(/[^a-z ]/g, "").replace(" ", ".")}@${customer.toLowerCase().replace(/[^a-z]/g, "")}.com`,
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
      learnersLaunched,
      completions,
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

// The marketplace only ever lists courses their owner explicitly marked
// "Available for Leasing" — private courses never appear here, whatever
// else is true about them (spec #10).
const listableCourses = masterCourses.filter((c) => c.leaseVisibility === "leasable").slice(0, 6);
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"] as const;

export const leaseListings: LeaseListing[] = listableCourses.map((c, i) => ({
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
  country: faker.helpers.arrayElement(["United Kingdom", "Ireland", "United States", "Global"]),
  level: faker.helpers.arrayElement(LEVELS),
  learningOutcomes: [
    `Understand the key principles of ${c.sector.toLowerCase()}`,
    "Apply what you've learned in a realistic workplace scenario",
    "Pass the end-of-course assessment",
  ],
  durationMinutes: c.estimatedMinutes,
  deliveryMethods: faker.helpers.arrayElements(DELIVERY_METHODS, { min: 2, max: 4 }),
  creatorName: "Acme Content Team",
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

// Approval Workflow (spec #12) — requests sitting between "customer
// clicked Request Access/Quote" and an actual Lease. Two pending ones
// seeded so the owner-side inbox isn't empty on first load.
export const leaseRequests: LeaseRequest[] = [
  {
    id: "req_1",
    masterCourseId: leasableCourses[0].id,
    masterCourseTitle: leasableCourses[0].title,
    route: "request_access",
    requesterOrgName: "ABC Children's Services",
    requesterContactEmail: "l.and.d@abcchildrensservices.org.uk",
    learnerCount: 250,
    note: "We'd like access for our residential care staff ahead of our Q1 inspection window.",
    status: "pending",
    responseNote: null,
    requestedAt: "2026-09-16T10:15:00Z",
    respondedAt: null,
  },
  {
    id: "req_2",
    masterCourseId: leasableCourses[Math.min(2, leasableCourses.length - 1)].id,
    masterCourseTitle: leasableCourses[Math.min(2, leasableCourses.length - 1)].title,
    route: "request_quote",
    requesterOrgName: "Oakfield Logistics Group",
    requesterContactEmail: "procurement@oakfieldlogistics.com",
    learnerCount: 600,
    note: "Multi-site rollout across 4 depots — would like a quote for an annual unlimited licence if available.",
    status: "pending",
    responseNote: null,
    requestedAt: "2026-09-12T14:00:00Z",
    respondedAt: null,
  },
  {
    id: "req_3",
    masterCourseId: leasableCourses[1].id,
    masterCourseTitle: leasableCourses[1].title,
    route: "request_access",
    requesterOrgName: "Castlegate Council",
    requesterContactEmail: "training@castlegate.gov.uk",
    learnerCount: 120,
    note: "Renewing our annual training programme for frontline staff.",
    status: "approved",
    responseNote: "Approved at standard per-learner pricing — lease created.",
    requestedAt: "2026-08-20T09:30:00Z",
    respondedAt: "2026-08-21T11:00:00Z",
  },
];
