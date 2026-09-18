import { db } from "@/mocks/db";
import { delay } from "./client";

export async function listRequirements(organisationId: string) {
  return delay(db.requirements[organisationId] ?? []);
}

export async function listMatrixCells(organisationId: string) {
  return delay(db.matrixCells[organisationId] ?? [], 400);
}

export async function listMatrixAudit() {
  return delay(db.matrixAudit);
}

export async function listPlannedTraining(organisationId: string) {
  return delay(db.plannedTraining[organisationId] ?? []);
}

export async function listTrainingGaps() {
  return delay(db.trainingGaps);
}
