import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { listAuditLog } from "@/lib/api/engagement";

export function AuditLogPage() {
  const { data: entries, isLoading } = useQuery({ queryKey: ["audit-log"], queryFn: listAuditLog });

  return (
    <>
      <PageHeader title="Audit Log" description="Who, when, previous and new value — across allocations, completions, renewals, Matrix and leases." />
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <SkeletonRows className="p-5" rows={10} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Change</th>
                  <th className="px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries?.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-muted">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-ink">
                      {e.actorName}
                      <Badge tone="neutral" className="ml-2">{e.actorRole}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{e.action}</td>
                    <td className="px-5 py-2.5 text-ink-soft capitalize">{e.entityType.replace("_", " ")} · {e.entityLabel}</td>
                    <td className="px-5 py-2.5 text-muted">{e.previousValue ?? "—"} → {e.newValue}</td>
                    <td className="px-5 py-2.5 text-muted">{e.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
