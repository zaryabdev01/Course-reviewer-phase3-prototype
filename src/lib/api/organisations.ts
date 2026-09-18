import { db } from "@/mocks/db";
import { buildCsvImportPreview } from "@/mocks/generators/organisations";
import { delay } from "./client";

export async function listOrganisations() {
  return delay(db.organisations);
}

export async function getOrganisation(id: string) {
  return delay(db.organisations.find((o) => o.id === id) ?? null);
}

export async function listOrgUnits(organisationId: string) {
  return delay(db.orgUnits[organisationId] ?? []);
}

export async function listJobRoles(organisationId: string) {
  return delay(db.jobRoles[organisationId] ?? []);
}

export async function listCustomGroups(organisationId: string) {
  return delay(db.customGroups[organisationId] ?? []);
}

export async function listMembers(organisationId: string) {
  return delay(db.members[organisationId] ?? []);
}

export async function listOrgSyncRequests() {
  return delay(db.orgSyncRequests);
}

export async function previewCsvImport() {
  return delay(buildCsvImportPreview(), 700);
}
