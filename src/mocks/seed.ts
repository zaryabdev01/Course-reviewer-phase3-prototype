import { faker } from "@faker-js/faker";

/**
 * Fixed seed = reproducible demo data. Every reload shows the same
 * organisation, the same overdue learners, the same lease revenue —
 * important when this is being screen-shared with a client repeatedly
 * across a sales/UAT cycle. Change the seed to get a different but still
 * internally-consistent dataset.
 */
export const SEED = 8421;

export function freshFaker() {
  faker.seed(SEED);
  return faker;
}

export const ORG_ACME_ID = "org_acme";
export const ORG_BRIGHTPATH_ID = "org_brightpath";
/** Acme's biggest lease customer (see mocks/generators/distribution.ts) —
 * seeded as a real, lightweight organisation so there's a persona that
 * can experience the Distribution Hub as the *customer* leasing a
 * course, not only as the owner leasing it out. */
export const ORG_NORTHFIELD_ID = "org_northfield";

export const SECTORS = [
  "Health & Safety",
  "Compliance",
  "Leadership",
  "Data Protection",
  "Manual Handling",
  "Fire Safety",
  "Food Hygiene",
  "Cyber Security",
  "Equality & Diversity",
  "First Aid",
];

export const AVATAR_COLORS = [
  "#16a34a",
  "#0d9488",
  "#f79009",
  "#4f39f6",
  "#e62e2e",
  "#106b32",
];

export function pickAvatarColor(seedStr: string) {
  const idx =
    Math.abs(
      seedStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0),
    ) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
