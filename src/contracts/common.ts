import { z } from "zod";

/**
 * Shared primitives used across every contract file. Keeping these in one
 * place means the eventual real backend has one place to check its
 * response shapes against, instead of ad-hoc `string` fields scattered
 * through a dozen files.
 */

export const idSchema = z.string().min(1);
export type Id = z.infer<typeof idSchema>;

export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const isoDateSchema = z.iso.date();

/** Account types from the Phase 3 milestone plan (M2) — replaces the
 * Phase 2 role enum (user/content_creator/peer_reviewer/hybrid_user/admin/
 * super_admin). See phase2-codebase-facts memory for why this is a real
 * rebuild, not a column rename. */
export const accountTypeSchema = z.enum([
  "professional",
  "organisational",
  "platform_admin",
  "platform_super_admin",
]);
export type AccountType = z.infer<typeof accountTypeSchema>;

/** Organisation-scoped role, only meaningful when accountType is
 * "organisational". A user can hold this role in more than one
 * organisation (professional-to-organisation syncing, M2). */
export const organisationRoleSchema = z.enum([
  "org_administrator",
  "org_manager",
  "team_member",
]);
export type OrganisationRole = z.infer<typeof organisationRoleSchema>;

/** The full "who am I acting as right now" identity the persona switcher
 * manipulates. A professional with two synced organisations has one
 * ProfessionalIdentity and two OrganisationIdentity entries. */
export const personaSchema = z.object({
  id: idSchema,
  label: z.string(),
  accountType: accountTypeSchema,
  organisationId: idSchema.optional(),
  organisationRole: organisationRoleSchema.optional(),
  avatarColor: z.string(),
  email: z.string().email(),
});
export type Persona = z.infer<typeof personaSchema>;

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Async job status shared by conversion jobs, report exports, and
 * bulk-action jobs — one shape, three consumers. */
export const jobStatusSchema = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;
