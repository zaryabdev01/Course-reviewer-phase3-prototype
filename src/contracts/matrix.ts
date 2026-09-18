import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";

/**
 * Training Matrix (M7/M8) — the core compliance record. Seven statuses,
 * five views. Status is pre-computed (matches the milestone doc's
 * "read-model updated by events" design) rather than derived in the UI,
 * so the same status value drives the grid cell, filters and exports.
 */
export const matrixStatusSchema = z.enum([
  "not_required",
  "required",
  "allocated",
  "in_progress",
  "completed",
  "renewal_due",
  "overdue",
]);
export type MatrixStatus = z.infer<typeof matrixStatusSchema>;

export const MATRIX_STATUS_LABELS: Record<MatrixStatus, string> = {
  not_required: "Not Required",
  required: "Required",
  allocated: "Allocated",
  in_progress: "In Progress",
  completed: "Completed",
  renewal_due: "Renewal Due",
  overdue: "Overdue",
};

export const trainingRequirementSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  title: z.string(),
  masterCourseId: idSchema.nullable(), // nullable: "requirement without a course" (M8)
  masterCourseTitle: z.string().nullable(),
  targetLabel: z.string(), // e.g. "All Staff", "Warehouse (Dept)", "Forklift Operators (Group)"
  recurring: z.boolean(),
  recurrenceMonths: z.number().int().positive().nullable(),
  mandatory: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type TrainingRequirement = z.infer<typeof trainingRequirementSchema>;

export const trainingSourceSchema = z.enum([
  "platform_course",
  "external",
  "virtual",
  "at_venue",
]);
export type TrainingSource = z.infer<typeof trainingSourceSchema>;

export const matrixCellSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  learnerId: idSchema,
  learnerName: z.string(),
  jobRoleTitle: z.string(),
  departmentName: z.string(),
  requirementId: idSchema,
  requirementTitle: z.string(),
  status: matrixStatusSchema,
  source: trainingSourceSchema,
  dueDate: z.string().nullable(),
  completedDate: z.string().nullable(),
  renewalDate: z.string().nullable(),
  evidenceUrl: z.string().nullable(),
  cpdHours: z.number().nonnegative().nullable(),
  cost: z.number().nonnegative().nullable(),
  updatedAt: isoDateTimeSchema,
});
export type MatrixCell = z.infer<typeof matrixCellSchema>;

export const matrixAuditEntrySchema = z.object({
  id: idSchema,
  cellId: idSchema,
  learnerName: z.string(),
  requirementTitle: z.string(),
  field: z.string(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  changedBy: z.string(),
  changedAt: isoDateTimeSchema,
});
export type MatrixAuditEntry = z.infer<typeof matrixAuditEntrySchema>;

export const matrixViewSchema = z.enum([
  "learner",
  "team",
  "role",
  "department",
  "training",
]);
export type MatrixView = z.infer<typeof matrixViewSchema>;

/** Workforce Planner (M8) — planned training tracks places, not named
 * learners, until attendees are confirmed and it converts to allocations. */
export const plannedTrainingSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  title: z.string(),
  requirementId: idSchema.nullable(),
  source: trainingSourceSchema,
  scheduledDate: z.string(),
  placesRequired: z.number().int().nonnegative(),
  placesAssigned: z.number().int().nonnegative(),
  location: z.string().nullable(),
  provider: z.string().nullable(),
});
export type PlannedTraining = z.infer<typeof plannedTrainingSchema>;

export const trainingGapSchema = z.object({
  id: idSchema,
  requirementTitle: z.string(),
  departmentName: z.string(),
  required: z.number().int().nonnegative(),
  allocated: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
});
export type TrainingGap = z.infer<typeof trainingGapSchema>;

export const bulkActionTypeSchema = z.enum([
  "allocate",
  "set_deadline",
  "add_to_planned",
  "assign_learners",
  "send_reminder",
  "set_renewal_date",
  "log_external_training",
  "issue_certificates",
  "export",
]);
export type BulkActionType = z.infer<typeof bulkActionTypeSchema>;

export const BULK_ACTION_LABELS: Record<BulkActionType, string> = {
  allocate: "Allocate course",
  set_deadline: "Set deadline",
  add_to_planned: "Add to planned training",
  assign_learners: "Assign learners to places",
  send_reminder: "Send reminder",
  set_renewal_date: "Set renewal date",
  log_external_training: "Log external training",
  issue_certificates: "Issue certificates",
  export: "Export selection",
};
