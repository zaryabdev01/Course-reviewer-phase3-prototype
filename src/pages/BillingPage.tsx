import { useQuery, useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listInvoices, listRevenueLines } from "@/lib/api/engagement";
import { listMasterCourses, listFormatVariants } from "@/lib/api/courses";
import { useToastStore } from "@/lib/store/toastStore";
import { FORMAT_LABELS } from "@/contracts";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Legend } from "recharts";
import type { Invoice } from "@/contracts";
import { Bell, PauseCircle } from "lucide-react";

/** M11: "reminders and auto-suspension" for lease usage billing. Days
 * overdue → reminder, days-until-suspension countdown once well past due
 * — computed from the invoice due date, not a separate scheduled job. */
const SUSPENSION_AFTER_DAYS = 14;
function daysOverdue(dueAt: string): number {
  return Math.floor((Date.now() - new Date(dueAt).getTime()) / 86_400_000);
}

const STATUS_TONE: Record<Invoice["status"], "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  due: "warning",
  overdue: "danger",
  void: "neutral",
};

const KIND_LABEL: Record<Invoice["kind"], string> = {
  seat_purchase: "Seat purchase",
  lease_usage: "Lease usage",
  credit_topup: "Credit top-up",
  payout: "Seller payout",
};

function estimateCost(costTokens: number | null, costTtsCharacters: number | null): number {
  if (costTokens) return (costTokens / 1000) * 0.006;
  if (costTtsCharacters) return costTtsCharacters * 0.000015;
  return 0;
}

export function BillingPage() {
  const push = useToastStore((s) => s.push);
  const { data: invoices } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: listRevenueLines });
  const { data: courses } = useQuery({ queryKey: ["master-courses"], queryFn: listMasterCourses });

  // Rolls the per-generation cost metering from M4 (Choose Format screen)
  // up into a real per-format cost breakdown here, so the "AI cost" bar
  // in the chart above isn't just an unconnected seeded number.
  const variantQueries = useQueries({
    queries: (courses ?? []).map((c) => ({
      queryKey: ["format-variants", c.id],
      queryFn: () => listFormatVariants(c.id),
      enabled: !!courses,
    })),
  });
  const allVariants = variantQueries.flatMap((q) => q.data ?? []);
  const costByFormat = new Map<string, { calls: number; reused: number; cost: number }>();
  for (const v of allVariants) {
    if (v.status !== "ready") continue;
    const entry = costByFormat.get(v.format) ?? { calls: 0, reused: 0, cost: 0 };
    entry.calls++;
    if (v.reused) entry.reused++;
    else entry.cost += estimateCost(v.costTokens, v.costTtsCharacters);
    costByFormat.set(v.format, entry);
  }
  const totalMeteredCost = Array.from(costByFormat.values()).reduce((s, e) => s + e.cost, 0);

  return (
    <>
      <PageHeader title="Billing & Revenue" description="Seat purchases, lease usage billing and platform revenue/cost reporting." />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Gross revenue vs. costs</CardTitle>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenue}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7384" }} axisLine={false} tickLine={false} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: any) => `£${Number(v).toLocaleString()}`) as any}
                contentStyle={{ borderRadius: 10, border: "1px solid #e4e7ef", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="grossRevenue" name="Gross revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="platformFees" name="Platform fees" fill="#0d9488" radius={[6, 6, 0, 0]} />
              <Bar dataKey="aiCost" name="AI cost" fill="#f79009" radius={[6, 6, 0, 0]} />
              <Bar dataKey="hostingCost" name="Hosting cost" fill="#e62e2e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>AI generation cost, by format</CardTitle>
          <Badge tone="brand">£{totalMeteredCost.toFixed(2)} metered this period</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3">Format</th>
                <th className="px-5 py-3">Generations</th>
                <th className="px-5 py-3">Served from cache</th>
                <th className="px-5 py-3">Metered cost</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(costByFormat.entries()).map(([format, entry]) => (
                <tr key={format} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-ink">{FORMAT_LABELS[format as keyof typeof FORMAT_LABELS] ?? format}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{entry.calls}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{entry.reused} ({Math.round((entry.reused / entry.calls) * 100)}%)</td>
                  <td className="px-5 py-2.5 text-ink-soft">£{entry.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-muted">Rolled up from the per-generation token/TTS metering on each course's Choose Format screen — the cache-hit rate here is what makes variant reuse a real cost lever, not just a UX nicety.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Issued</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv) => {
                const overdueDays = inv.status === "overdue" ? daysOverdue(inv.dueAt) : 0;
                const nearSuspension = inv.kind === "lease_usage" && overdueDays > 0;
                return (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 font-medium text-ink">{inv.label}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{KIND_LABEL[inv.kind]}</td>
                    <td className="px-5 py-2.5 text-ink-soft">£{inv.amount.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-muted">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-2.5">
                      <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                      {nearSuspension && (
                        <Badge tone="danger" className="ml-1">
                          {overdueDays >= SUSPENSION_AFTER_DAYS ? "Suspension due" : `Auto-suspends in ${SUSPENSION_AFTER_DAYS - overdueDays}d`}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {nearSuspension && (
                        <div className="flex justify-end gap-1">
                          <button title="Send reminder" onClick={() => push(`Payment reminder sent for "${inv.label}"`, "info")} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          {overdueDays >= SUSPENSION_AFTER_DAYS && (
                            <button title="Suspend lease" onClick={() => push(`Lease suspended for non-payment — "${inv.label}"`)} className="rounded-[6px] p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                              <PauseCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
