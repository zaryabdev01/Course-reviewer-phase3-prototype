import { db } from "@/mocks/db";
import { delay } from "./client";

export async function listLeases() {
  return delay(db.leases);
}

export async function listLeaseListings() {
  return delay(db.leaseListings);
}

export async function listDeployments() {
  return delay(db.deployments);
}

export async function listUsageAlerts() {
  return delay(db.usageAlerts);
}
