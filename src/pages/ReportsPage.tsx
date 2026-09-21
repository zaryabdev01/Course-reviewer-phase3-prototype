import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Select, Input, Label } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useActivePersona } from "@/lib/store/personaStore";
import { listTrainingReportRows } from "@/lib/api/engagement";
import { useToastStore } from "@/lib/store/toastStore";
import type { ReportType } from "@/contracts";
import { Download } from "lucide-react";

export function ReportsPage() {
  const persona = useActivePersona();
  const isOrg = persona.accountType === "organisational" && persona.organisationRole !== "team_member";
  const [reportType, setReportType] = useState<ReportType>(isOrg ? "overall" : "learner");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const push = useToastStore((s) => s.push);

  const { data: rows, isLoading } = useQuery({ queryKey: ["training-report-rows"], queryFn: listTrainingReportRows });
  const filtered = (rows ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFrom && (!r.completedAt || r.completedAt < dateFrom)) return false;
    if (dateTo && (!r.completedAt || r.completedAt > dateTo)) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Reports"
        description={isOrg ? "Learner, Group and Overall Progress — instant on-screen views." : "Your own training history."}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => push(`${reportType === "learner" ? "Learner" : reportType === "group" ? "Group" : "Overall"} report queued — check Downloads once ready`, "info")}
          >
            <Download className="h-4 w-4" /> Queue for download
          </Button>
        }
      />

      {isOrg && (
        <div className="mb-4">
          <Tabs
            value={reportType}
            onChange={setReportType}
            options={[
              { value: "learner", label: "Learner" },
              { value: "group", label: "Group" },
              { value: "overall", label: "Overall" },
            ]}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In progress</option>
            <option value="not_started">Not started</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
        <div>
          <Label>Completed from</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Completed to</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="mb-0.5 text-xs font-medium text-primary-700 hover:underline"
          >
            Clear dates
          </button>
        )}
        <span className="mb-2 text-xs text-muted">{filtered.length} rows</span>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <SkeletonRows className="p-5" rows={8} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Learner</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Time spent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-ink">{r.learnerName}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.courseTitle}</td>
                    <td className="px-5 py-2.5">
                      <Badge tone={r.status === "completed" ? "success" : r.status === "overdue" ? "danger" : "neutral"}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-muted">{r.completedAt ?? "—"}</td>
                    <td className="px-5 py-2.5 text-muted">{r.score ?? "—"}</td>
                    <td className="px-5 py-2.5 text-muted">{r.timeSpentMinutes}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      <p className="mt-2 text-xs text-muted">On-screen views are instant (reporting read-model) — file exports queue in Downloads.</p>
    </>
  );
}
