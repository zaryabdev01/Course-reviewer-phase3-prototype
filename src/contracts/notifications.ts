import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common";

export const notificationCategorySchema = z.enum([
  "allocation",
  "deadline",
  "format_ready",
  "report_ready",
  "renewal",
  "qa",
  "lease_alert",
  "system",
  "message",
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  allocation: "Allocations",
  deadline: "Deadlines",
  format_ready: "Format ready",
  report_ready: "Report ready",
  renewal: "Renewals",
  qa: "Course Q&A",
  lease_alert: "Lease alerts",
  system: "System",
  message: "Messages",
};

export const notificationSchema = z.object({
  id: idSchema,
  category: notificationCategorySchema,
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: isoDateTimeSchema,
  actionHref: z.string().nullable(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;

export const messageThreadTypeSchema = z.enum([
  "direct",
  "peer_review",
  "org_broadcast",
  "course_qa",
  "crm_broadcast",
]);
export type MessageThreadType = z.infer<typeof messageThreadTypeSchema>;

/** Who an org_broadcast targets — M6: "organisation to team (person, group,
 * all staff)". Null for thread types this doesn't apply to. */
export const broadcastAudienceSchema = z.enum(["person", "group", "all_staff"]);
export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>;

export const messageThreadSchema = z.object({
  id: idSchema,
  type: messageThreadTypeSchema,
  subject: z.string(),
  participants: z.array(z.string()),
  lastMessagePreview: z.string(),
  lastMessageAt: isoDateTimeSchema,
  unreadCount: z.number().int().nonnegative(),
  courseTitle: z.string().nullable(),
  broadcastAudience: broadcastAudienceSchema.nullable(),
  /** CRM segment this broadcast targeted, e.g. "Free plan users",
   * "Inactive 30+ days" — only set for crm_broadcast threads. */
  segment: z.string().nullable(),
});
export type MessageThread = z.infer<typeof messageThreadSchema>;

export const messageSchema = z.object({
  id: idSchema,
  threadId: idSchema,
  authorName: z.string(),
  body: z.string(),
  sentAt: isoDateTimeSchema,
  isSelf: z.boolean(),
});
export type Message = z.infer<typeof messageSchema>;
