import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { StatusDot, StatusPill } from "@/components/ui/StatusPill";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listMatrixCells, listRequirements, listMatrixAudit } from "@/lib/api/matrix";
import { MATRIX_STATUS_LABELS, type MatrixStatus, type MatrixView, type TrainingRequirement, type MatrixCell } from "@/contracts";
import { Download, Filter, X } from "lucide-react";

const VIEW_OPTIONS: { value: MatrixView; label: string }[] = [
  { value: "learner", label: "Learner" },
  { value: "team", label: "Team" },
  { value: "role", label: "Role" },
  { value: "department", label: "Department" },
  { value: "training", label: "Training" },
];

const ROW_HEIGHT = 40;

export function MatrixPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const [view, setView] = useState<MatrixView>("learner");
  const [tab, setTab] = useState<"grid" | "audit">("grid");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<MatrixStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const { data: cells, isLoading } = useQuery({ queryKey: ["matrix-cells", orgId], queryFn: () => listMatrixCells(orgId) });
  const { data: requirements } = useQuery({ queryKey: ["requirements", orgId], queryFn: () => listRequirements(orgId) });
  const { data: audit } = useQuery({ queryKey: ["matrix-audit"], queryFn: listMatrixAudit, enabled: tab === "audit" });

  const departments = useMemo(() => Array.from(new Set((cells ?? []).map((c) => c.departmentName))).sort(), [cells]);

  const learners = useMemo(() => {
    if (!cells) return [];
    const map = new Map<string, { learnerId: string; learnerName: string; departmentName: string; jobRoleTitle: string }>();
    for (const c of cells) {
      if (!map.has(c.learnerId)) map.set(c.learnerId, { learnerId: c.learnerId, learnerName: c.learnerName, departmentName: c.departmentName, jobRoleTitle: c.jobRoleTitle });
    }
    let rows = Array.from(map.values());
    if (deptFilter !== "all") rows = rows.filter((r) => r.departmentName === deptFilter);
    if (search) rows = rows.filter((r) => r.learnerName.toLowerCase().includes(search.toLowerCase()));
    return rows.sort((a, b) => a.learnerName.localeCompare(b.learnerName));
  }, [cells, deptFilter, search]);

  const cellIndex = useMemo(() => {
    const idx = new Map<string, MatrixCell>();
    for (const c of cells ?? []) idx.set(`${c.learnerId}::${c.requirementId}`, c);
    return idx;
  }, [cells]);

  const visibleRequirements = useMemo(() => {
    if (!requirements) return [];
    if (statusFilter === "all") return requirements;
    return requirements.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && c.status === statusFilter));
  }, [requirements, statusFilter, cells]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: learners.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Aggregate views (team / role / department / training) — same source
  // cells, grouped differently. Real build: these are separate read-model
  // projections, not client-side aggregation of a full cell list.
  const groupField: "departmentName" | "jobRoleTitle" | null =
    view === "department" ? "departmentName" : view === "role" ? "jobRoleTitle" : view === "team" ? "departmentName" : null;

  const aggregated = useMemo(() => {
    if (!groupField || !cells) return [];
    const groups = new Map<string, { total: number; completed: number; overdue: number }>();
    for (const c of cells) {
      const key = c[groupField];
      const g = groups.get(key) ?? { total: 0, completed: 0, overdue: 0 };
      g.total++;
      if (c.status === "completed") g.completed++;
      if (c.status === "overdue") g.overdue++;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([name, stats]) => ({ name, ...stats }));
  }, [cells, groupField]);

  return (
    <>
      <PageHeader
        title="Training Matrix"
        description="Compliance record — status pre-computed, updated by allocation and completion events."
        actions={
          <Button size="sm" variant="secondary">
            <Download className="h-4 w-4" /> Export to Excel
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onChange={setView} options={VIEW_OPTIONS} />
        <Tabs value={tab} onChange={setTab} options={[{ value: "grid", label: "Grid" }, { value: "audit", label: "Audit Trail" }]} />
      </div>

      {tab === "grid" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Filter className="h-3.5 w-3.5" /> Filters</div>
            <Input placeholder="Search learner…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-52">
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MatrixStatus | "all")} className="w-44">
              <option value="all">All statuses</option>
              {(Object.keys(MATRIX_STATUS_LABELS) as MatrixStatus[]).map((s) => <option key={s} value={s}>{MATRIX_STATUS_LABELS[s]}</option>)}
            </Select>
            <span className="text-xs text-muted">of 13 filters in full scope</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-3">
            {(Object.keys(MATRIX_STATUS_LABELS) as MatrixStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <StatusDot status={s} /> {MATRIX_STATUS_LABELS[s]}
              </div>
            ))}
          </div>

          {selectedRows.size > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-[10px] bg-primary-50 px-3 py-2">
              <span className="text-sm font-medium text-primary-700">{selectedRows.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary">Allocate course</Button>
                <Button size="sm" variant="secondary">Set deadline</Button>
                <Button size="sm" variant="secondary">Send reminder</Button>
                <button onClick={() => setSelectedRows(new Set())} className="ml-1 text-muted hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {isLoading ? (
            <SkeletonRows rows={10} />
          ) : view === "learner" ? (
            <Card className="overflow-hidden">
              <div className="flex border-b border-line bg-gray-50 text-xs font-semibold text-muted">
                <div className="w-8 shrink-0 px-3 py-2.5" />
                <div className="w-48 shrink-0 px-3 py-2.5">Learner</div>
                {visibleRequirements.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequirement(req.id)}
                    className="w-36 shrink-0 truncate px-3 py-2.5 text-left hover:text-primary-700"
                    title={req.title}
                  >
                    {req.title}
                  </button>
                ))}
              </div>
              <div ref={parentRef} className="max-h-[560px] overflow-auto">
                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const learner = learners[vRow.index];
                    return (
                      <div
                        key={learner.learnerId}
                        className="absolute left-0 top-0 flex w-full items-center border-b border-line hover:bg-gray-50"
                        style={{ height: vRow.size, transform: `translateY(${vRow.start}px)` }}
                      >
                        <div className="w-8 shrink-0 px-3">
                          <input type="checkbox" checked={selectedRows.has(learner.learnerId)} onChange={() => toggleRow(learner.learnerId)} />
                        </div>
                        <div className="w-48 shrink-0 truncate px-3 text-sm text-ink">{learner.learnerName}</div>
                        {visibleRequirements.map((req) => {
                          const cell = cellIndex.get(`${learner.learnerId}::${req.id}`);
                          return (
                            <div key={req.id} className="flex w-36 shrink-0 items-center px-3">
                              {cell ? <StatusDot status={cell.status} /> : <span className="h-2.5 w-2.5 rounded-full bg-gray-100" />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-line px-3 py-2 text-xs text-muted">
                {learners.length} learners × {visibleRequirements.length} requirements — virtualised rows (this demo renders {learners.length}×{visibleRequirements.length} ≈{" "}
                {(learners.length * visibleRequirements.length).toLocaleString()} cells; the same virtualization holds at the milestone doc's 5,000 × 150 target scale).
              </div>
            </Card>
          ) : (
            <Card>
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="px-5 py-3">{view === "training" ? "Requirement" : view.charAt(0).toUpperCase() + view.slice(1)}</th>
                      <th className="px-5 py-3">Completed</th>
                      <th className="px-5 py-3">Overdue</th>
                      <th className="px-5 py-3">Total records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(view === "training" ? (requirements ?? []).map((r) => ({ name: r.title, total: (cells ?? []).filter((c) => c.requirementId === r.id).length, completed: (cells ?? []).filter((c) => c.requirementId === r.id && c.status === "completed").length, overdue: (cells ?? []).filter((c) => c.requirementId === r.id && c.status === "overdue").length })) : aggregated).map((row) => (
                      <tr key={row.name} className="border-b border-line last:border-0">
                        <td className="px-5 py-2.5 font-medium text-ink">{row.name}</td>
                        <td className="px-5 py-2.5"><Badge tone="success">{row.completed}</Badge></td>
                        <td className="px-5 py-2.5"><Badge tone="danger">{row.overdue}</Badge></td>
                        <td className="px-5 py-2.5 text-muted">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {tab === "audit" && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Learner</th>
                  <th className="px-5 py-3">Requirement</th>
                  <th className="px-5 py-3">Field</th>
                  <th className="px-5 py-3">Previous → New</th>
                  <th className="px-5 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {audit?.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-muted">{new Date(entry.changedAt).toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-ink">{entry.learnerName}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{entry.requirementTitle}</td>
                    <td className="px-5 py-2.5 text-ink-soft capitalize">{entry.field}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{entry.previousValue ?? "—"} → {entry.newValue}</td>
                    <td className="px-5 py-2.5 text-muted">{entry.changedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {selectedRequirement && requirements && (
        <RequirementDetailPanel
          requirement={requirements.find((r) => r.id === selectedRequirement)!}
          onClose={() => setSelectedRequirement(null)}
        />
      )}
    </>
  );
}

function RequirementDetailPanel({ requirement, onClose }: { requirement: TrainingRequirement; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-96 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Requirement detail</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm font-medium text-ink">{requirement.title}</p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Target</span><span className="text-ink">{requirement.targetLabel}</span></div>
          <div className="flex justify-between"><span className="text-muted">Mandatory</span><span className="text-ink">{requirement.mandatory ? "Yes" : "No"}</span></div>
          <div className="flex justify-between"><span className="text-muted">Recurring</span><span className="text-ink">{requirement.recurring ? `Every ${requirement.recurrenceMonths} months` : "No"}</span></div>
          <div className="flex justify-between"><span className="text-muted">Linked course</span><span className="text-ink">{requirement.masterCourseTitle ?? "None — requirement only"}</span></div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1">Edit requirement</Button>
          <Button size="sm" className="flex-1">Bulk allocate</Button>
        </div>
      </div>
    </div>
  );
}
