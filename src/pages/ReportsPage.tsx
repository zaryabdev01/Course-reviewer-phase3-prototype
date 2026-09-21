import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Select, Input, Label } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useActivePersona } from "@/lib/store/personaStore";
import { listTrainingReportRows } from "@/lib/api/engagement";
import { listMembers, listCustomGroups } from "@/lib/api/organisations";
import { useToastStore } from "@/lib/store/toastStore";
import type { ReportType, TrainingReportRow, DownloadJob, NotificationItem } from "@/contracts";
import { Download } from "lucide-react";

function downloadCsv(filename: string, rows: TrainingReportRow[]) {
  const header = ["Learner", "Course", "Status", "Completed", "Score", "Time spent (min)"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.learnerName, r.courseTitle, r.status, r.completedAt ?? "", r.score ?? "", r.timeSpentMinutes]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  return { url, blob };
}

export function ReportsPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId;
  const isOrg = persona.accountType === "organisational" && persona.organisationRole !== "team_member";
  const [reportType, setReportType] = useState<ReportType>(isOrg ? "overall" : "learner");
  const [selectedLearner, setSelectedLearner] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "not_completed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const push = useToastStore((s) => s.push);
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({ queryKey: ["training-report-rows"], queryFn: listTrainingReportRows });
  const { data: groups } = useQuery({ queryKey: ["custom-groups", orgId], queryFn: () => listCustomGroups(orgId!), enabled: isOrg && !!orgId && reportType === "group" });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId!), enabled: isOrg && !!orgId && reportType === "group" });

  const learnerNames = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.learnerName))).sort(), [rows]);
  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);
  const groupMemberNames = useMemo(() => {
    if (!selectedGroup || !members) return new Set<string>();
    return new Set(members.filter((m) => selectedGroup.memberIds.includes(m.id)).map((m) => m.fullName));
  }, [selectedGroup, members]);

  // Learner Progress: exactly one learner at a time. Group Progress: one
  // group's members. Overall: everyone. Per the brief's own definitions,
  // not just three cosmetic tab labels.
  const needsSelection = isOrg && ((reportType === "learner" && !selectedLearner) || (reportType === "group" && !selectedGroupId));

  const filtered = (rows ?? []).filter((r) => {
    if (statusFilter === "completed" && r.status !== "completed") return false;
    if (statusFilter === "not_completed" && r.status === "completed") return false;
    if (dateFrom && (!r.completedAt || r.completedAt < dateFrom)) return false;
    if (dateTo && (!r.completedAt || r.completedAt > dateTo)) return false;
    if (isOrg && reportType === "learner" && selectedLearner && r.learnerName !== selectedLearner) return false;
    if (isOrg && reportType === "group" && selectedGroupId && !groupMemberNames.has(r.learnerName)) return false;
    return true;
  });

  // Brief: "We will only offer instant report downloads on single learner
  // reports. All other types of reports are done in the background in
  // order of requested and they are notified when its ready." Learner
  // downloads a real CSV immediately; Group/Overall queue a real job that
  // progresses queued → processing → ready and fires a notification.
  function handleDownload() {
    if (reportType === "learner") {
      const { url } = downloadCsv(`learner-progress-${selectedLearner}.csv`, filtered);
      const a = document.createElement("a");
      a.href = url;
      a.download = `learner-progress-${selectedLearner}.csv`;
      a.click();
      push(`Downloaded report for ${selectedLearner}`);
      return;
    }

    const label = reportType === "group" ? `Group Progress — ${selectedGroup?.name ?? "Unknown group"}` : "Overall Progress — All learners";
    const jobId = `dl_new_${Date.now()}`;
    const job: DownloadJob = {
      id: jobId,
      label,
      reportType,
      status: "queued",
      requestedAt: new Date().toISOString(),
      readyAt: null,
      fileSizeKb: null,
      requestedBy: persona.email,
      fileUrl: null,
    };
    queryClient.setQueryData(["download-jobs"], (old: DownloadJob[] | undefined) => [job, ...(old ?? [])]);
    push(`${label} queued — you'll be notified in Downloads once it's ready`, "info");

    setTimeout(() => {
      queryClient.setQueryData(["download-jobs"], (old: DownloadJob[] | undefined) =>
        (old ?? []).map((j) => (j.id === jobId ? { ...j, status: "processing" as const } : j)),
      );
    }, 1500);

    setTimeout(() => {
      const { url, blob } = downloadCsv(`${label}.csv`, filtered);
      queryClient.setQueryData(["download-jobs"], (old: DownloadJob[] | undefined) =>
        (old ?? []).map((j) =>
          j.id === jobId
            ? { ...j, status: "ready" as const, readyAt: new Date().toISOString(), fileSizeKb: Math.max(1, Math.round(blob.size / 1024)), fileUrl: url }
            : j,
        ),
      );
      const notification: NotificationItem = {
        id: `notif_${jobId}`,
        category: "report_ready",
        title: `${label} is ready`,
        body: "Your report has finished generating and is ready to download.",
        read: false,
        createdAt: new Date().toISOString(),
        actionHref: "/downloads",
      };
      queryClient.setQueryData(["notifications"], (old: NotificationItem[] | undefined) => [notification, ...(old ?? [])]);
      push(`${label} is ready in Downloads`, "success");
    }, 4000);
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description={isOrg ? "Learner, Group and Overall Progress — instant on-screen views." : "Your own training history."}
        actions={
          <Button size="sm" variant="secondary" onClick={handleDownload} disabled={needsSelection}>
            <Download className="h-4 w-4" /> {reportType === "learner" ? "Download (instant)" : "Queue for download"}
          </Button>
        }
      />

      {isOrg && (
        <div className="mb-4">
          <Tabs
            value={reportType}
            onChange={(v) => { setReportType(v); setSelectedLearner(""); setSelectedGroupId(""); }}
            options={[
              { value: "learner", label: "Learner Progress" },
              { value: "group", label: "Group Progress" },
              { value: "overall", label: "Overall Progress" },
            ]}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        {isOrg && reportType === "learner" && (
          <div>
            <Label>Learner (exactly one)</Label>
            <Select value={selectedLearner} onChange={(e) => setSelectedLearner(e.target.value)} className="w-56">
              <option value="">Select a learner…</option>
              {learnerNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
        )}
        {isOrg && reportType === "group" && (
          <div>
            <Label>Group</Label>
            <Select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-56">
              <option value="">Select a group…</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label>Type</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "completed" | "not_completed")} className="w-40">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="not_completed">Not completed</option>
          </Select>
        </div>
        <div>
          <Label>Date from</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Date to</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="mb-0.5 text-xs font-medium text-primary-700 hover:underline"
          >
            Clear dates (= all)
          </button>
        )}
        {!needsSelection && <span className="mb-2 text-xs text-muted">{filtered.length} rows</span>}
      </div>

      {needsSelection ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-muted">
            {reportType === "learner" ? "Select a learner above to view their progress report." : "Select a group above to view its progress report."}
          </CardBody>
        </Card>
      ) : isOrg && reportType === "group" && selectedGroupId && filtered.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-muted">
            No report rows for "{selectedGroup?.name}" yet — add members to this group from Team.
          </CardBody>
        </Card>
      ) : (
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
      )}
      <p className="mt-2 text-xs text-muted">On-screen views are instant on all three report types. Learner downloads are instant; Group and Overall downloads queue in Downloads and notify you when ready.</p>
    </>
  );
}
