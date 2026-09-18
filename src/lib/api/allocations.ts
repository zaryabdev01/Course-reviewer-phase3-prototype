import { db } from "@/mocks/db";
import { delay } from "./client";

export async function listAllocations(organisationId: string) {
  return delay(db.allocations[organisationId] ?? []);
}

export async function listSeatPools(organisationId: string) {
  return delay(db.seatPools[organisationId] ?? []);
}

export async function listDevelopmentItems() {
  return delay(db.developmentItems);
}
