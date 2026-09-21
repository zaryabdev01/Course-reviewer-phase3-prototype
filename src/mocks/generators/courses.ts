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
    leaseVisibility: bypass ? "private" : faker.helpers.weightedArrayElement([{ value: "leasable" as const, weight: 6 }, { value: "private" as const, weight: 4 }]),
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

/**
 * The exact 10-question Learning Experience Setup provided by the client
 * (superseding the earlier tone/depth/language set, which was this
 * prototype's own invention, not the spec). Setting 1 ("How would you
 * like to learn today?") is the format preference itself — it's carried
 * forward to pre-highlight a card on Choose Learning Format rather than
 * being part of the variant key. Settings 2-10 split content-affecting
 * (changes what the AI generates) vs render-time-only (changes how the
 * same generated content is presented) — see LearningSetupPage.
 */
export const learningSetupSettings: LearningSetupSetting[] = [
  { key: "format_preference", label: "How would you like to learn today?", contentAffecting: false, options: ["Interactive Course", "Podcast", "Audio Lesson", "Animation", "Video-led", "Reading", "Choose for me"] },
  { key: "section_length", label: "How long do you prefer each learning section to be?", contentAffecting: true, options: ["2–3 mins", "5 mins", "10 mins", "Longer sections"] },
  { key: "learning_style", label: "How do you learn best?", contentAffecting: true, options: ["Real-life scenarios", "Step-by-step explanations", "Visual examples", "Stories/conversations", "Facts & key points", "A mixture"] },
  { key: "interaction_level", label: "How much interaction would you like?", contentAffecting: true, options: ["Minimal", "Some interaction", "Highly interactive"] },
  { key: "knowledge_checks", label: "How would you like knowledge checks presented?", contentAffecting: true, options: ["Quick questions throughout", "Scenario decisions", "End-of-section quizzes", "Mainly final assessment", "Mixed"] },
  { key: "explanation_level", label: "What level of explanation suits you?", contentAffecting: true, options: ["Simple & concise", "Balanced", "Detailed", "Explain unfamiliar terms"] },
  { key: "pace", label: "What pace would you like?", contentAffecting: false, options: ["Quick", "Normal", "Take my time"] },
  { key: "emphasis", label: "How would you like important information highlighted?", contentAffecting: true, options: ["Key-point summaries", "Visual callouts", "Examples", "Repeat important points", "All of these"] },
  { key: "accessibility", label: "Would anything make the course easier to use?", contentAffecting: false, options: ["Captions", "Transcript", "Audio narration", "Larger text", "Reduced animation/movement", "Plain English", "Extra time for activities", "None"] },
  { key: "ai_focus", label: "What would you like AI to focus on for you?", contentAffecting: true, options: ["Passing the assessment", "Understanding the subject", "Applying it at work", "Building confidence", "Remembering key information", "Personalise it for me"] },
];

export const learningSetupTemplates: LearningSetupTemplate[] = [
  {
    id: "lst_default",
    name: "Platform default",
    ownerName: "System",
    isDefault: true,
    values: {
      format_preference: "Choose for me", section_length: "5 mins", learning_style: "A mixture", interaction_level: "Some interaction",
      knowledge_checks: "Mixed", explanation_level: "Balanced", pace: "Normal", emphasis: "All of these",
      accessibility: "None", ai_focus: "Understanding the subject",
    },
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "lst_warehouse",
    name: "Warehouse & Ops (Acme)",
    ownerName: "Priya Nair",
    isDefault: false,
    values: {
      format_preference: "Video-led", section_length: "2–3 mins", learning_style: "Real-life scenarios", interaction_level: "Highly interactive",
      knowledge_checks: "Scenario decisions", explanation_level: "Simple & concise", pace: "Quick", emphasis: "Visual callouts",
      accessibility: "Captions, Larger text", ai_focus: "Applying it at work",
    },
    createdAt: "2025-11-10T09:00:00Z",
  },
  {
    id: "lst_accessible",
    name: "Accessible / low-vision",
    ownerName: "Priya Nair",
    isDefault: false,
    values: {
      format_preference: "Audio Lesson", section_length: "Longer sections", learning_style: "Step-by-step explanations", interaction_level: "Minimal",
      knowledge_checks: "Mainly final assessment", explanation_level: "Explain unfamiliar terms", pace: "Take my time", emphasis: "Repeat important points",
      accessibility: "Captions, Transcript, Audio narration, Larger text, Reduced animation/movement, Extra time for activities", ai_focus: "Building confidence",
    },
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
