import { ORG_ACME_ID, ORG_BRIGHTPATH_ID } from "./seed";
import {
  organisations,
  buildOrgUnits,
  buildJobRoles,
  buildCustomGroups,
  buildMembers,
  orgSyncRequests,
} from "./generators/organisations";
import {
  masterCourses,
  masterCourseVersions,
  formatVariants,
  learningSetupSettings,
  learningSetupTemplates,
} from "./generators/courses";
import { buildAllocations, buildSeatPools, buildDevelopmentItems } from "./generators/operations";
import { buildRequirements, buildMatrixCells, buildAuditTrail, buildPlannedTraining, buildTrainingGaps } from "./generators/matrix";
import { leases, leaseListings, deployments, usageAlerts } from "./generators/distribution";
import {
  downloadJobs,
  buildTrainingReportRows,
  notifications,
  messageThreads,
  messagesByThread,
  invoices,
  revenueLines,
  buildAuditLog,
} from "./generators/engagement";

/**
 * One in-memory "database" built once at module load, from the fixed seed.
 * Every fake API function in src/lib/api reads from this object. No
 * component ever imports from src/mocks directly — see src/lib/api/README.
 */
function buildDb() {
  const acmeOrgUnits = buildOrgUnits(ORG_ACME_ID);
  const acmeJobRoles = buildJobRoles(ORG_ACME_ID);
  const acmeGroups = buildCustomGroups(ORG_ACME_ID);
  const acmeMembers = buildMembers(ORG_ACME_ID, 90, acmeOrgUnits, acmeJobRoles);

  const bpOrgUnits = buildOrgUnits(ORG_BRIGHTPATH_ID);
  const bpJobRoles = buildJobRoles(ORG_BRIGHTPATH_ID);
  const bpGroups = buildCustomGroups(ORG_BRIGHTPATH_ID);
  const bpMembers = buildMembers(ORG_BRIGHTPATH_ID, 24, bpOrgUnits, bpJobRoles);

  const acmeRequirements = buildRequirements(ORG_ACME_ID);
  const acmeLearners = acmeMembers.filter((m) => m.role === "team_member" && m.status !== "left");
  const acmeMatrixCells = buildMatrixCells(ORG_ACME_ID, acmeLearners, acmeRequirements, acmeOrgUnits, acmeJobRoles);

  return {
    organisations,
    orgUnits: { [ORG_ACME_ID]: acmeOrgUnits, [ORG_BRIGHTPATH_ID]: bpOrgUnits } as Record<string, typeof acmeOrgUnits>,
    jobRoles: { [ORG_ACME_ID]: acmeJobRoles, [ORG_BRIGHTPATH_ID]: bpJobRoles } as Record<string, typeof acmeJobRoles>,
    customGroups: { [ORG_ACME_ID]: acmeGroups, [ORG_BRIGHTPATH_ID]: bpGroups } as Record<string, typeof acmeGroups>,
    members: { [ORG_ACME_ID]: acmeMembers, [ORG_BRIGHTPATH_ID]: bpMembers } as Record<string, typeof acmeMembers>,
    orgSyncRequests,

    masterCourses,
    masterCourseVersions,
    formatVariants,
    learningSetupSettings,
    learningSetupTemplates,

    allocations: { [ORG_ACME_ID]: buildAllocations(ORG_ACME_ID, acmeMembers, 220) } as Record<string, ReturnType<typeof buildAllocations>>,
    seatPools: { [ORG_ACME_ID]: buildSeatPools(ORG_ACME_ID) } as Record<string, ReturnType<typeof buildSeatPools>>,
    developmentItems: buildDevelopmentItems(9),

    requirements: { [ORG_ACME_ID]: acmeRequirements } as Record<string, typeof acmeRequirements>,
    matrixCells: { [ORG_ACME_ID]: acmeMatrixCells } as Record<string, typeof acmeMatrixCells>,
    matrixAudit: buildAuditTrail(acmeMatrixCells, 40),
    plannedTraining: { [ORG_ACME_ID]: buildPlannedTraining(ORG_ACME_ID, acmeRequirements) } as Record<string, ReturnType<typeof buildPlannedTraining>>,
    trainingGaps: buildTrainingGaps(acmeRequirements),

    leases,
    leaseListings,
    deployments,
    usageAlerts,

    downloadJobs,
    trainingReportRows: buildTrainingReportRows(140),
    notifications,
    messageThreads,
    messagesByThread,
    invoices,
    revenueLines,
    auditLog: buildAuditLog(60),
  };
}

export const db = buildDb();
export type Db = typeof db;
