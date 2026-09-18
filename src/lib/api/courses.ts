import { db } from "@/mocks/db";
import { delay } from "./client";
import type { ReadinessCheckResult } from "@/contracts";

export async function listMasterCourses() {
  return delay(db.masterCourses);
}

export async function getMasterCourse(id: string) {
  return delay(db.masterCourses.find((c) => c.id === id) ?? null);
}

export async function listMasterCourseVersions(masterCourseId: string) {
  return delay(db.masterCourseVersions.filter((v) => v.masterCourseId === masterCourseId));
}

export async function listFormatVariants(masterCourseId: string) {
  return delay(db.formatVariants.filter((v) => v.masterCourseId === masterCourseId));
}

export async function listLearningSetupSettings() {
  return delay(db.learningSetupSettings);
}

export async function listLearningSetupTemplates() {
  return delay(db.learningSetupTemplates);
}

/** Readiness Check (M4): 8 questions, rule-based scoring — no AI cost, per
 * the milestone doc's Technical Details. `yesCount` out of 8 drives the
 * outcome. */
export async function submitReadinessCheck(
  masterCourseId: string,
  yesCount: number,
): Promise<ReadinessCheckResult> {
  const outcome = yesCount >= 6 ? "ready" : "needs_prep";
  const suggestions =
    outcome === "ready"
      ? []
      : [
          "Add a named line manager sign-off step before allocation.",
          "Attach at least one sector-specific scenario in Learning Setup.",
          "Confirm assessment pass mark with your compliance lead.",
        ];
  return delay(
    {
      id: `readiness_${masterCourseId}_${Date.now()}`,
      masterCourseId,
      outcome,
      answeredCount: yesCount,
      suggestions,
      completedAt: new Date().toISOString(),
    },
    500,
  );
}
