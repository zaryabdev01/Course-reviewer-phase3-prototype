/** Static department/group targets, matching the generator's
 * `targetOptionsFor()` in mocks/generators/matrix.ts. Job-role targets
 * are appended separately by callers that have `listJobRoles` data,
 * since roles are seeded per organisation and departments/groups here
 * are not. */
export const TARGET_OPTIONS_BASE = [
  "All Staff",
  "Warehouse Operations (Dept)",
  "Fleet & Delivery (Dept)",
  "Customer Service (Dept)",
  "Forklift Certified (Group)",
  "New Starters 2026 (Group)",
];
