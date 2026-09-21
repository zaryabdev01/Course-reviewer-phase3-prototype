import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { listLeases, listDeployments, listUsageAlerts } from "@/lib/api/distribution";
import { DELIVERY_METHOD_LABELS, LEASE_BILLING_LABELS, type LeaseStatus } from "@/contracts";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";

const STATUS_TONE: Record<LeaseStatus, "success" | "warning" | "neutral" | "danger"> = {
  active: "success",
  pending_approval: "warning",
  paused: "neutral",
  expired: "neutral",
  revoked: "danger",
  draft: "neutral",
};

/** Owner dashboard per customer (M9). One customer's full relationship —
 * every lease they hold, deployment status, licence usage and revenue —
 * in one place, instead of filtering the Distribution Hub tables by hand. */
export function CustomerDashboardPage() {
  const { name } = useParams<{ name: string }>();
  const customerName = decodeURIComponent(name ?? "");

  const { data: allLeases } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: deployments } = useQuery({ queryKey: ["deployments"], queryFn: listDeployments });
  const { data: alerts } = useQuery({ queryKey: ["usage-alerts"], queryFn: listUsageAlerts });

  const leases = allLeases?.filter((l) => l.customerName === customerName) ?? [];
  const leaseIds = new Set(leases.map((l) => l.id));
  const customerDeployments = deployments?.filter((d) => leaseIds.has(d.leaseId)) ?? [];
  const customerAlerts = alerts?.filter((a) => leaseIds.has(a.leaseId)) ?? [];

  const totalRevenue = leases.reduce((s, l) => s + l.price, 0);
  const totalLicences = leases.reduce((s, l) => s + l.licencesTotal, 0);
  const totalUsed = leases.reduce((s, l) => s + l.licencesUsed, 0);
  const totalLaunched = leases.reduce((s, l) => s + l.learnersLaunched, 0);
  const totalCompletions = leases.reduce((s, l) => s + l.completions, 0);
  const color = leases[0]?.customerLogoColor ?? "#16a34a";

  return (
    <>
      <Link to="/distribution-hub" className="mb-3 flex items-center gap-1 text-xs font-medium text-primary-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Distribution Hub
      </Link>
      <PageHeader
        title={customerName}
        description={
          leases[0]
            ? `Contact: ${leases[0].contactPersonName} (${leases[0].contactPersonEmail}) — every lease, deployment and alert for this customer in one place.`
            : "Owner dashboard — every lease, deployment and alert for this customer in one place."
        }
        actions={<div className="h-9 w-9 rounded-[10px]" style={{ backgroundColor: color }} />}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-muted">Active leases</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">{leases.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-muted">Licences in use</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">{totalUsed}/{totalLicences}</p>
            <ProgressBar percent={totalLicences ? (totalUsed / totalLicences) * 100 : 0} className="mt-2" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-muted">Completions</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">{totalCompletions}</p>
            <p className="mt-1 text-xs text-muted">of {totalLaunched} learners launched</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-muted">Revenue from this customer</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink">£{totalRevenue.toLocaleString()}</p>
          </CardBody>
        </Card>
      </div>

      {customerAlerts.length > 0 && (
        <Card className="mb-5 border-warning-dark/20 bg-warning-soft">
          <CardBody>
            <p className="mb-2 text-sm font-semibold text-warning-dark">Usage alerts</p>
            {customerAlerts.map((a) => (
              <p key={a.id} className="text-sm text-ink-soft">{a.currentPercent}% of licences in use — above the {a.thresholdPercent}% threshold</p>
            ))}
          </CardBody>
        </Card>
      )}

      <Card className="mb-5">
        <CardHeader><CardTitle>Leases</CardTitle></CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Delivery</th>
                <th className="px-5 py-3">Launched</th>
                <th className="px-5 py-3">Completions</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-ink">
                    {l.masterCourseTitle} <span className="text-xs font-normal text-muted">v{l.pinnedVersion}</span>
                    <p className="text-xs font-normal text-muted">{LEASE_BILLING_LABELS[l.billingModel]}</p>
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft">{DELIVERY_METHOD_LABELS[l.deliveryMethod]}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{l.learnersLaunched}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{l.completions}</td>
                  <td className="px-5 py-2.5 text-muted">{l.startDate}</td>
                  <td className="px-5 py-2.5 text-muted">{l.endDate ?? "No expiry"}</td>
                  <td className="px-5 py-2.5">
                    {l.hasClientOverlay && <Badge tone="brand">Client overlay</Badge>}
                    {l.allowedIps.length > 0 && <Badge tone="neutral" className="ml-1"><ShieldCheck className="mr-1 inline h-3 w-3" />IP-locked</Badge>}
                  </td>
                  <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[l.status]}>{l.status.replace("_", " ")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mb-5">
        <CardHeader><CardTitle>Deployment status</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {customerDeployments.map((d) => (
            <div key={d.id} className="rounded-[10px] border border-line p-3">
              <div className="mb-1 flex items-center justify-between">
                <Badge tone="brand">{DELIVERY_METHOD_LABELS[d.deliveryMethod]}</Badge>
                <Badge tone={d.status === "live" ? "success" : "neutral"}>{d.status.replace("_", " ")}</Badge>
              </div>
              {d.launchUrl && <p className="truncate text-xs text-primary-700">{d.launchUrl}</p>}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer journey</CardTitle></CardHeader>
        <CardBody>
          <div className="flex items-center gap-2 rounded-[10px] bg-primary-50 p-3 text-sm text-primary-700">
            <Sparkles className="h-4 w-4 shrink-0" />
            AI LMS advisor — not built in this prototype. The real feature would walk a new customer through picking a delivery method based on their existing LMS, using the conversation to pre-fill the Create Lease wizard.
          </div>
        </CardBody>
      </Card>
    </>
  );
}
