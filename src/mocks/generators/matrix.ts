import type {
  TrainingRequirement,
  MatrixCell,
  MatrixStatus,
  MatrixAuditEntry,
  PlannedTraining,
  TrainingGap,
  OrgMember,
  OrgUnit,
  JobRole,
  TrainingSource,
} from "@/contracts";
import { freshFaker } from "../seed";
import { masterCourses } from "./courses";
import { JOB_ROLES_ACME } from "./organisations";

const faker = freshFaker();

const REQUIREMENT_TITLES = [
  "Manual Handling Essentials",
  "Fire Safety Awareness",
  "GDPR & Data Protection Refresher",
  "Forklift Operation & Safety",
  "First Aid at Work",
  "Working at Height",
  "COSHH Awareness",
  "Display Screen Equipment (DSE)",
  "Equality, Diversity & Inclusion",
  "Anti-Bribery & Corruption",
  "Cyber Security Fundamentals",
  "Food Hygiene Level 2",
];

// Training Matrix brief #3: requirements target more than departments and
// groups — "All Support Workers require Safeguarding Adults" is a JOB
// ROLE target, and it's the example the brief leads with. Previously
// only Dept/Group targets existed; role targets are what make "a new
// starter in this role automatically gets the requirement" (#3/#10) mean
// anything.
export function targetOptionsFor(orgId: string): string[] {
  return [
    "All Staff",
    "Warehouse Operations (Dept)",
    "Fleet & Delivery (Dept)",
    "Customer Service (Dept)",
    "Forklift Certified (Group)",
    "New Starters 2026 (Group)",
    ...JOB_ROLES_ACME.map((r) => `${r} (Role)`),
  ];
}

export function buildRequirements(organisationId: string): TrainingRequirement[] {
  const targetOptions = targetOptionsFor(organisationId);
  return REQUIREMENT_TITLES.map((title, i) => {
    const course = masterCourses.find((c) => c.title === title) ?? faker.helpers.arrayElement(masterCourses);
    const recurring = faker.datatype.boolean({ probability: 0.6 });
    return {
      id: `${organisationId}_req_${i}`,
      organisationId,
      title,
      masterCourseId: i === REQUIREMENT_TITLES.length - 1 ? null : course.id,
      masterCourseTitle: i === REQUIREMENT_TITLES.length - 1 ? null : course.title,
      targetLabel: faker.helpers.arrayElement(targetOptions),
      recurring,
      recurrenceMonths: recurring ? faker.helpers.arrayElement([12, 24, 36]) : null,
      mandatory: faker.datatype.boolean({ probability: 0.75 }),
      createdAt: faker.date.past({ years: 1 }).toISOString(),
    };
  });
}

const STATUS_WEIGHTS: { value: MatrixStatus; weight: number }[] = [
  { value: "not_required", weight: 10 },
  { value: "required", weight: 12 },
  { value: "allocated", weight: 14 },
  { value: "in_progress", weight: 16 },
  { value: "completed", weight: 34 },
  { value: "renewal_due", weight: 8 },
  { value: "overdue", weight: 6 },
];

const SOURCE_SYSTEMS = ["BambooHR LMS", "CIPD Membership Records", "Workday Learning", "External Provider Portal"];

export function buildMatrixCells(
  organisationId: string,
  learners: OrgMember[],
  requirements: TrainingRequirement[],
  orgUnits: OrgUnit[],
  jobRoles: JobRole[],
): MatrixCell[] {
  const unitName = (id: string | null) => orgUnits.find((u) => u.id === id)?.name ?? "Unassigned";
  const roleName = (id: string | null) => jobRoles.find((r) => r.id === id)?.title ?? "Unassigned";

  const cells: MatrixCell[] = [];
  for (const learner of learners) {
    for (const req of requirements) {
      const status = faker.helpers.weightedArrayElement(STATUS_WEIGHTS);
      if (status === "not_required") continue; // sparse grid, same as a real Matrix
      const source: TrainingSource = faker.helpers.weightedArrayElement([
        { value: "platform_course" as const, weight: 8 },
        { value: "external_manual" as const, weight: 1 },
        { value: "external_api" as const, weight: 1 },
        { value: "virtual" as const, weight: 1 },
        { value: "at_venue" as const, weight: 1 },
      ]);
      const isExternal = source === "external_manual" || source === "external_api";
      const completedDate = ["completed", "renewal_due"].includes(status)
        ? faker.date.past({ years: 1 }).toISOString().slice(0, 10)
        : null;
      cells.push({
        id: `${organisationId}_cell_${learner.id}_${req.id}`,
        organisationId,
        learnerId: learner.id,
        learnerName: learner.fullName,
        jobRoleTitle: roleName(learner.jobRoleId),
        departmentName: unitName(learner.orgUnitId),
        requirementId: req.id,
        requirementTitle: req.title,
        status,
        source,
        dueDate: ["required", "allocated", "in_progress"].includes(status)
          ? faker.date.soon({ days: 60 }).toISOString().slice(0, 10)
          : status === "overdue"
            ? faker.date.recent({ days: 30 }).toISOString().slice(0, 10)
            : null,
        completedDate,
        renewalDate: status === "renewal_due" ? faker.date.soon({ days: 30 }).toISOString().slice(0, 10) : null,
        evidenceUrl: isExternal && completedDate ? "https://evidence.example/cert.pdf" : null,
        cpdHours: isExternal ? faker.number.int({ min: 1, max: 8 }) : null,
        cost: isExternal || source === "at_venue" ? faker.number.int({ min: 50, max: 400 }) : null,
        certificateNumber: isExternal && completedDate ? `CERT-${faker.string.alphanumeric(8).toUpperCase()}` : null,
        provider: isExternal ? faker.helpers.arrayElement(["St John Ambulance", "NEBOSH", "City & Guilds", "Local Authority Training Team"]) : null,
        sourceSystemName: source === "external_api" ? faker.helpers.arrayElement(SOURCE_SYSTEMS) : null,
        externalCourseId: source === "external_api" ? `EXT-${faker.string.numeric(5)}` : null,
        externalLearnerId: source === "external_api" ? `LRN-${faker.string.numeric(6)}` : null,
        importedAt: source === "external_api" ? faker.date.recent({ days: 15 }).toISOString() : null,
        notes: isExternal && faker.datatype.boolean({ probability: 0.25 }) ? faker.lorem.sentence() : null,
        updatedAt: faker.date.recent({ days: 20 }).toISOString(),
      });
    }
  }
  return cells;
}

// Training Matrix brief #17 — the nine named audit events, up from four
// generic field names before.
const AUDIT_ACTIONS = [
  "Requirement created",
  "Learner added to requirement",
  "Learner removed from requirement",
  "Course allocated",
  "External training added",
  "Certificate uploaded",
  "Completion imported through API",
  "Renewal date changed",
  "Training requirement cancelled",
];

export function buildAuditTrail(cells: MatrixCell[], count: number): MatrixAuditEntry[] {
  const entries: MatrixAuditEntry[] = [];
  for (let i = 0; i < count; i++) {
    const cell = faker.helpers.arrayElement(cells);
    const action = faker.helpers.arrayElement(AUDIT_ACTIONS);
    entries.push({
      id: `audit_${i}`,
      cellId: cell.id,
      learnerName: cell.learnerName,
      requirementTitle: cell.requirementTitle,
      field: action,
      previousValue: faker.helpers.arrayElement(["Required", "Allocated", "In Progress", null]),
      newValue: faker.helpers.arrayElement(["Completed", "Renewal Due", "Overdue"]),
      changedBy: faker.helpers.arrayElement(["System (scheduler)", "Priya Nair", "Sam Okafor", "API import (Workday Learning)"]),
      changedAt: faker.date.recent({ days: 45 }).toISOString(),
    });
  }
  return entries.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

export function buildPlannedTraining(organisationId: string, requirements: TrainingRequirement[]): PlannedTraining[] {
  const items: PlannedTraining[] = [];
  const REASONS = [
    "New regulatory requirement",
    "Recurring renewal wave",
    "New site opening",
    "Post-incident corrective action",
    "Annual compliance refresh",
  ];
  const OWNERS = ["Priya Nair", "Sam Okafor", "L&D Team"];
  for (let i = 0; i < 10; i++) {
    const req = faker.helpers.arrayElement(requirements);
    const required = faker.number.int({ min: 6, max: 20 });
    const assigned = faker.number.int({ min: 0, max: required });
    items.push({
      id: `${organisationId}_planned_${i}`,
      organisationId,
      title: req.title,
      requirementId: req.id,
      source: faker.helpers.arrayElement(["platform_course", "virtual", "at_venue"] as const),
      scheduledDate: faker.date.soon({ days: 90 }).toISOString().slice(0, 10),
      placesRequired: required,
      placesAssigned: assigned,
      location: faker.helpers.arrayElement(["London HQ — Training Room 2", "Manchester DC — Onsite", "Virtual — MS Teams", null]),
      provider: faker.helpers.arrayElement(["Internal L&D", "St John Ambulance", "SAARZ Platform", null]),
      reason: faker.helpers.arrayElement(REASONS),
      targetLabel: faker.helpers.arrayElement(targetOptionsFor(organisationId)),
      budget: faker.datatype.boolean({ probability: 0.6 }) ? faker.number.int({ min: 500, max: 8000 }) : null,
      priority: faker.helpers.weightedArrayElement([
        { value: "high" as const, weight: 2 },
        { value: "medium" as const, weight: 5 },
        { value: "low" as const, weight: 3 },
      ]),
      ownerName: faker.helpers.arrayElement(OWNERS),
      notes: faker.datatype.boolean({ probability: 0.4 }) ? faker.lorem.sentence() : null,
    });
  }
  return items;
}

export function buildTrainingGaps(requirements: TrainingRequirement[]): TrainingGap[] {
  const depts = ["Warehouse Operations", "Fleet & Delivery", "Customer Service", "People & Culture", "Finance"];
  const gaps: TrainingGap[] = [];
  let i = 0;
  for (const req of requirements.slice(0, 8)) {
    for (const dept of faker.helpers.arrayElements(depts, { min: 1, max: 2 })) {
      const required = faker.number.int({ min: 10, max: 40 });
      const allocated = faker.number.int({ min: 0, max: required });
      const completed = faker.number.int({ min: 0, max: allocated });
      gaps.push({ id: `gap_${i++}`, requirementTitle: req.title, departmentName: dept, required, allocated, completed });
    }
  }
  return gaps;
}
