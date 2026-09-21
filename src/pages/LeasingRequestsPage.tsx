import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLeaseRequestStore } from "@/lib/store/leaseRequestStore";
import { useToastStore } from "@/lib/store/toastStore";
import type { LeaseRequest, LeaseRequestStatus } from "@/contracts";
import { ArrowLeft, Check, Edit3, FileText, X, Mail } from "lucide-react";

const STATUS_TONE: Record<LeaseRequestStatus, "success" | "warning" | "neutral" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  terms_changed: "info",
  quote_sent: "info",
  declined: "danger",
};
const STATUS_LABEL: Record<LeaseRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  terms_changed: "Terms changed",
  quote_sent: "Quote sent",
  declined: "Declined",
};

/**
 * Approval Workflow (spec #12) — the half of "New Course Leasing
 * Request" that was entirely missing: an owner-side inbox with
 * Approve / Change Terms / Send Quote / Decline. Requests submitted
 * from the Distribution Hub's "Courses I Lease" tab land here live
 * (see lib/store/leaseRequestStore).
 */
export function LeasingRequestsPage() {
  const requests = useLeaseRequestStore((s) => s.requests);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [actionFor, setActionFor] = useState<{ request: LeaseRequest; kind: "terms" | "quote" | "decline" } | null>(null);

  const visible = tab === "pending" ? requests.filter((r) => r.status === "pending") : requests;

  return (
    <>
      <Link to="/distribution-hub" className="mb-3 flex items-center gap-1 text-xs font-medium text-primary-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Distribution Hub
      </Link>
      <PageHeader
        title="Leasing Requests"
        description="Incoming Request Access and Request a Quote submissions from organisations wanting to lease your courses."
      />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: "Pending", count: requests.filter((r) => r.status === "pending").length },
            { value: "all", label: "All", count: requests.length },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nothing here" description="No leasing requests to review right now." />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <RequestCard key={r.id} request={r} onAction={(kind) => setActionFor({ request: r, kind })} />
          ))}
        </div>
      )}

      <ResponseModal actionFor={actionFor} onClose={() => setActionFor(null)} />
    </>
  );
}

function RequestCard({ request, onAction }: { request: LeaseRequest; onAction: (kind: "terms" | "quote" | "decline") => void }) {
  const respond = useLeaseRequestStore((s) => s.respond);
  const push = useToastStore((s) => s.push);

  function approve() {
    respond(request.id, "approved", "Approved at standard terms — lease created.");
    push(`Approved — lease created for ${request.requesterOrgName}`);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              {request.route === "request_access" ? "Access request" : "Quote request"} — {request.requesterOrgName}
            </p>
            <p className="text-xs text-muted">
              {request.requesterOrgName} would like {request.route === "request_access" ? "access" : "a quote"} to your "{request.masterCourseTitle}" course for {request.learnerCount.toLocaleString()} learners.
            </p>
          </div>
          <Badge tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
        </div>

        <p className="mt-3 rounded-[10px] bg-gray-50 p-3 text-sm text-ink-soft">"{request.note}"</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted"><Mail className="h-3 w-3" /> {request.requesterContactEmail} · requested {new Date(request.requestedAt).toLocaleDateString()}</p>

        {request.status === "pending" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={approve}><Check className="h-3.5 w-3.5" /> Approve</Button>
            <Button size="sm" variant="secondary" onClick={() => onAction("terms")}><Edit3 className="h-3.5 w-3.5" /> Change terms</Button>
            <Button size="sm" variant="secondary" onClick={() => onAction("quote")}><FileText className="h-3.5 w-3.5" /> Send quote</Button>
            <Button size="sm" variant="danger" onClick={() => onAction("decline")}><X className="h-3.5 w-3.5" /> Decline</Button>
          </div>
        ) : (
          request.responseNote && <p className="mt-3 text-xs text-muted">Response: {request.responseNote}</p>
        )}
      </CardBody>
    </Card>
  );
}

function ResponseModal({ actionFor, onClose }: { actionFor: { request: LeaseRequest; kind: "terms" | "quote" | "decline" } | null; onClose: () => void }) {
  const respond = useLeaseRequestStore((s) => s.respond);
  const push = useToastStore((s) => s.push);
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");

  if (!actionFor) return null;
  const { request, kind } = actionFor;
  const title = kind === "terms" ? "Change terms" : kind === "quote" ? "Send quote" : "Decline request";

  function submit() {
    if (kind === "decline") {
      respond(request.id, "declined", note || "Declined.");
      push(`Declined request from ${request.requesterOrgName}`, "info");
    } else if (kind === "quote") {
      respond(request.id, "quote_sent", `Quote sent: £${price || "0"}. ${note}`.trim());
      push(`Quote sent to ${request.requesterOrgName}`);
    } else {
      respond(request.id, "terms_changed", `Revised terms proposed: ${note}`);
      push(`Revised terms sent to ${request.requesterOrgName}`);
    }
    setNote("");
    setPrice("");
    onClose();
  }

  return (
    <Modal open={!!actionFor} onClose={onClose} title={title} description={`${request.requesterOrgName} — ${request.masterCourseTitle}`}>
      <div className="space-y-4">
        {kind === "quote" && (
          <div>
            <Label>Price (£)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 4500" />
          </div>
        )}
        <div>
          <Label>{kind === "decline" ? "Reason (optional)" : "Note to the requester"}</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-24 w-full rounded-[10px] border border-line bg-white p-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            placeholder={kind === "terms" ? "e.g. 300 learners at £8/learner for 12 months" : ""}
          />
        </div>
        <Button className="w-full" onClick={submit}>
          {kind === "decline" ? "Confirm decline" : kind === "quote" ? "Send quote" : "Send revised terms"}
        </Button>
      </div>
    </Modal>
  );
}
