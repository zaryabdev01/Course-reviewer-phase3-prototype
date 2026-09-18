import type {
  Organisation,
  OrgUnit,
  JobRole,
  CustomGroup,
  OrgMember,
  OrgSyncRequest,
  CsvImportRow,
} from "@/contracts";
import { freshFaker, ORG_ACME_ID, ORG_BRIGHTPATH_ID, pickAvatarColor } from "../seed";

const faker = freshFaker();

export const organisations: Organisation[] = [
  {
    id: ORG_ACME_ID,
    name: "Acme Logistics Ltd",
    logoColor: "#16a34a",
    industry: "Logistics & Warehousing",
    seatCount: 140,
    learnerCount: 96,
    createdAt: "2025-02-11T09:00:00Z",
  },
  {
    id: ORG_BRIGHTPATH_ID,
    name: "Bright Path Care Group",
    logoColor: "#4f39f6",
    industry: "Health & Social Care",
    seatCount: 40,
    learnerCount: 27,
    createdAt: "2025-09-03T09:00:00Z",
  },
];

const LOCATIONS = ["London HQ", "Manchester DC", "Leeds DC"];
const DEPARTMENTS = [
  "Warehouse Operations",
  "Fleet & Delivery",
  "Customer Service",
  "People & Culture",
  "Finance",
];
const TEAM_NAMES: Record<string, string[]> = {
  "Warehouse Operations": ["Inbound", "Outbound", "Inventory Control"],
  "Fleet & Delivery": ["Last Mile", "Line Haul"],
  "Customer Service": ["Support Desk", "Escalations"],
  "People & Culture": ["HR Advisory", "L&D"],
  Finance: ["Accounts Payable", "Payroll"],
};

export const JOB_ROLES_ACME = [
  "Warehouse Operative",
  "Forklift Operator",
  "Shift Supervisor",
  "Delivery Driver",
  "Fleet Coordinator",
  "Customer Service Advisor",
  "HR Advisor",
  "Finance Analyst",
  "Operations Manager",
  "Health & Safety Officer",
];

export function buildOrgUnits(organisationId: string): OrgUnit[] {
  const units: OrgUnit[] = [];
  let counter = 0;
  const locationIds: string[] = [];
  for (const loc of LOCATIONS) {
    const id = `${organisationId}_loc_${counter++}`;
    locationIds.push(id);
    units.push({
      id,
      organisationId,
      type: "location",
      name: loc,
      parentId: null,
      headCount: 0,
    });
  }
  for (const dept of DEPARTMENTS) {
    const parentLoc = faker.helpers.arrayElement(locationIds);
    const deptId = `${organisationId}_dept_${counter++}`;
    units.push({
      id: deptId,
      organisationId,
      type: "department",
      name: dept,
      parentId: parentLoc,
      headCount: 0,
    });
    for (const team of TEAM_NAMES[dept] ?? []) {
      units.push({
        id: `${organisationId}_team_${counter++}`,
        organisationId,
        type: "team",
        name: team,
        parentId: deptId,
        headCount: 0,
      });
    }
  }
  return units;
}

export function buildJobRoles(organisationId: string): JobRole[] {
  return JOB_ROLES_ACME.map((title, i) => ({
    id: `${organisationId}_role_${i}`,
    organisationId,
    title,
    headCount: 0,
  }));
}

export function buildCustomGroups(organisationId: string): CustomGroup[] {
  return [
    { id: `${organisationId}_grp_forklift`, organisationId, name: "Forklift Certified", memberCount: 0, createdAt: "2025-11-02T10:00:00Z" },
    { id: `${organisationId}_grp_newstarters`, organisationId, name: "New Starters 2026", memberCount: 0, createdAt: "2026-01-05T10:00:00Z" },
    { id: `${organisationId}_grp_nightshift`, organisationId, name: "Night Shift", memberCount: 0, createdAt: "2025-08-14T10:00:00Z" },
  ];
}

export function buildMembers(
  organisationId: string,
  count: number,
  orgUnits: OrgUnit[],
  jobRoles: JobRole[],
): OrgMember[] {
  const teamUnits = orgUnits.filter((u) => u.type === "team");
  const members: OrgMember[] = [];

  const adminId = `${organisationId}_u_admin`;
  members.push({
    id: adminId,
    organisationId,
    userId: adminId,
    fullName: organisationId === ORG_ACME_ID ? "Priya Nair" : "Daniel Osei",
    email: organisationId === ORG_ACME_ID ? "priya.nair@acmelogistics.co.uk" : "daniel.osei@brightpathcare.co.uk",
    role: "org_administrator",
    jobRoleId: null,
    orgUnitId: null,
    lineManagerId: null,
    status: "active",
    invitedAt: "2025-02-12T09:00:00Z",
    startDate: "2025-02-12",
  });

  const managerIds: string[] = [];
  for (let i = 0; i < Math.max(2, Math.round(count / 25)); i++) {
    const id = `${organisationId}_u_mgr_${i}`;
    managerIds.push(id);
    members.push({
      id,
      organisationId,
      userId: id,
      fullName: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      role: "org_manager",
      jobRoleId: faker.helpers.arrayElement(jobRoles).id,
      orgUnitId: faker.helpers.arrayElement(teamUnits).id,
      lineManagerId: adminId,
      status: "active",
      invitedAt: faker.date.past({ years: 1 }).toISOString(),
      startDate: faker.date.past({ years: 2 }).toISOString().slice(0, 10),
    });
  }

  for (let i = 0; i < count; i++) {
    const id = `${organisationId}_u_${i}`;
    const status = faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 88 },
      { value: "invited" as const, weight: 9 },
      { value: "left" as const, weight: 3 },
    ]);
    members.push({
      id,
      organisationId,
      userId: id,
      fullName: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      role: "team_member",
      jobRoleId: faker.helpers.arrayElement(jobRoles).id,
      orgUnitId: faker.helpers.arrayElement(teamUnits).id,
      lineManagerId: faker.helpers.arrayElement(managerIds),
      status,
      invitedAt: faker.date.past({ years: 1 }).toISOString(),
      startDate: faker.date.past({ years: 3 }).toISOString().slice(0, 10),
    });
  }

  // backfill head counts
  const unitCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  for (const m of members) {
    if (m.orgUnitId) unitCounts.set(m.orgUnitId, (unitCounts.get(m.orgUnitId) ?? 0) + 1);
    if (m.jobRoleId) roleCounts.set(m.jobRoleId, (roleCounts.get(m.jobRoleId) ?? 0) + 1);
  }
  for (const u of orgUnits) u.headCount = unitCounts.get(u.id) ?? 0;
  for (const r of jobRoles) r.headCount = roleCounts.get(r.id) ?? 0;

  return members;
}

export const orgSyncRequests: OrgSyncRequest[] = [
  {
    id: "sync_1",
    organisationId: ORG_ACME_ID,
    organisationName: "Acme Logistics Ltd",
    professionalEmail: "you@example.com",
    status: "accepted",
    requestedAt: "2025-11-20T09:00:00Z",
  },
  {
    id: "sync_2",
    organisationId: ORG_BRIGHTPATH_ID,
    organisationName: "Bright Path Care Group",
    professionalEmail: "you@example.com",
    status: "pending",
    requestedAt: "2026-08-30T09:00:00Z",
  },
];

export function buildCsvImportPreview(): CsvImportRow[] {
  const rows: CsvImportRow[] = [];
  for (let i = 1; i <= 12; i++) {
    const outcome = faker.helpers.weightedArrayElement([
      { value: "valid" as const, weight: 8 },
      { value: "warning" as const, weight: 3 },
      { value: "error" as const, weight: 1 },
    ]);
    rows.push({
      rowNumber: i,
      fullName: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      jobRoleTitle: faker.helpers.arrayElement(JOB_ROLES_ACME),
      orgUnitName: faker.helpers.arrayElement(DEPARTMENTS),
      lineManagerEmail: faker.internet.email().toLowerCase(),
      status: outcome,
      message:
        outcome === "warning"
          ? "Job role not found — will be created"
          : outcome === "error"
            ? "Duplicate email in file"
            : undefined,
    });
  }
  return rows;
}

export function avatarColorFor(id: string) {
  return pickAvatarColor(id);
}
