import { db } from "@/mocks/db";
import { delay } from "./client";

export async function listDownloadJobs() {
  return delay(db.downloadJobs);
}

export async function listTrainingReportRows() {
  return delay(db.trainingReportRows, 400);
}

export async function listNotifications() {
  return delay(db.notifications);
}

export async function listMessageThreads() {
  return delay(db.messageThreads);
}

export async function listMessages(threadId: string) {
  return delay(db.messagesByThread[threadId] ?? []);
}

export async function listInvoices() {
  return delay(db.invoices);
}

export async function listRevenueLines() {
  return delay(db.revenueLines);
}

export async function listAuditLog() {
  return delay(db.auditLog, 400);
}
