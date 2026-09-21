import type {
  DownloadJob,
  TrainingReportRow,
  NotificationItem,
  MessageThread,
  Message,
  Invoice,
  RevenueLine,
  AuditLogEntry,
} from "@/contracts";
import { freshFaker } from "../seed";
import { masterCourses } from "./courses";

const faker = freshFaker();

export const downloadJobs: DownloadJob[] = [
  { id: "dl_1", label: "Overall Training Report — Sep 2026", reportType: "overall", status: "ready", requestedAt: "2026-09-17T08:12:00Z", readyAt: "2026-09-17T08:14:00Z", fileSizeKb: 812, requestedBy: "Priya Nair", fileUrl: null },
  { id: "dl_2", label: "Warehouse Operations — Group Report", reportType: "group", status: "processing", requestedAt: "2026-09-18T09:40:00Z", readyAt: null, fileSizeKb: null, requestedBy: "Priya Nair", fileUrl: null },
  { id: "dl_3", label: "Revenue & Cost Report — Q3 2026", reportType: "revenue", status: "queued", requestedAt: "2026-09-18T09:41:00Z", readyAt: null, fileSizeKb: null, requestedBy: "Priya Nair", fileUrl: null },
  { id: "dl_4", label: "Sam Okafor — Learner Report", reportType: "learner", status: "ready", requestedAt: "2026-09-16T14:02:00Z", readyAt: "2026-09-16T14:02:30Z", fileSizeKb: 96, requestedBy: "Priya Nair", fileUrl: null },
];

export function buildTrainingReportRows(count: number): TrainingReportRow[] {
  return Array.from({ length: count }, () => {
    const status = faker.helpers.arrayElement(["completed", "in_progress", "not_started", "overdue"] as const);
    return {
      learnerName: faker.person.fullName(),
      courseTitle: faker.helpers.arrayElement(masterCourses).title,
      status,
      completedAt: status === "completed" ? faker.date.past({ years: 1 }).toISOString().slice(0, 10) : null,
      score: status === "completed" ? faker.number.int({ min: 60, max: 100 }) : null,
      timeSpentMinutes: faker.number.int({ min: 5, max: 90 }),
    };
  });
}

export const notifications: NotificationItem[] = [
  { id: "n1", category: "allocation", title: "3 new courses allocated to you", body: "Manual Handling Essentials, Fire Safety Awareness and GDPR Refresher are due by 15 Oct.", read: false, createdAt: "2026-09-18T08:00:00Z", actionHref: "/development" },
  { id: "n2", category: "deadline", title: "Deadline in 3 days", body: "Forklift Operation & Safety is due 21 Sep.", read: false, createdAt: "2026-09-17T09:00:00Z", actionHref: "/development" },
  { id: "n3", category: "format_ready", title: "Podcast format ready", body: "Your Podcast version of Fire Safety Awareness has finished generating.", read: true, createdAt: "2026-09-16T11:20:00Z", actionHref: "/player/course_3" },
  { id: "n4", category: "report_ready", title: "Overall Training Report is ready", body: "Your Sep 2026 report has finished processing.", read: false, createdAt: "2026-09-17T08:14:00Z", actionHref: "/reports/downloads" },
  { id: "n5", category: "renewal", title: "12 learners due for First Aid renewal", body: "Renewal window opens in 30 days.", read: true, createdAt: "2026-09-14T10:00:00Z", actionHref: "/matrix" },
  { id: "n6", category: "qa", title: "New question on GDPR & Data Protection", body: "Sam Okafor asked a question on their allocated course.", read: true, createdAt: "2026-09-13T15:30:00Z", actionHref: "/messages" },
  { id: "n7", category: "lease_alert", title: "Northfield Retail Group is near its licence limit", body: "92% of purchased licences are in use.", read: false, createdAt: "2026-09-18T07:00:00Z", actionHref: "/distribution-hub/leases" },
  { id: "n8", category: "system", title: "Scheduled maintenance — 22 Sep, 02:00 BST", body: "Expect brief downtime while we deploy platform updates.", read: true, createdAt: "2026-09-10T09:00:00Z", actionHref: null },
  // Creator notifications (Distribution Hub spec #18) — the remaining
  // four example types alongside n7's licence-threshold alert above.
  { id: "n9", category: "lease_alert", title: "First learner has started your course", body: "Someone at Harbour View Care Homes just launched Fire Safety Awareness for the first time.", read: false, createdAt: "2026-09-17T13:20:00Z", actionHref: "/distribution-hub/customers/Harbour%20View%20Care%20Homes" },
  { id: "n10", category: "lease_alert", title: "Castlegate Council has 30 days remaining", body: "Their lease of Forklift Operation & Safety expires 18 Oct 2026 — reach out before it lapses.", read: false, createdAt: "2026-09-15T09:00:00Z", actionHref: "/distribution-hub/customers/Castlegate%20Council" },
  { id: "n11", category: "lease_alert", title: "New leasing request", body: "Oakfield Logistics Group requested a quote for 600 learners.", read: false, createdAt: "2026-09-12T14:05:00Z", actionHref: "/distribution-hub/requests" },
  { id: "n12", category: "lease_alert", title: "Your course generated £2,450 this month", body: "Lease usage revenue across all customers, September 2026.", read: true, createdAt: "2026-09-01T09:00:00Z", actionHref: "/billing" },
];

export const messageThreads: MessageThread[] = [
  { id: "t1", type: "org_broadcast", subject: "Q4 compliance push", participants: ["Priya Nair", "All Staff"], lastMessagePreview: "Please complete your outstanding Fire Safety training by end of month.", lastMessageAt: "2026-09-17T10:00:00Z", unreadCount: 0, courseTitle: null, broadcastAudience: "all_staff", segment: null },
  { id: "t2", type: "course_qa", subject: "Question on GDPR & Data Protection Refresher", participants: ["Sam Okafor", "Priya Nair"], lastMessagePreview: "Does this cover the new UK GDPR amendments?", lastMessageAt: "2026-09-13T15:30:00Z", unreadCount: 1, courseTitle: "GDPR & Data Protection Refresher", broadcastAudience: null, segment: null },
  { id: "t3", type: "direct", subject: "Peer review feedback", participants: ["Jordan Blake", "You"], lastMessagePreview: "Left some notes on module 4, take a look when you can.", lastMessageAt: "2026-09-11T09:12:00Z", unreadCount: 0, courseTitle: null, broadcastAudience: null, segment: null },
  { id: "t4", type: "peer_review", subject: "Review request: Manual Handling Essentials", participants: ["You", "Freelancer: Kate Lin"], lastMessageAt: "2026-09-08T13:00:00Z", lastMessagePreview: "Accepted — delivery by Friday.", unreadCount: 0, courseTitle: "Manual Handling Essentials", broadcastAudience: null, segment: null },
  { id: "t5", type: "org_broadcast", subject: "Warehouse Ops — new PPE policy", participants: ["Priya Nair", "Warehouse Operations (Dept)"], lastMessagePreview: "Effective Monday, hi-vis is mandatory on the Manchester DC floor.", lastMessageAt: "2026-09-15T08:30:00Z", unreadCount: 0, courseTitle: null, broadcastAudience: "group", segment: null },
  { id: "t6", type: "crm_broadcast", subject: "New: Podcast format now live", participants: ["All end users"], lastMessagePreview: "You can now generate any course as a podcast — try it from Choose Learning Format.", lastMessageAt: "2026-09-10T09:00:00Z", unreadCount: 0, courseTitle: null, broadcastAudience: null, segment: "All active users" },
  { id: "t7", type: "crm_broadcast", subject: "We miss you — come back to a free credit top-up", participants: ["Inactive 30+ days"], lastMessagePreview: "It's been a while — here's 50 free credits to pick up where you left off.", lastMessageAt: "2026-09-05T09:00:00Z", unreadCount: 0, courseTitle: null, broadcastAudience: null, segment: "Inactive 30+ days" },
];

export const messagesByThread: Record<string, Message[]> = {
  t2: [
    { id: "m1", threadId: "t2", authorName: "Sam Okafor", body: "Does this cover the new UK GDPR amendments?", sentAt: "2026-09-13T15:30:00Z", isSelf: false },
    { id: "m2", threadId: "t2", authorName: "You", body: "Good question — the current version references 2025 ICO guidance. We're updating it in the next release.", sentAt: "2026-09-13T15:45:00Z", isSelf: true },
  ],
  t1: [
    { id: "m3", threadId: "t1", authorName: "Priya Nair", body: "Please complete your outstanding Fire Safety training by end of month.", sentAt: "2026-09-17T10:00:00Z", isSelf: false },
  ],
};

export const invoices: Invoice[] = [
  { id: "inv_1", organisationId: "org_acme", label: "Seat purchase — 40 licences, Manual Handling Essentials", amount: 1200, currency: "GBP", status: "paid", issuedAt: "2026-08-01T09:00:00Z", dueAt: "2026-08-15T09:00:00Z", kind: "seat_purchase" },
  { id: "inv_2", organisationId: "org_acme", label: "Lease usage — Northfield Retail Group, Aug 2026", amount: 840, currency: "GBP", status: "paid", issuedAt: "2026-09-01T09:00:00Z", dueAt: "2026-09-15T09:00:00Z", kind: "lease_usage" },
  { id: "inv_3", organisationId: "org_acme", label: "Lease usage — Harbour View Care Homes, Sep 2026", amount: 1260, currency: "GBP", status: "due", issuedAt: "2026-09-18T09:00:00Z", dueAt: "2026-10-02T09:00:00Z", kind: "lease_usage" },
  { id: "inv_4", organisationId: null, label: "Credit top-up — 500 credits", amount: 250, currency: "GBP", status: "paid", issuedAt: "2026-09-05T09:00:00Z", dueAt: "2026-09-05T09:00:00Z", kind: "credit_topup" },
  { id: "inv_5", organisationId: "org_acme", label: "Seller payout — Learning Exchange sales", amount: 640, currency: "GBP", status: "paid", issuedAt: "2026-09-10T09:00:00Z", dueAt: "2026-09-10T09:00:00Z", kind: "payout" },
  { id: "inv_6", organisationId: "org_acme", label: "Lease usage — Meridian Construction plc, Aug 2026", amount: 1480, currency: "GBP", status: "overdue", issuedAt: "2026-08-24T09:00:00Z", dueAt: "2026-09-07T09:00:00Z", kind: "lease_usage" },
];

export const revenueLines: RevenueLine[] = [
  { month: "Apr 2026", grossRevenue: 18400, platformFees: 2760, hostingCost: 1100, aiCost: 2200, netEarnings: 12340 },
  { month: "May 2026", grossRevenue: 21200, platformFees: 3180, hostingCost: 1150, aiCost: 2650, netEarnings: 14220 },
  { month: "Jun 2026", grossRevenue: 19800, platformFees: 2970, hostingCost: 1180, aiCost: 2410, netEarnings: 13240 },
  { month: "Jul 2026", grossRevenue: 24600, platformFees: 3690, hostingCost: 1220, aiCost: 3120, netEarnings: 16570 },
  { month: "Aug 2026", grossRevenue: 27100, platformFees: 4065, hostingCost: 1260, aiCost: 3480, netEarnings: 18295 },
  { month: "Sep 2026", grossRevenue: 29800, platformFees: 4470, hostingCost: 1310, aiCost: 3760, netEarnings: 20260 },
];

const GENERAL_ACTIONS = [
  "Allocated course to learner",
  "Reallocated course",
  "Marked completion",
  "Set renewal date",
  "Invited team member",
  "Changed organisation role",
  "Exported Matrix report",
  "Bulk allocated to group",
];

// The ten granular lease lifecycle events from the Distribution Hub spec
// (#17, Audit Trail) — previously only 2 of these existed as loggable
// actions ("Created lease", "Paused lease").
const LEASE_ACTIONS = [
  "Lease created",
  "Lease terms agreed",
  "Lease payment received",
  "Deployment package downloaded",
  "Course launched under lease",
  "Learner completed leased course",
  "Lease licence count increased",
  "Leased course updated to new version",
  "Lease access suspended",
  "Lease renewed",
];

export function buildAuditLog(count: number): AuditLogEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const entityType = faker.helpers.arrayElement(["allocation", "completion", "renewal", "matrix_requirement", "lease", "user", "organisation"] as const);
    const action = entityType === "lease" ? faker.helpers.arrayElement(LEASE_ACTIONS) : faker.helpers.arrayElement(GENERAL_ACTIONS);
    return {
      id: `audit_log_${i}`,
      actorName: faker.person.fullName(),
      actorRole: faker.helpers.arrayElement(["Org Administrator", "Org Manager", "Platform Admin"]),
      action,
      entityType,
      entityLabel: faker.helpers.arrayElement(masterCourses).title,
      previousValue: faker.helpers.arrayElement(["Required", "Allocated", null]),
      newValue: faker.helpers.arrayElement(["Completed", "In Progress", "Renewal Due"]),
      at: faker.date.recent({ days: 30 }).toISOString(),
      ipAddress: faker.internet.ip(),
    };
  }).sort((a, b) => b.at.localeCompare(a.at));
}
