import { z } from "zod";
import { idSchema, isoDateTimeSchema, jobStatusSchema } from "./common";

export const reportTypeSchema = z.enum([
  "learner",
  "group",
  "overall",
  "revenue",
]);
export type ReportType = z.infer<typeof reportTypeSchema>;

export const downloadJobSchema = z.object({
  id: idSchema,
  label: z.string(),
  reportType: reportTypeSchema,
  status: jobStatusSchema,
  requestedAt: isoDateTimeSchema,
  readyAt: isoDateTimeSchema.nullable(),
  fileSizeKb: z.number().int().nonnegative().nullable(),
  requestedBy: z.string(),
  /** A real, client-side-generated CSV blob URL for jobs created this
   * session — null for seeded history, which has no backing file to
   * honestly hand over. */
  fileUrl: z.string().nullable(),
});
export type DownloadJob = z.infer<typeof downloadJobSchema>;

export const trainingReportRowSchema = z.object({
  learnerName: z.string(),
  courseTitle: z.string(),
  status: z.enum(["completed", "in_progress", "not_started", "overdue"]),
  completedAt: z.string().nullable(),
  score: z.number().min(0).max(100).nullable(),
  timeSpentMinutes: z.number().int().nonnegative(),
});
export type TrainingReportRow = z.infer<typeof trainingReportRowSchema>;
