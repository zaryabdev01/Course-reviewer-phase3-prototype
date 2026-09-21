import { create } from "zustand";
import { db } from "@/mocks/db";
import type { LeaseRequest, LeaseRequestStatus } from "@/contracts";

/**
 * Shared across pages so a request submitted from the Distribution Hub's
 * "Courses I Lease" tab (a customer clicking Request Access/Quote) shows
 * up immediately in the owner-side Leasing Requests inbox — closing the
 * approval workflow loop end to end (spec #12) instead of each page
 * holding its own disconnected copy.
 */
interface LeaseRequestState {
  requests: LeaseRequest[];
  addRequest: (r: LeaseRequest) => void;
  respond: (id: string, status: LeaseRequestStatus, responseNote: string) => void;
}

export const useLeaseRequestStore = create<LeaseRequestState>((set) => ({
  requests: db.leaseRequests,
  addRequest: (r) => set((s) => ({ requests: [r, ...s.requests] })),
  respond: (id, status, responseNote) =>
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status, responseNote, respondedAt: new Date().toISOString() } : r)),
    })),
}));
