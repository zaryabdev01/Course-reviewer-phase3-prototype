import { z } from "zod";
import { idSchema, isoDateTimeSchema, organisationRoleSchema } from "./common";

/**
 * Organisation structure (M2). NOTE: Phase 2 had an `organizations` table
 * once and dropped it two days before this plan was dated (see
 * phase2-codebase-facts memory) — this is a fresh design, not a restore of
 * the old flat organization_id-per-row model. Org units are hierarchical
 * (locations > departments > teams) because Matrix rules (M7) and bulk
 * allocation (M8) both need to target "everyone in Sales EMEA", not just
 * "everyone with this one flat org_id".
 */

export const orgUnitTypeSchema = z.enum(["location", "department", "team"]);
export type OrgUnitType = z.infer<typeof orgUnitTypeSchema>;

export const orgUnitSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  type: orgUnitTypeSchema,
  name: z.string(),
  parentId: idSchema.nullable(),
  headCount: z.number().int().nonnegative(),
});
export type OrgUnit = z.infer<typeof orgUnitSchema>;

export const jobRoleSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  title: z.string(),
  headCount: z.number().int().nonnegative(),
});
export type JobRole = z.infer<typeof jobRoleSchema>;

/** Custom groups are orthogonal to the location/department/team hierarchy
 * — e.g. "New Starters 2026", "Forklift Certified" — used as allocation
 * and Matrix targeting units in their own right. */
export const customGroupSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  name: z.string(),
  memberIds: z.array(idSchema),
  memberCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
});
export type CustomGroup = z.infer<typeof customGroupSchema>;

export const organisationSchema = z.object({
  id: idSchema,
  name: z.string(),
  logoColor: z.string(),
  industry: z.string(),
  seatCount: z.number().int().nonnegative(),
  learnerCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
});
export type Organisation = z.infer<typeof organisationSchema>;

export const orgMemberStatusSchema = z.enum([
  "active",
  "invited",
  "left",
]);

export const orgMemberSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  userId: idSchema,
  fullName: z.string(),
  email: z.string().email(),
  role: organisationRoleSchema,
  jobRoleId: idSchema.nullable(),
  orgUnitId: idSchema.nullable(),
  lineManagerId: idSchema.nullable(),
  status: orgMemberStatusSchema,
  invitedAt: isoDateTimeSchema,
  startDate: z.string().nullable(),
});
export type OrgMember = z.infer<typeof orgMemberSchema>;

/** A professional account synced to an organisation (M2) — distinct from
 * org membership because a synced professional keeps their personal
 * Content Library and can unsync; an org_administrator invite creates a
 * member directly with no consent step. */
export const orgSyncRequestSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  organisationName: z.string(),
  professionalEmail: z.string().email(),
  status: z.enum(["pending", "accepted", "declined", "unsynced"]),
  requestedAt: isoDateTimeSchema,
});
export type OrgSyncRequest = z.infer<typeof orgSyncRequestSchema>;

export const csvImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  fullName: z.string(),
  email: z.string(),
  jobRoleTitle: z.string(),
  orgUnitName: z.string(),
  lineManagerEmail: z.string().optional(),
  status: z.enum(["valid", "warning", "error"]),
  message: z.string().optional(),
});
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;
