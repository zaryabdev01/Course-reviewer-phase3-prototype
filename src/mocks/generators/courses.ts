import type {
  MasterCourse,
  MasterCourseVersion,
  FormatVariant,
  LearningFormat,
  LearningSetupSetting,
  LearningSetupTemplate,
} from "@/contracts";
import { freshFaker, ORG_ACME_ID, SECTORS } from "../seed";

const faker = freshFaker();

const COURSE_TITLES = [
  "Manual Handling Essentials",
  "Forklift Operation & Safety",
  "GDPR & Data Protection Refresher",
  "Fire Safety Awareness",
  "Working at Height",
  "Food Hygiene Level 2",
  "Cyber Security Fundamentals",
  "Equality, Diversity & Inclusion",
  "First Aid at Work",
  "Conflict Resolution for Frontline Staff",
  "Leading High-Performing Teams",
  "Display Screen Equipment (DSE)",
  "COSHH Awareness",
  "Anti-Bribery & Corruption",
];

const ALL_FORMATS: LearningFormat[] = [
  "reading",
  "interactive",
  "podcast",
  "audio_lesson",
  "video",
  "animation",
];

export const masterCourses: MasterCourse[] = COURSE_TITLES.map((title, i) => {
  const sourceType = faker.helpers.weightedArrayElement([
    { value: "ai_generated" as const, weight: 6 },
    { value: "uploaded_material" as const, weight: 2 },
    { value: "scorm" as const, weight: 2 },
    { value: "url" as const, weight: 1 },
  ]);
  const bypass = sourceType === "scorm" || sourceType === "url";
  return {
    id: `course_${i}`,
    title,
    description: faker.lorem.sentences(2),
    sourceType,
    sector: SECTORS[i % SECTORS.length],
    currentVersion: faker.number.int({ min: 1, max: 4 }),
    ownerName: i % 3 === 0 ? "Acme Logistics Ltd" : "SAARZ Content Team",
    ownerOrganisationId: i % 3 === 0 ? ORG_ACME_ID : null,
    bypassAiConversion: bypass,
    moduleCount: faker.number.int({ min: 4, max: 12 }),
    estimatedMinutes: faker.number.int({ min: 20, max: 90 }),
    availableFormats: bypass
      ? []
      : faker.helpers.arrayElements(ALL_FORMATS, { min: 2, max: 6 }),
    publishedAt: faker.date.past({ years: 1 }).toISOString(),
    thumbnailColor: faker.helpers.arrayElement([
      "#16a34a", "#0d9488", "#f79009", "#4f39f6", "#e62e2e", "#106b32",
    ]),
    priceCredits: bypass ? null : faker.number.int({ min: 40, max: 320 }),
    isFree: faker.datatype.boolean({ probability: 0.2 }),
  };
});

export const masterCourseVersions: MasterCourseVersion[] = masterCourses.flatMap((c) => {
  const versions: MasterCourseVersion[] = [];
  for (let v = 1; v <= c.currentVersion; v++) {
    versions.push({
      id: `${c.id}_v${v}`,
      masterCourseId: c.id,
      versionNumber: v,
      changeNote:
        v === 1
          ? "Initial publish"
          : faker.helpers.arrayElement([
              "Updated regulatory references",
              "Refreshed module 3 case studies",
              "Corrected assessment answer key",
              "Added new module on remote working",
            ]),
      publishedAt: faker.date.past({ years: 1 }).toISOString(),
      publishedBy: faker.person.fullName(),
      isCurrent: v === c.currentVersion,
    });
  }
  return versions;
});

export const learningSetupSettings: LearningSetupSetting[] = [
  { key: "tone", label: "Tone of voice", contentAffecting: true, options: ["Formal", "Conversational", "Encouraging"] },
  { key: "depth", label: "Depth of coverage", contentAffecting: true, options: ["Overview", "Standard", "In-depth"] },
  { key: "scenario_style", label: "Scenario style", contentAffecting: true, options: ["Generic", "Sector-specific", "Role-specific"] },
  { key: "language", label: "Language", contentAffecting: true, options: ["English (UK)", "English (US)", "Welsh"] },
  { key: "assessment_style", label: "Assessment style", contentAffecting: true, options: ["Multiple choice", "Scenario-based", "Mixed"] },
  { key: "pace", label: "Pace", contentAffecting: false, options: ["Relaxed", "Standard", "Fast"] },
  { key: "captions", label: "Captions", contentAffecting: false, options: ["On", "Off"] },
  { key: "text_size", label: "Larger text", contentAffecting: false, options: ["Standard", "Large", "Extra large"] },
  { key: "reduced_motion", label: "Reduced motion", contentAffecting: false, options: ["Standard", "Reduced"] },
  { key: "extra_time", label: "Extra time on assessments", contentAffecting: false, options: ["Standard", "+25%", "+50%"] },
];

export const learningSetupTemplates: LearningSetupTemplate[] = [
  {
    id: "lst_default",
    name: "Platform default",
    ownerName: "System",
    isDefault: true,
    values: { tone: "Conversational", depth: "Standard", scenario_style: "Generic", language: "English (UK)", assessment_style: "Mixed", pace: "Standard", captions: "On", text_size: "Standard", reduced_motion: "Standard", extra_time: "Standard" },
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "lst_warehouse",
    name: "Warehouse & Ops (Acme)",
    ownerName: "Priya Nair",
    isDefault: false,
    values: { tone: "Encouraging", depth: "Overview", scenario_style: "Role-specific", language: "English (UK)", assessment_style: "Scenario-based", pace: "Standard", captions: "On", text_size: "Standard", reduced_motion: "Standard", extra_time: "Standard" },
    createdAt: "2025-11-10T09:00:00Z",
  },
  {
    id: "lst_accessible",
    name: "Accessible / low-vision",
    ownerName: "Priya Nair",
    isDefault: false,
    values: { tone: "Formal", depth: "Standard", scenario_style: "Generic", language: "English (UK)", assessment_style: "Multiple choice", pace: "Relaxed", captions: "On", text_size: "Extra large", reduced_motion: "Reduced", extra_time: "+50%" },
    createdAt: "2026-02-18T09:00:00Z",
  },
];

function makeVariantKey(masterCourseId: string, version: number, format: LearningFormat, templateId: string) {
  return `${masterCourseId}:v${version}:${format}:${templateId}`;
}

export const formatVariants: FormatVariant[] = masterCourses.flatMap((c) => {
  if (c.bypassAiConversion) return [];
  return c.availableFormats.map((format) => {
    const reused = faker.datatype.boolean({ probability: 0.35 });
    const template = faker.helpers.arrayElement(learningSetupTemplates);
    const status = faker.helpers.weightedArrayElement([
      { value: "ready" as const, weight: 8 },
      { value: "processing" as const, weight: 1 },
      { value: "queued" as const, weight: 1 },
    ]);
    return {
      id: `variant_${c.id}_${format}`,
      masterCourseId: c.id,
      masterVersion: c.currentVersion,
      format,
      variantKey: makeVariantKey(c.id, c.currentVersion, format, template.id),
      status,
      reused,
      generatedAt: status === "ready" ? faker.date.recent({ days: 60 }).toISOString() : null,
      costTokens: format === "reading" || format === "interactive"
        ? faker.number.int({ min: 2000, max: 14000 })
        : null,
      costTtsCharacters: format === "podcast" || format === "audio_lesson"
        ? faker.number.int({ min: 4000, max: 22000 })
        : null,
      fidelityScore: status === "ready" ? faker.number.int({ min: 82, max: 100 }) : null,
      fidelityStatus: status === "ready"
        ? faker.helpers.weightedArrayElement([
            { value: "passed" as const, weight: 9 },
            { value: "flagged" as const, weight: 1 },
          ])
        : "pending",
    };
  });
});
