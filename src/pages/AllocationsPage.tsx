import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listAllocations } from "@/lib/api/allocations";
import type { AllocationStatus } from "@/contracts";
import { Plus } from "lucide-react";

const STATUS_TONE: Record<AllocationStatus, "success" | "warning" | "neutral" | "danger"> = {
  assigned: "neutral",
  in_progress: "warning",
  completed: "success",
  overdue: "danger",
  removed: "neutral",
};

export function AllocationsPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const [status, setStatus] = useState<AllocationStatus | "all">("all");

  const { data: allocations, isLoading } = useQuery({ queryKey: ["allocations", orgId], queryFn: () => listAllocations(orgId) });
  const filtered = allocations?.filter((a) => status === "all" || a.status === status) ?? [];

  return (
    <>
      <PageHeader
        title="Allocation"
        description="Allocate courses to learners or groups, with deadlines, Matrix visibility and format choice."
        actions={<Button size="sm"><Plus className="h-4 w-4" /> New allocation</Button>}
      />

      <div className="mb-4 flex items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as AllocationStatus | "all")} className="w-48">
          <option value="all">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </Select>
        <span className="text-xs text-muted">{filtered.length} allocations</span>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <SkeletonRows className="p-5" rows={8} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Deadline</th>
                  <th className="px-5 py-3">Matrix</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 60).map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium text-ink">{a.masterCourseTitle}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{a.targetLabel}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{a.deadline ?? "—"}</td>
                    <td className="px-5 py-2.5">{a.appearInMatrix ? <Badge tone="brand">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                    <td className="px-5 py-2.5 w-32"><ProgressBar percent={a.progressPercent} /></td>
                    <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      {filtered.length > 60 && <p className="mt-2 text-xs text-muted">Showing 60 of {filtered.length} — pagination in the real build.</p>}
    </>
  );
}
