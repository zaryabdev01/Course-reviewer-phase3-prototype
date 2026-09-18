import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listInvoices, listRevenueLines } from "@/lib/api/engagement";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Legend } from "recharts";
import type { Invoice } from "@/contracts";

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

export function BillingPage() {
  const { data: invoices } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: listRevenueLines });

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
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv) => (
                <tr key={inv.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-ink">{inv.label}</td>
                  <td className="px-5 py-2.5 text-ink-soft">{KIND_LABEL[inv.kind]}</td>
                  <td className="px-5 py-2.5 text-ink-soft">£{inv.amount.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-muted">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
