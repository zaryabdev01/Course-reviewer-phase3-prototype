import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { listLeases, listLeaseListings, listDeployments } from "@/lib/api/distribution";
import { useToastStore } from "@/lib/store/toastStore";
import { useLeaseRequestStore } from "@/lib/store/leaseRequestStore";
import { DELIVERY_METHOD_LABELS, LEASE_BILLING_LABELS, type Lease, type LeaseStatus, type LeaseListing, type LeaseAcquisitionRoute, type Deployment } from "@/contracts";
import { Plus, Rocket, ShoppingCart, HelpCircle, FileText, Pause, Play, CalendarClock, Ban, ArrowUpRight, ShieldCheck, Inbox, PencilLine, Download, Link2, BookOpen, ChevronDown } from "lucide-react";

const INTEGRATION_INSTRUCTIONS: Record<Deployment["deliveryMethod"], string> = {
  scorm_dispatch: "Download the dispatch package below and upload it to your LMS as you would any SCORM course. It contains no course content — only a launcher that streams the course from our platform, so updates apply automatically.",
  hosted_launch: "Copy the launch link and place it wherever your learners access training (an intranet page, an email, or a button in your own LMS). The link is unique to this lease and enforces your licence count automatically.",
  lti_1_3: "Register our platform as an LTI 1.3 tool in your LMS using the client ID and deployment ID from your lease confirmation email, then add this course as an external tool link.",
  xapi_cmi5: "Point your LRS endpoint and auth credentials (from your lease confirmation) at our xAPI/cmi5 delivery — statements are sent to your LRS as learners progress.",
  api: "Use the API key below with our REST API to launch sessions and pull completion data directly into your own systems. Full endpoint reference is in the developer documentation.",
};

const STATUS_TONE: Record<LeaseStatus, "success" | "warning" | "neutral" | "danger"> = {
  active: "success",
  pending_approval: "warning",
  paused: "neutral",
  expired: "neutral",
  revoked: "danger",
  draft: "neutral",
};

const ROUTE_ICON = { buy_instantly: ShoppingCart, request_access: FileText, request_quote: HelpCircle };
const ROUTE_LABEL = { buy_instantly: "Buy Instantly", request_access: "Request Access", request_quote: "Request a Quote" };

export function DistributionHubPage() {
  const push = useToastStore((s) => s.push);
  const pendingRequests = useLeaseRequestStore((s) => s.requests.filter((r) => r.status === "pending").length);
  const addRequest = useLeaseRequestStore((s) => s.addRequest);
  const [tab, setTab] = useState<"lease_mine" | "lease_in" | "deployments" | "licences" | "customers" | "revenue">("lease_mine");

  const { data: leasesData, isLoading: leasesLoading } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: listings } = useQuery({ queryKey: ["lease-listings"], queryFn: listLeaseListings, enabled: tab === "lease_in" });
  const { data: deployments } = useQuery({ queryKey: ["deployments"], queryFn: listDeployments, enabled: tab === "deployments" });

  const [leases, setLeases] = useState<Lease[] | null>(null);
  useEffect(() => {
    if (leasesData && leases === null) setLeases(leasesData);
  }, [leasesData, leases]);

  const [extendFor, setExtendFor] = useState<Lease | null>(null);
  const [adjustFor, setAdjustFor] = useState<Lease | null>(null);
  const [listingModal, setListingModal] = useState<LeaseListing | null>(null);

  function setLeaseStatus(id: string, status: LeaseStatus, label: string) {
    setLeases((prev) => (prev ?? []).map((l) => (l.id === id ? { ...l, status } : l)));
    push(label);
  }

  const customers = leases
    ? Array.from(new Set(leases.map((l) => l.customerName))).map((name) => {
        const rows = leases.filter((l) => l.customerName === name);
        return { name, leaseCount: rows.length, totalLicences: rows.reduce((s, r) => s + r.licencesTotal, 0), totalRevenue: rows.reduce((s, r) => s + r.price, 0), color: rows[0].customerLogoColor };
      })
    : [];

  return (
    <>
      <PageHeader
        title="Training Distribution Hub"
        description="Leasing master courses into other organisations' LMSs — delivery, licences and revenue in one place."
        actions={
          <div className="flex gap-2">
            <Link to="/distribution-hub/requests">
              <Button size="sm" variant="secondary">
                <Inbox className="h-4 w-4" /> Leasing Requests {pendingRequests > 0 && <Badge tone="danger" className="ml-1">{pendingRequests}</Badge>}
              </Button>
            </Link>
            <Link to="/distribution-hub/create">
              <Button size="sm"><Plus className="h-4 w-4" /> Create Lease</Button>
            </Link>
          </div>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "lease_mine", label: "Lease My Courses", count: leases?.length },
          { value: "lease_in", label: "Courses I Lease", count: listings?.length },
          { value: "deployments", label: "Deployments" },
          { value: "licences", label: "Licences" },
          { value: "customers", label: "Customers", count: customers.length },
          { value: "revenue", label: "Revenue" },
        ]}
      />

      <div className="mt-4">
        {tab === "lease_mine" && (
          leasesLoading || leases === null ? <SkeletonRows rows={6} /> : (
            <Card>
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="px-5 py-3">Course</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Billing</th>
                      <th className="px-5 py-3">Delivery</th>
                      <th className="px-5 py-3">Access</th>
                      <th className="px-5 py-3">Licences</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leases.map((l) => (
                      <tr key={l.id} className="border-b border-line last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-ink">
                          {l.masterCourseTitle} <Badge tone="neutral" title="Pinned master course version">v{l.pinnedVersion}</Badge>
                        </td>
                        <td className="px-5 py-2.5 text-ink-soft">{l.customerName}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{LEASE_BILLING_LABELS[l.billingModel]}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{DELIVERY_METHOD_LABELS[l.deliveryMethod]}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {l.allowedIps.length > 0 && <Badge tone="neutral" title={l.allowedIps.join(", ")}><ShieldCheck className="mr-1 inline h-3 w-3" />IP-locked</Badge>}
                            {l.hasClientOverlay && <Badge tone="brand">Overlay</Badge>}
                          </div>
                        </td>
                        <td className="px-5 py-2.5 w-36">
                          <div className="mb-1 text-xs text-muted">{l.licencesUsed}/{l.licencesTotal}</div>
                          <ProgressBar percent={(l.licencesUsed / l.licencesTotal) * 100} tone={l.licencesUsed / l.licencesTotal > 0.8 ? "warning" : "brand"} />
                        </td>
                        <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[l.status]}>{l.status.replace("_", " ")}</Badge></td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {l.status === "active" && (
                              <button title="Pause" onClick={() => setLeaseStatus(l.id, "paused", `Paused lease for ${l.customerName}`)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {l.status === "paused" && (
                              <button title="Resume" onClick={() => setLeaseStatus(l.id, "active", `Resumed lease for ${l.customerName}`)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                                <Play className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {(l.status === "active" || l.status === "paused") && (
                              <>
                                <button title="Adjust licences" onClick={() => setAdjustFor(l)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                                  <PencilLine className="h-3.5 w-3.5" />
                                </button>
                                <button title="Extend" onClick={() => setExtendFor(l)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                </button>
                                <button title="Revoke" onClick={() => setLeaseStatus(l.id, "revoked", `Revoked lease for ${l.customerName}`)} className="rounded-[6px] p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )
        )}

        {tab === "lease_in" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings?.map((l) => {
              const RouteIcon = ROUTE_ICON[l.route];
              return (
                <Card key={l.id}>
                  <CardBody>
                    <div className="mb-3 h-2 w-10 rounded-full" style={{ backgroundColor: l.thumbnailColor }} />
                    <p className="text-sm font-semibold text-ink">{l.title}</p>
                    <p className="mt-1 text-xs text-muted line-clamp-2">{l.description}</p>
                    <p className="mt-2 text-xs text-muted">{l.creatorName} · {l.sector} · {l.country}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone="neutral">{l.level}</Badge>
                      <Badge tone="neutral">{Math.round(l.durationMinutes / 60 * 10) / 10}h</Badge>
                      {l.deliveryMethods.map((m) => <Badge key={m} tone="neutral">{DELIVERY_METHOD_LABELS[m]}</Badge>)}
                    </div>
                    <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                      {l.learningOutcomes.slice(0, 2).map((o) => <li key={o}>• {o}</li>)}
                    </ul>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">from £{l.fromPrice}<span className="text-xs font-normal text-muted"> / {LEASE_BILLING_LABELS[l.billingModel].toLowerCase()}</span></span>
                    </div>
                    <Button size="sm" className="mt-3 w-full" onClick={() => setListingModal(l)}><RouteIcon className="h-3.5 w-3.5" /> {ROUTE_LABEL[l.route]}</Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "deployments" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deployments?.map((d) => <DeploymentCard key={d.id} deployment={d} />)}
          </div>
        )}

        {tab === "licences" && (
          <Card>
            <CardBody className="space-y-3">
              {(leases ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{l.customerName}</p>
                    <p className="text-xs text-muted">{l.masterCourseTitle}</p>
                  </div>
                  <div className="w-48">
                    <div className="mb-1 flex justify-between text-xs text-muted"><span>{l.licencesUsed} used</span><span>{l.licencesTotal} total</span></div>
                    <ProgressBar percent={(l.licencesUsed / l.licencesTotal) * 100} tone={l.licencesUsed / l.licencesTotal > 0.8 ? "warning" : "brand"} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {tab === "customers" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => (
              <Card key={c.name}>
                <CardBody>
                  <div className="mb-2 h-8 w-8 rounded-[8px]" style={{ backgroundColor: c.color }} />
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.leaseCount} active lease{c.leaseCount !== 1 ? "s" : ""} · {c.totalLicences} licences</p>
                  <Link to={`/distribution-hub/customers/${encodeURIComponent(c.name)}`} className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-700">
                    Owner dashboard <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {tab === "revenue" && <RevenueBreakdown leases={leases ?? []} />}
      </div>

      {/* Extend */}
      <Modal open={!!extendFor} onClose={() => setExtendFor(null)} title="Extend lease" description={extendFor ? `${extendFor.customerName} — ${extendFor.masterCourseTitle}` : ""}>
        {extendFor && (
          <ExtendForm
            currentEnd={extendFor.endDate}
            onSubmit={(newEnd) => {
              setLeases((prev) => (prev ?? []).map((l) => (l.id === extendFor.id ? { ...l, endDate: newEnd } : l)));
              push(`Extended lease for ${extendFor.customerName} to ${newEnd}`);
              setExtendFor(null);
            }}
          />
        )}
      </Modal>

      {/* Adjust licences */}
      <Modal open={!!adjustFor} onClose={() => setAdjustFor(null)} title="Adjust licences" description={adjustFor ? `${adjustFor.customerName} — ${adjustFor.masterCourseTitle}` : ""}>
        {adjustFor && (
          <AdjustLicencesForm
            current={adjustFor.licencesTotal}
            used={adjustFor.licencesUsed}
            onSubmit={(newTotal) => {
              setLeases((prev) => (prev ?? []).map((l) => (l.id === adjustFor.id ? { ...l, licencesTotal: newTotal } : l)));
              push(`${adjustFor.customerName}'s licence count set to ${newTotal}`);
              setAdjustFor(null);
            }}
          />
        )}
      </Modal>

      {/* Listing acquisition */}
      <Modal open={!!listingModal} onClose={() => setListingModal(null)} title={listingModal ? ROUTE_LABEL[listingModal.route] : ""} description={listingModal?.title}>
        {listingModal && (
          <ListingActionBody
            route={listingModal.route}
            onSubmit={(note, learnerCount) => {
              if (listingModal.route === "buy_instantly") {
                push(`Purchased "${listingModal.title}" — deploying automatically now that payment has cleared`);
              } else {
                // Closes the approval-workflow loop (spec #12): this
                // creates a real request the owner sees in Leasing
                // Requests, not just a toast that goes nowhere.
                addRequest({
                  id: `req_${Date.now()}`,
                  masterCourseId: listingModal.masterCourseId,
                  masterCourseTitle: listingModal.title,
                  route: listingModal.route,
                  requesterOrgName: "Your organisation",
                  requesterContactEmail: "you@example.com",
                  learnerCount,
                  note,
                  status: "pending",
                  responseNote: null,
                  requestedAt: new Date().toISOString(),
                  respondedAt: null,
                });
                push(
                  listingModal.route === "request_access"
                    ? `Access request sent to ${listingModal.ownerOrganisationName}`
                    : `Quote request sent to ${listingModal.ownerOrganisationName}`,
                );
              }
              setListingModal(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}

function RevenueBreakdown({ leases }: { leases: Lease[] }) {
  const byCourse = new Map<string, { revenue: number; learners: number }>();
  const byCustomer = new Map<string, number>();
  for (const l of leases) {
    const c = byCourse.get(l.masterCourseTitle) ?? { revenue: 0, learners: 0 };
    c.revenue += l.price;
    c.learners += l.learnersLaunched;
    byCourse.set(l.masterCourseTitle, c);
    byCustomer.set(l.customerName, (byCustomer.get(l.customerName) ?? 0) + l.price);
  }
  const courseRows = Array.from(byCourse.entries())
    .map(([title, v]) => ({ title, ...v, perLearner: v.learners ? v.revenue / v.learners : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const customerRows = Array.from(byCustomer.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Revenue by course</p>
            {courseRows[0] && <Badge tone="brand">Most profitable: {courseRows[0].title}</Badge>}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2">Course</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">Learners</th>
                <th className="py-2">Revenue / learner</th>
              </tr>
            </thead>
            <tbody>
              {courseRows.map((r) => (
                <tr key={r.title} className="border-b border-line last:border-0">
                  <td className="py-2 font-medium text-ink">{r.title}</td>
                  <td className="py-2 text-ink-soft">£{r.revenue.toLocaleString()}</td>
                  <td className="py-2 text-ink-soft">{r.learners}</td>
                  <td className="py-2 text-ink-soft">£{r.perLearner.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="mb-3 text-sm font-semibold text-ink">Revenue by customer</p>
          <div className="space-y-2">
            {customerRows.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{r.name}</span>
                <span className="font-medium text-ink">£{r.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function DeploymentCard({ deployment: d }: { deployment: Deployment }) {
  const push = useToastStore((s) => s.push);
  const [showInstructions, setShowInstructions] = useState(false);

  function downloadPackage() {
    const blob = new Blob(
      [`This is a placeholder SCORM Dispatch package for deployment ${d.id}.\nIn the real build this is a real .zip launcher, not course content.`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scorm-dispatch-${d.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    push("SCORM Dispatch package downloaded");
  }

  function copyLink() {
    if (d.launchUrl) navigator.clipboard?.writeText(d.launchUrl).catch(() => {});
    push("Launch link copied to clipboard", "info");
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center justify-between">
          <Badge tone="brand">{DELIVERY_METHOD_LABELS[d.deliveryMethod]}</Badge>
          <Badge tone={d.status === "live" ? "success" : d.status === "test_passed" ? "info" : "neutral"}>{d.status.replace("_", " ")}</Badge>
        </div>
        {d.launchUrl && <p className="truncate text-xs text-primary-700">{d.launchUrl}</p>}
        {d.scormPackageReady && <p className="text-xs text-muted">SCORM Dispatch package ready to download</p>}
        {d.apiKeyLast4 && <p className="text-xs text-muted">API key ending •••{d.apiKeyLast4}</p>}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.scormPackageReady && (
            <Button size="sm" variant="secondary" onClick={downloadPackage}><Download className="h-3.5 w-3.5" /> Download Package</Button>
          )}
          {d.launchUrl && (
            <Button size="sm" variant="secondary" onClick={copyLink}><Link2 className="h-3.5 w-3.5" /> Copy Launch Link</Button>
          )}
          {d.deliveryMethod === "api" && (
            <Button size="sm" variant="secondary" onClick={() => push("Opening developer documentation…", "info")}><BookOpen className="h-3.5 w-3.5" /> Documentation</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowInstructions((v) => !v)}>
            <BookOpen className="h-3.5 w-3.5" /> View Integration Instructions <ChevronDown className={`h-3 w-3 transition-transform ${showInstructions ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {showInstructions && (
          <p className="mt-2 rounded-[10px] bg-gray-50 p-2.5 text-xs text-ink-soft">{INTEGRATION_INSTRUCTIONS[d.deliveryMethod]}</p>
        )}

        <Button size="sm" className="mt-3 w-full" onClick={() => push(`Test launch succeeded — ${DELIVERY_METHOD_LABELS[d.deliveryMethod]}`)}>
          <Rocket className="h-3.5 w-3.5" /> Test Course Launch
        </Button>
      </CardBody>
    </Card>
  );
}

function AdjustLicencesForm({ current, used, onSubmit }: { current: number; used: number; onSubmit: (newTotal: number) => void }) {
  const [total, setTotal] = useState(current);
  const belowUsed = total < used;
  return (
    <div className="space-y-4">
      <div>
        <Label>Total licences ({used} currently in use)</Label>
        <input
          type="number"
          min={used}
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
          className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <p className="mt-1 text-xs text-muted">
          {total > current ? `+${total - current} more licences` : total < current ? `${current - total} fewer licences` : "No change"}
        </p>
        {belowUsed && <p className="mt-1 text-xs text-danger">Can't reduce below the {used} licences already in use.</p>}
      </div>
      <Button className="w-full" disabled={belowUsed || total === current} onClick={() => onSubmit(total)}>Save licence count</Button>
    </div>
  );
}

function ExtendForm({ currentEnd, onSubmit }: { currentEnd: string | null; onSubmit: (date: string) => void }) {
  const [date, setDate] = useState(currentEnd ?? "");
  return (
    <div className="space-y-4">
      <div>
        <Label>New end date</Label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100" />
      </div>
      <Button className="w-full" disabled={!date} onClick={() => onSubmit(date)}>Save new end date</Button>
    </div>
  );
}

function ListingActionBody({ route, onSubmit }: { route: LeaseAcquisitionRoute; onSubmit: (note: string, learnerCount: number) => void }) {
  const [note, setNote] = useState("");
  const [learnerCount, setLearnerCount] = useState(50);
  if (route === "buy_instantly") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">This simulates checkout — in the real build, payment clears via Stripe and the lease deploys automatically per the chosen delivery method.</p>
        <Button className="w-full" onClick={() => onSubmit("", learnerCount)}>Confirm purchase</Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <Label>Number of learners</Label>
        <input
          type="number"
          min={1}
          value={learnerCount}
          onChange={(e) => setLearnerCount(Number(e.target.value))}
          className="h-10 w-full rounded-[10px] border border-line bg-white px-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <div>
        <Label>{route === "request_access" ? "Why do you need access?" : "What would you like quoted?"}</Label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-24 w-full rounded-[10px] border border-line bg-white p-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          placeholder="A short note to the course owner…"
        />
      </div>
      <Button className="w-full" disabled={!note.trim()} onClick={() => onSubmit(note, learnerCount)}>
        {route === "request_access" ? "Send access request" : "Send quote request"}
      </Button>
    </div>
  );
}
