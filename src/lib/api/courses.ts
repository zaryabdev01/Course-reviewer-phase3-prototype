import { db } from "@/mocks/db";
import { delay } from "./client";
import type { ReadinessAnswers, ReadinessCheckResult } from "@/contracts";

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

/** Readiness Check: a learner wellness check ("How is your energy level
 * right now?", "Are you hydrated?" etc.), not a content-quality one —
 * rule-based scoring, no AI cost, straight from the client's own spec.
 * Each suggestion maps to one of the five the brief names verbatim
 * (drink water, quick snack, quieter place, short break, return later). */
export async function submitReadinessCheck(
  masterCourseId: string,
  answers: ReadinessAnswers,
): Promise<ReadinessCheckResult> {
  const suggestions: string[] = [];
  if (answers.hydrated === "could_use_water") suggestions.push("Drink some water");
  if (answers.eaten === "no" || answers.energy === "low") suggestions.push("Have a quick snack");
  if (answers.environment !== "yes") suggestions.push("Move somewhere quieter");
  if (answers.rested === "poorly" || answers.stress === "high") suggestions.push("Take a short break");
  if (answers.readyToStart !== "ready_now") suggestions.push("Return when you can focus properly");

  const flagCount = [
    answers.energy === "low",
    answers.eaten === "no",
    answers.hydrated === "could_use_water",
    answers.rested === "poorly",
    answers.attention === "no",
    answers.environment === "no",
    answers.stress === "high",
    answers.readyToStart !== "ready_now",
  ].filter(Boolean).length;
  const outcome = flagCount === 0 ? "ready" : "needs_prep";

  return delay(
    {
      id: `readiness_${masterCourseId}_${Date.now()}`,
      masterCourseId,
      outcome,
      suggestions: Array.from(new Set(suggestions)),
      completedAt: new Date().toISOString(),
    },
    500,
  );
}
