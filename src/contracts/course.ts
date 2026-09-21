import { z } from "zod";
import { idSchema, isoDateTimeSchema, jobStatusSchema } from "./common";

/**
 * Master courses (M3/M4). A master course version is immutable once
 * published — Phase 2's ContentLibraryVersion is already append-only
 * (see phase2-codebase-facts), so this models the same "never mutate,
 * always snapshot" shape at the master-course level.
 */

export const courseSourceTypeSchema = z.enum([
  "ai_generated",
  "uploaded_material",
  "scorm",
  "url",
]);
export type CourseSourceType = z.infer<typeof courseSourceTypeSchema>;

export const learningFormatSchema = z.enum([
  "reading",
  "interactive",
  "podcast",
  "audio_lesson",
  "video",
  "animation",
]);
export type LearningFormat = z.infer<typeof learningFormatSchema>;

export const FORMAT_LABELS: Record<LearningFormat, string> = {
  reading: "Reading",
  interactive: "Interactive Course",
  podcast: "Podcast",
  audio_lesson: "Audio Lesson",
  video: "Video-led",
  animation: "Animation",
};

export const masterCourseVersionSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  versionNumber: z.number().int().positive(),
  changeNote: z.string(),
  publishedAt: isoDateTimeSchema,
  publishedBy: z.string(),
  isCurrent: z.boolean(),
});
export type MasterCourseVersion = z.infer<typeof masterCourseVersionSchema>;

export const masterCourseSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string(),
  sourceType: courseSourceTypeSchema,
  sector: z.string(),
  currentVersion: z.number().int().positive(),
  ownerName: z.string(),
  ownerOrganisationId: idSchema.nullable(),
  bypassAiConversion: z.boolean(), // true for scorm/url per M3
  moduleCount: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().nonnegative(),
  availableFormats: z.array(learningFormatSchema),
  publishedAt: isoDateTimeSchema,
  thumbnailColor: z.string(),
  priceCredits: z.number().int().nonnegative().nullable(),
  isFree: z.boolean(),
  /** Course Marketplace (Distribution Hub spec #10) — whether other
   * organisations can find and lease this course at all. "private"
   * courses never appear in leaseListings regardless of anything else. */
  leaseVisibility: z.enum(["private", "leasable"]),
});
export type MasterCourse = z.infer<typeof masterCourseSchema>;

/**
 * The variant key (M4 Technical Details): masterVersion + format +
 * content-affecting settings only. Render-time settings (pace, captions,
 * larger text, reduced motion) are deliberately excluded — that's what
 * makes the cache hit. See phase3-timeline-risk-assessment memory:
 * unit economics depend entirely on how many settings below are marked
 * contentAffecting: true.
 */
export const learningSetupSettingSchema = z.object({
  key: z.string(),
  label: z.string(),
  contentAffecting: z.boolean(),
  options: z.array(z.string()),
});
export type LearningSetupSetting = z.infer<typeof learningSetupSettingSchema>;

export const learningSetupTemplateSchema = z.object({
  id: idSchema,
  name: z.string(),
  ownerName: z.string(),
  isDefault: z.boolean(),
  values: z.record(z.string(), z.string()),
  createdAt: isoDateTimeSchema,
});
export type LearningSetupTemplate = z.infer<typeof learningSetupTemplateSchema>;

export const formatVariantSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  masterVersion: z.number().int().positive(),
  format: learningFormatSchema,
  variantKey: z.string(),
  status: jobStatusSchema,
  reused: z.boolean(), // true when this generation was served from cache, not a new AI call
  generatedAt: isoDateTimeSchema.nullable(),
  costTokens: z.number().int().nonnegative().nullable(),
  costTtsCharacters: z.number().int().nonnegative().nullable(),
  fidelityScore: z.number().min(0).max(100).nullable(),
  fidelityStatus: z.enum(["passed", "flagged", "pending"]).nullable(),
});
export type FormatVariant = z.infer<typeof formatVariantSchema>;

export const readinessOutcomeSchema = z.enum(["ready", "needs_prep"]);

export const readinessCheckResultSchema = z.object({
  id: idSchema,
  masterCourseId: idSchema,
  outcome: readinessOutcomeSchema,
  answeredCount: z.number().int().min(0).max(8),
  suggestions: z.array(z.string()),
  completedAt: isoDateTimeSchema,
});
export type ReadinessCheckResult = z.infer<typeof readinessCheckResultSchema>;
