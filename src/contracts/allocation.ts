import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";
import { learningFormatSchema } from "./course";

export const allocationTargetTypeSchema = z.enum(["learner", "group", "org_unit"]);
export type AllocationTargetType = z.infer<typeof allocationTargetTypeSchema>;

export const allocationStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "completed",
  "overdue",
  "removed",
]);
export type AllocationStatus = z.infer<typeof allocationStatusSchema>;

export const allocationSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  masterCourseId: idSchema,
  masterCourseTitle: z.string(),
  targetType: allocationTargetTypeSchema,
  targetId: idSchema,
  targetLabel: z.string(),
  formatChoice: z.enum(["learner_choice", "fixed"]),
  fixedFormat: learningFormatSchema.nullable(),
  deadline: z.string().nullable(),
  appearInMatrix: z.boolean(),
  status: allocationStatusSchema,
  progressPercent: z.number().min(0).max(100),
  allocatedAt: isoDateTimeSchema,
  allocatedBy: z.string(),
  seatConsumed: z.boolean(),
  history: z.array(
    z.object({
      at: isoDateTimeSchema,
      action: z.enum(["allocated", "reallocated", "removed", "reminder_sent"]),
      by: z.string(),
      note: z.string().optional(),
    }),
  ),
});
export type Allocation = z.infer<typeof allocationSchema>;

export const seatPoolSchema = z.object({
  id: idSchema,
  organisationId: idSchema,
  masterCourseId: idSchema,
  masterCourseTitle: z.string(),
  purchased: z.number().int().nonnegative(),
  allocated: z.number().int().nonnegative(),
  consumed: z.number().int().nonnegative(),
  source: z.enum(["synced_organisation", "bought", "added"]),
});
export type SeatPool = z.infer<typeof seatPoolSchema>;

export const developmentItemSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  title: z.string(),
  source: z.enum(["synced_organisation", "bought", "added"]),
  sourceLabel: z.string(),
  addedAt: isoDateTimeSchema,
  progressPercent: z.number().min(0).max(100),
});
export type DevelopmentItem = z.infer<typeof developmentItemSchema>;
