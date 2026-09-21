import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useActivePersona } from "@/lib/store/personaStore";
import { useToastStore } from "@/lib/store/toastStore";
import { listLeases } from "@/lib/api/distribution";
import { listMembers } from "@/lib/api/organisations";
import { DELIVERY_METHOD_LABELS, LEASE_BILLING_LABELS, type Lease, type LeaseStatus } from "@/contracts";
import { Users, ChevronDown, ArrowRight, Rocket, Info } from "lucide-react";

const STATUS_TONE: Record<LeaseStatus, "success" | "warning" | "neutral" | "danger"> = {
  active: "success",
  pending_approval: "warning",
  paused: "neutral",
  expired: "neutral",
  revoked: "danger",
  draft: "neutral",
};

/**
 * The customer-side half of the Training Distribution Hub (spec #19,
 * "Customer Experience") — the half of leasing this prototype was
 * missing entirely until now. Everything else in the Hub is the course
 * *owner* looking outward; this page is what a leasing organisation
 * (here, Northfield Retail Group) sees of their own leased courses,
 * their own learners' progress, and what data actually flows to/from
 * their LMS — without needing to understand SCORM, xAPI or LTI.
 */
export function MyLeasedCoursesPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;

  const { data: allLeases, isLoading } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });

  const myLeases = (allLeases ?? []).filter((l) => l.customerOrganisationId === orgId);
  const learners = (members ?? []).filter((m) => m.role === "team_member").slice(0, 8);

  return (
    <>
      <PageHeader
        title="My Leased Courses"
        description="Training your organisation has licensed from other course owners — find, launch and track it here, without needing to know SCORM, xAPI or LTI."
      />

      {isLoading ? null : myLeases.length === 0 ? (
        <EmptyState
          title="Nothing leased yet"
          description={`${persona.label.split(" — ")[0].split(" ").pop()}'s organisation hasn't licensed any courses from another owner. Browse the public marketplace to find training you can lease.`}
        />
      ) : (
        <div className="space-y-4">
          {myLeases.map((lease) => (
            <LeaseCard key={lease.id} lease={lease} learners={learners} />
          ))}
        </div>
      )}
    </>
  );
}

function LeaseCard({ lease, learners }: { lease: Lease; learners: { id: string; fullName: string }[] }) {
  const push = useToastStore((s) => s.push);
  const [showLearners, setShowLearners] = useState(false);
  const [showDataExchange, setShowDataExchange] = useState(false);
  const usedPercent = lease.licencesTotal ? (lease.licencesUsed / lease.licencesTotal) * 100 : 0;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{lease.masterCourseTitle}</p>
            <p className="text-xs text-muted">
              {LEASE_BILLING_LABELS[lease.billingModel]} · {DELIVERY_METHOD_LABELS[lease.deliveryMethod]}
            </p>
          </div>
          <Badge tone={STATUS_TONE[lease.status]}>{lease.status.replace("_", " ")}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-muted">Licences</p>
            <p className="text-sm font-medium text-ink">{lease.licencesUsed}/{lease.licencesTotal}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">Learners launched</p>
            <p className="text-sm font-medium text-ink">{lease.learnersLaunched}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">Completions</p>
            <p className="text-sm font-medium text-ink">{lease.completions}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted">Expires</p>
            <p className="text-sm font-medium text-ink">{lease.endDate ?? "No expiry set"}</p>
          </div>
        </div>
        <ProgressBar percent={usedPercent} tone={usedPercent > 80 ? "warning" : "brand"} className="mt-3" />
        {usedPercent > 80 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-warning-soft px-3 py-2">
            <p className="text-xs text-warning-dark">{Math.round(usedPercent)}% of your course licences have been used.</p>
            <Button size="sm" variant="secondary" onClick={() => push(`Requested more licences for "${lease.masterCourseTitle}" — Acme will follow up with pricing`)}>
              Purchase More Licences
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => push(`Launching "${lease.masterCourseTitle}" via ${DELIVERY_METHOD_LABELS[lease.deliveryMethod]}…`, "info")}>
            <Rocket className="h-3.5 w-3.5" /> Launch course
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowLearners((v) => !v)}>
            <Users className="h-3.5 w-3.5" /> Track my learners <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showLearners ? "rotate-180" : ""}`} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDataExchange((v) => !v)}>
            <Info className="h-3.5 w-3.5" /> What data is shared with my LMS?
          </Button>
        </div>

        {showLearners && (
          <div className="mt-4 rounded-[10px] border border-line p-3">
            <p className="mb-2 text-xs font-semibold text-ink">Your learners on this course</p>
            <div className="space-y-1.5">
              {learners.map((l, i) => {
                const progress = [100, 100, 62, 40, 15, 0, 0, 100][i % 8];
                return (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-soft">{l.fullName}</span>
                    <div className="flex items-center gap-2">
                      <ProgressBar percent={progress} className="w-24" />
                      <Badge tone={progress === 100 ? "success" : progress > 0 ? "warning" : "neutral"}>
                        {progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1 text-[11px] text-muted">
              This behaves like training inside your own LMS — results shown here are what your platform receives back from Acme's system on every launch and completion.
            </p>
          </div>
        )}

        {showDataExchange && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-[10px] border border-line p-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Sent when a learner launches</p>
              <div className="flex flex-wrap gap-1">
                {["Learner ID", "Name", "Email", "Organisation", "Course ID", "Launch ID"].map((f) => (
                  <Badge key={f} tone="neutral">{f}</Badge>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">Only the minimum needed for delivery and reporting — nothing else leaves your LMS.</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Returned to your LMS</p>
              <div className="flex flex-wrap gap-1">
                {["Started", "In Progress", "Completed", "Passed/Failed", "Score", "Completion date", "Time spent"].map((f) => (
                  <Badge key={f} tone="brand">{f}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
