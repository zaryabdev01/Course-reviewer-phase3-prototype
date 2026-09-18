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
} from "@/contracts";
import { freshFaker } from "../seed";
import { masterCourses } from "./courses";

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

export function buildRequirements(organisationId: string): TrainingRequirement[] {
  return REQUIREMENT_TITLES.map((title, i) => {
    const course = masterCourses.find((c) => c.title === title) ?? faker.helpers.arrayElement(masterCourses);
    const recurring = faker.datatype.boolean({ probability: 0.6 });
    return {
      id: `${organisationId}_req_${i}`,
      organisationId,
      title,
      masterCourseId: i === REQUIREMENT_TITLES.length - 1 ? null : course.id,
      masterCourseTitle: i === REQUIREMENT_TITLES.length - 1 ? null : course.title,
      targetLabel: faker.helpers.arrayElement([
        "All Staff",
        "Warehouse Operations (Dept)",
        "Forklift Certified (Group)",
        "Fleet & Delivery (Dept)",
        "New Starters 2026 (Group)",
      ]),
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
      const source = faker.helpers.weightedArrayElement([
        { value: "platform_course" as const, weight: 8 },
        { value: "external" as const, weight: 2 },
        { value: "virtual" as const, weight: 1 },
        { value: "at_venue" as const, weight: 1 },
      ]);
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
        evidenceUrl: source === "external" && completedDate ? "https://evidence.example/cert.pdf" : null,
        cpdHours: source === "external" ? faker.number.int({ min: 1, max: 8 }) : null,
        cost: source === "external" || source === "at_venue" ? faker.number.int({ min: 50, max: 400 }) : null,
        updatedAt: faker.date.recent({ days: 20 }).toISOString(),
      });
    }
  }
  return cells;
}

export function buildAuditTrail(cells: MatrixCell[], count: number): MatrixAuditEntry[] {
  const entries: MatrixAuditEntry[] = [];
  const fields = ["status", "dueDate", "renewalDate", "evidenceUrl"];
  for (let i = 0; i < count; i++) {
    const cell = faker.helpers.arrayElement(cells);
    const field = faker.helpers.arrayElement(fields);
    entries.push({
      id: `audit_${i}`,
      cellId: cell.id,
      learnerName: cell.learnerName,
      requirementTitle: cell.requirementTitle,
      field,
      previousValue: faker.helpers.arrayElement(["Required", "Allocated", "In Progress", null]),
      newValue: faker.helpers.arrayElement(["Completed", "Renewal Due", "Overdue"]),
      changedBy: faker.helpers.arrayElement(["System (scheduler)", "Priya Nair", "Sam Okafor"]),
      changedAt: faker.date.recent({ days: 45 }).toISOString(),
    });
  }
  return entries.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

export function buildPlannedTraining(organisationId: string, requirements: TrainingRequirement[]): PlannedTraining[] {
  const items: PlannedTraining[] = [];
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
