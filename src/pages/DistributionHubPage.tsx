import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { listLeases, listLeaseListings, listDeployments } from "@/lib/api/distribution";
import { DELIVERY_METHOD_LABELS, LEASE_BILLING_LABELS, type LeaseStatus } from "@/contracts";
import { Plus, Rocket, ShoppingCart, HelpCircle, FileText } from "lucide-react";

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
  const [tab, setTab] = useState<"lease_mine" | "lease_in" | "deployments" | "licences" | "customers" | "revenue">("lease_mine");

  const { data: leases, isLoading: leasesLoading } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: listings } = useQuery({ queryKey: ["lease-listings"], queryFn: listLeaseListings, enabled: tab === "lease_in" });
  const { data: deployments } = useQuery({ queryKey: ["deployments"], queryFn: listDeployments, enabled: tab === "deployments" });

  const customers = leases
    ? Array.from(new Set(leases.map((l) => l.customerName))).map((name) => {
        const rows = leases.filter((l) => l.customerName === name);
        return { name, leaseCount: rows.length, totalLicences: rows.reduce((s, r) => s + r.licencesTotal, 0), color: rows[0].customerLogoColor };
      })
    : [];

  return (
    <>
      <PageHeader
        title="Training Distribution Hub"
        description="Leasing master courses into other organisations' LMSs — delivery, licences and revenue in one place."
        actions={
          <Link to="/distribution-hub/create">
            <Button size="sm"><Plus className="h-4 w-4" /> Create Lease</Button>
          </Link>
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
          leasesLoading ? <SkeletonRows rows={6} /> : (
            <Card>
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="px-5 py-3">Course</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Billing</th>
                      <th className="px-5 py-3">Delivery</th>
                      <th className="px-5 py-3">Licences</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leases?.map((l) => (
                      <tr key={l.id} className="border-b border-line last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-ink">{l.masterCourseTitle}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{l.customerName}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{LEASE_BILLING_LABELS[l.billingModel]}</td>
                        <td className="px-5 py-2.5 text-ink-soft">{DELIVERY_METHOD_LABELS[l.deliveryMethod]}</td>
                        <td className="px-5 py-2.5 w-36">
                          <div className="mb-1 text-xs text-muted">{l.licencesUsed}/{l.licencesTotal}</div>
                          <ProgressBar percent={(l.licencesUsed / l.licencesTotal) * 100} tone={l.licencesUsed / l.licencesTotal > 0.8 ? "warning" : "brand"} />
                        </td>
                        <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[l.status]}>{l.status.replace("_", " ")}</Badge></td>
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
                    <p className="mt-2 text-xs text-muted">{l.ownerOrganisationName} · {l.sector}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">from £{l.fromPrice}<span className="text-xs font-normal text-muted"> / {LEASE_BILLING_LABELS[l.billingModel].toLowerCase()}</span></span>
                    </div>
                    <Button size="sm" className="mt-3 w-full"><RouteIcon className="h-3.5 w-3.5" /> {ROUTE_LABEL[l.route]}</Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "deployments" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deployments?.map((d) => (
              <Card key={d.id}>
                <CardBody>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge tone="brand">{DELIVERY_METHOD_LABELS[d.deliveryMethod]}</Badge>
                    <Badge tone={d.status === "live" ? "success" : d.status === "test_passed" ? "info" : "neutral"}>{d.status.replace("_", " ")}</Badge>
                  </div>
                  {d.launchUrl && <p className="truncate text-xs text-primary-700">{d.launchUrl}</p>}
                  {d.scormPackageReady && <p className="text-xs text-muted">SCORM Dispatch package ready to download</p>}
                  {d.apiKeyLast4 && <p className="text-xs text-muted">API key ending •••{d.apiKeyLast4}</p>}
                  <Button size="sm" variant="secondary" className="mt-3 w-full"><Rocket className="h-3.5 w-3.5" /> Test launch</Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {tab === "licences" && (
          <Card>
            <CardBody className="space-y-3">
              {leases?.map((l) => (
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
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {tab === "revenue" && (
          <Card>
            <CardBody>
              <p className="mb-3 text-sm font-semibold text-ink">Lease revenue by customer</p>
              <div className="space-y-2">
                {leases?.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{l.customerName} — {l.masterCourseTitle}</span>
                    <span className="font-medium text-ink">£{l.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
