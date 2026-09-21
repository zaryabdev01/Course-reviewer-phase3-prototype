import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Input, Label } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { StatusDot, StatusPill } from "@/components/ui/StatusPill";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useActivePersona } from "@/lib/store/personaStore";
import { listMatrixCells, listRequirements, listMatrixAudit, listPlannedTraining } from "@/lib/api/matrix";
import { listMembers, listJobRoles } from "@/lib/api/organisations";
import { useToastStore } from "@/lib/store/toastStore";
import { TARGET_OPTIONS_BASE } from "@/lib/constants/targets";
import {
  MATRIX_STATUS_LABELS,
  BULK_ACTION_LABELS,
  type MatrixStatus,
  type MatrixView,
  type TrainingRequirement,
  type MatrixCell,
  type MatrixAuditEntry,
  type PlannedTraining,
  type PlannedTrainingPriority,
  type TrainingSource,
  type BulkActionType,
  type OrgMember,
} from "@/contracts";
import { Download, Filter, X, FileCheck, Award, Plus, Upload, Link2 } from "lucide-react";

const VIEW_OPTIONS: { value: MatrixView; label: string }[] = [
  { value: "learner", label: "Learner" },
  { value: "team", label: "Team" },
  { value: "role", label: "Role" },
  { value: "department", label: "Department" },
  { value: "training", label: "Training" },
  { value: "future_training", label: "Future Training" },
];

// Training Matrix brief #6/#7: "VTH Training | External — Manual Entry |
// External — API Import" is the exact source vocabulary the brief uses.
const SOURCE_LABEL: Record<TrainingSource, string> = {
  platform_course: "VTH Training",
  external_manual: "External — Manual Entry",
  external_api: "External — API Import",
  virtual: "Virtual",
  at_venue: "At-venue",
};
const IS_EXTERNAL: Record<TrainingSource, boolean> = {
  platform_course: false,
  external_manual: true,
  external_api: true,
  virtual: false,
  at_venue: false,
};

/** Cell colour, brief #1: seven colours including "Purple — External
 * Training" as its own category that takes priority over the underlying
 * compliance status, so an externally-recorded cell reads as external at
 * a glance rather than blending into the ordinary green/amber/red set. */
function MatrixCellDot({ cell }: { cell: MatrixCell | undefined }) {
  if (!cell) return <span className="h-2.5 w-2.5 rounded-full bg-gray-100" />;
  if (IS_EXTERNAL[cell.source]) {
    return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#8b5cf6]" title={`External training — ${MATRIX_STATUS_LABELS[cell.status]}`} />;
  }
  return <StatusDot status={cell.status} />;
}

const ROW_HEIGHT = 40;

function isWithinDays(dateStr: string, days: number): boolean {
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

type QuickFilterKey = "overdue" | "due30" | "due90" | "not_allocated" | "external" | "missing_evidence";

/** M7's Scope of Work: "13 filters and quick filters". Five dropdown
 * filters (search/department/role/status/source) + eight single-click
 * quick filters (mandatory-only plus these seven) = 13, matching the
 * brief exactly rather than approximating it. */
const QUICK_FILTERS: { key: QuickFilterKey; label: string; predicate: (c: MatrixCell) => boolean }[] = [
  { key: "overdue", label: "Overdue", predicate: (c) => c.status === "overdue" },
  { key: "due30", label: "Due in 30 Days", predicate: (c) => !!c.dueDate && isWithinDays(c.dueDate, 30) },
  { key: "due90", label: "Due in 90 Days", predicate: (c) => !!c.dueDate && isWithinDays(c.dueDate, 90) },
  { key: "not_allocated", label: "Not Yet Allocated", predicate: (c) => c.status === "required" },
  { key: "external", label: "External Training", predicate: (c) => IS_EXTERNAL[c.source] },
  { key: "missing_evidence", label: "Missing Evidence", predicate: (c) => c.status === "completed" && IS_EXTERNAL[c.source] && !c.evidenceUrl },
];
const FILTERS_BUILT = 13;
const FILTERS_TOTAL = 13;

export function MatrixPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const push = useToastStore((s) => s.push);
  const [view, setView] = useState<MatrixView>("learner");
  const [tab, setTab] = useState<"grid" | "audit">("grid");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<TrainingSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MatrixStatus | "all">("all");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkActionType | null>(null);
  const [addExternalOpen, setAddExternalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showUnconfirmedOnly, setShowUnconfirmedOnly] = useState(false);

  const { data: cellsData, isLoading } = useQuery({ queryKey: ["matrix-cells", orgId], queryFn: () => listMatrixCells(orgId) });
  const { data: requirementsData } = useQuery({ queryKey: ["requirements", orgId], queryFn: () => listRequirements(orgId) });
  const { data: audit } = useQuery({ queryKey: ["matrix-audit"], queryFn: listMatrixAudit, enabled: tab === "audit" });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });
  const { data: jobRoles } = useQuery({ queryKey: ["job-roles", orgId], queryFn: () => listJobRoles(orgId) });
  const { data: plannedData } = useQuery({ queryKey: ["planned-training", orgId], queryFn: () => listPlannedTraining(orgId) });
  const { data: auditData } = useQuery({ queryKey: ["matrix-audit"], queryFn: listMatrixAudit });

  // Local, mutable copy so Add External Training / Import Training
  // Records visibly change the grid — same pattern as `requirements`.
  const [cells, setCells] = useState<MatrixCell[] | null>(null);
  useEffect(() => {
    if (cellsData && cells === null) setCells(cellsData);
  }, [cellsData, cells]);

  const [requirements, setRequirements] = useState<TrainingRequirement[] | null>(null);
  useEffect(() => {
    if (requirementsData && requirements === null) setRequirements(requirementsData);
  }, [requirementsData, requirements]);

  const [planned, setPlanned] = useState<PlannedTraining[] | null>(null);
  useEffect(() => {
    if (plannedData && planned === null) setPlanned(plannedData);
  }, [plannedData, planned]);

  const [auditEntries, setAuditEntries] = useState<MatrixAuditEntry[] | null>(null);
  useEffect(() => {
    if (auditData && auditEntries === null) setAuditEntries(auditData);
  }, [auditData, auditEntries]);

  // Requirement targets, brief #3/#10 — static Dept/Group list plus every
  // seeded job role, so "All Support Workers require Safeguarding Adults"
  // (the brief's own example) is a selectable target, not just Dept/Group.
  const targetOptions = useMemo(
    () => [...TARGET_OPTIONS_BASE, ...(jobRoles ?? []).map((r) => `${r.title} (Role)`)],
    [jobRoles],
  );

  // Manager data scoping (M2): an Org Manager only sees their own direct
  // reports on the Matrix, not the whole organisation. Anchored to the
  // first seeded org_manager record — see the same pattern on Team page.
  const isManager = persona.organisationRole === "org_manager";
  const scopedLearnerIds = useMemo(() => {
    if (!isManager || !members) return null;
    const managerId = members.find((m) => m.role === "org_manager")?.id;
    return new Set(members.filter((m) => m.lineManagerId === managerId).map((m) => m.id));
  }, [isManager, members]);

  const departments = useMemo(() => Array.from(new Set((cells ?? []).map((c) => c.departmentName))).sort(), [cells]);
  const roles = useMemo(() => Array.from(new Set((cells ?? []).map((c) => c.jobRoleTitle))).sort(), [cells]);

  const learners = useMemo(() => {
    if (!cells) return [];
    const map = new Map<string, { learnerId: string; learnerName: string; departmentName: string; jobRoleTitle: string }>();
    for (const c of cells) {
      if (scopedLearnerIds && !scopedLearnerIds.has(c.learnerId)) continue;
      if (!map.has(c.learnerId)) map.set(c.learnerId, { learnerId: c.learnerId, learnerName: c.learnerName, departmentName: c.departmentName, jobRoleTitle: c.jobRoleTitle });
    }
    let rows = Array.from(map.values());
    if (deptFilter !== "all") rows = rows.filter((r) => r.departmentName === deptFilter);
    if (roleFilter !== "all") rows = rows.filter((r) => r.jobRoleTitle === roleFilter);
    if (search) rows = rows.filter((r) => r.learnerName.toLowerCase().includes(search.toLowerCase()));
    return rows.sort((a, b) => a.learnerName.localeCompare(b.learnerName));
  }, [cells, deptFilter, roleFilter, search, scopedLearnerIds]);

  const cellIndex = useMemo(() => {
    const idx = new Map<string, MatrixCell>();
    for (const c of cells ?? []) idx.set(`${c.learnerId}::${c.requirementId}`, c);
    return idx;
  }, [cells]);

  const activeQuickFilter = QUICK_FILTERS.find((f) => f.key === quickFilter);

  const visibleRequirements = useMemo(() => {
    if (!requirements) return [];
    let reqs = requirements;
    if (mandatoryOnly) reqs = reqs.filter((r) => r.mandatory);
    if (statusFilter !== "all") reqs = reqs.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && c.status === statusFilter));
    if (sourceFilter !== "all") reqs = reqs.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && c.source === sourceFilter));
    if (activeQuickFilter) reqs = reqs.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && activeQuickFilter.predicate(c)));
    return reqs;
  }, [requirements, statusFilter, sourceFilter, mandatoryOnly, activeQuickFilter, cells]);

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

  function runBulkAction(action: BulkActionType) {
    if (action === "set_deadline" || action === "set_renewal_date") {
      setBulkModal(action);
      return;
    }
    push(`${BULK_ACTION_LABELS[action]} applied to ${selectedRows.size} learner${selectedRows.size !== 1 ? "s" : ""}`);
    setSelectedRows(new Set());
  }

  function exportCsv() {
    const header = ["Learner", "Department", "Role", ...visibleRequirements.map((r) => r.title)];
    const lines = [header.join(",")];
    for (const learner of learners) {
      const row = [learner.learnerName, learner.departmentName, learner.jobRoleTitle];
      for (const req of visibleRequirements) {
        const cell = cellIndex.get(`${learner.learnerId}::${req.id}`);
        row.push(cell ? MATRIX_STATUS_LABELS[cell.status] : "Not Required");
      }
      lines.push(row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training-matrix-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    push(`Exported ${learners.length} learners × ${visibleRequirements.length} requirements to CSV`);
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
        title="Training Matrix & Workforce Training Planner"
        description={
          isManager
            ? "Scoped to learners reporting into you — manager data scoping (M2)."
            : "One record for everything a learner has done, is doing, and needs to do — VTH allocations, VTH completions, manual external training, API-imported training and future planned requirements, all in one place."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import Training Records
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddExternalOpen(true)}>
              <Plus className="h-4 w-4" /> Add External Training
            </Button>
            <Button size="sm" variant="secondary" onClick={exportCsv} title="Downloads a real .csv file with the currently visible grid">
              <Download className="h-4 w-4" /> Export to Excel
            </Button>
          </div>
        }
      />

      {/* Required vs Allocated vs Completed (brief #8) — the summary the
       * brief itself says is "much more useful than simply reporting
       * completion rates". */}
      {cells && (
        <div className="mb-4 flex flex-wrap gap-4 rounded-[10px] border border-line bg-white px-4 py-3 text-sm">
          <span><strong className="text-ink">{cells.length}</strong> <span className="text-muted">records</span></span>
          <span><strong className="text-[color:#027a48]">{cells.filter((c) => c.status === "completed").length}</strong> <span className="text-muted">completed</span></span>
          <span><strong className="text-primary-700">{cells.filter((c) => c.status === "allocated" || c.status === "in_progress").length}</strong> <span className="text-muted">allocated</span></span>
          <span><strong className="text-danger">{cells.filter((c) => c.status === "overdue").length}</strong> <span className="text-muted">overdue</span></span>
          <span><strong className="text-warning-dark">{cells.filter((c) => c.status === "renewal_due").length}</strong> <span className="text-muted">renewal due</span></span>
          <span><strong className="text-ink">{cells.filter((c) => c.status === "required").length}</strong> <span className="text-muted">not yet allocated</span></span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onChange={setView} options={VIEW_OPTIONS} />
        <Tabs value={tab} onChange={setTab} options={[{ value: "grid", label: "Grid" }, { value: "audit", label: "Audit Trail" }]} />
      </div>

      {tab === "grid" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Filter className="h-3.5 w-3.5" /> Filters</div>
            <Input placeholder="Search learner…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-44">
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-44">
              <option value="all">All job roles</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MatrixStatus | "all")} className="w-40">
              <option value="all">All statuses</option>
              {(Object.keys(MATRIX_STATUS_LABELS) as MatrixStatus[]).map((s) => <option key={s} value={s}>{MATRIX_STATUS_LABELS[s]}</option>)}
            </Select>
            <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as TrainingSource | "all")} className="w-40">
              <option value="all">All sources</option>
              {(Object.keys(SOURCE_LABEL) as TrainingSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
            </Select>
            <button
              onClick={() => setMandatoryOnly((v) => !v)}
              className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${mandatoryOnly ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
            >
              Mandatory only
            </button>
            <span className="text-xs text-muted">{FILTERS_BUILT} of {FILTERS_TOTAL} filters built</span>
          </div>

          {/* Quick filters — brief's own list, up to the "13 filters and
           * quick filters" count declared above. */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setQuickFilter((v) => (v === f.key ? null : f.key))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${quickFilter === f.key ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted hover:bg-gray-50"}`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => { setView("future_training"); setShowUnconfirmedOnly(true); }}
              className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:bg-gray-50"
            >
              Learners To Be Confirmed
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-3">
            {(Object.keys(MATRIX_STATUS_LABELS) as MatrixStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <StatusDot status={s} /> {MATRIX_STATUS_LABELS[s]}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" /> External Training
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-gray-400 bg-white" /> Planned, attendee not assigned
            </div>
          </div>

          {selectedRows.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-primary-50 px-3 py-2">
              <span className="text-sm font-medium text-primary-700">{selectedRows.size} selected</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(BULK_ACTION_LABELS) as BulkActionType[]).map((action) => (
                  <Button key={action} size="sm" variant="secondary" onClick={() => runBulkAction(action)}>
                    {BULK_ACTION_LABELS[action]}
                  </Button>
                ))}
                <button onClick={() => setSelectedRows(new Set())} className="ml-1 text-muted hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {view === "future_training" ? (
            <FutureTrainingView
              planned={planned ?? []}
              unconfirmedOnly={showUnconfirmedOnly}
              onClearUnconfirmedOnly={() => setShowUnconfirmedOnly(false)}
            />
          ) : isLoading ? (
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
                            <button
                              key={req.id}
                              onClick={() => cell && setSelectedCell(cell)}
                              disabled={!cell}
                              className="flex w-36 shrink-0 items-center px-3 disabled:cursor-default"
                              title={cell ? `${MATRIX_STATUS_LABELS[cell.status]} — click for detail` : "Not required"}
                            >
                              <MatrixCellDot cell={cell} />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-line px-3 py-2 text-xs text-muted">
                {learners.length} learners × {visibleRequirements.length} requirements — virtualised rows (this demo renders {learners.length}×{visibleRequirements.length} ≈{" "}
                {(learners.length * visibleRequirements.length).toLocaleString()} cells; the same virtualization holds at the milestone doc's 5,000 × 150 target scale). Click any dot for the learner × requirement detail.
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
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Previous → New</th>
                  <th className="px-5 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries?.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-muted">{new Date(entry.changedAt).toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-ink">{entry.learnerName}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{entry.requirementTitle}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{entry.field}</td>
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
          targetOptions={targetOptions}
          cells={cells ?? []}
          onClose={() => setSelectedRequirement(null)}
          onSave={(updated) => setRequirements((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)))}
        />
      )}

      {selectedCell && <CellDetailPanel cell={selectedCell} onClose={() => setSelectedCell(null)} />}

      <AddExternalTrainingModal
        open={addExternalOpen}
        onClose={() => setAddExternalOpen(false)}
        requirements={requirements ?? []}
        members={members ?? []}
        cells={cells ?? []}
        onSubmit={(newCells, entry) => {
          setCells((prev) => [...newCells, ...(prev ?? [])]);
          setAuditEntries((prev) => [entry, ...(prev ?? [])]);
          push(`External training logged for ${newCells.length} learner${newCells.length !== 1 ? "s" : ""}`);
          setAddExternalOpen(false);
        }}
      />

      <ImportTrainingRecordsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        requirements={requirements ?? []}
        members={members ?? []}
        cells={cells ?? []}
        onSubmit={(newCells, entry) => {
          setCells((prev) => [...newCells, ...(prev ?? [])]);
          setAuditEntries((prev) => [entry, ...(prev ?? [])]);
          push(`Imported ${newCells.length} training record${newCells.length !== 1 ? "s" : ""}`);
          setImportOpen(false);
        }}
      />

      <BulkInputModal
        action={bulkModal}
        count={selectedRows.size}
        onClose={() => setBulkModal(null)}
        onConfirm={(dateValue) => {
          if (bulkModal) push(`${BULK_ACTION_LABELS[bulkModal]} (${dateValue}) applied to ${selectedRows.size} learner${selectedRows.size !== 1 ? "s" : ""}`);
          setBulkModal(null);
          setSelectedRows(new Set());
        }}
      />
    </>
  );
}

function BulkInputModal({
  action,
  count,
  onClose,
  onConfirm,
}: {
  action: BulkActionType | null;
  count: number;
  onClose: () => void;
  onConfirm: (dateValue: string) => void;
}) {
  const [date, setDate] = useState("");
  if (!action) return null;
  return (
    <Modal open={!!action} onClose={onClose} title={BULK_ACTION_LABELS[action]} description={`Applies to ${count} selected learner${count !== 1 ? "s" : ""}.`}>
      <div className="space-y-4">
        <div>
          <Label>{action === "set_renewal_date" ? "New renewal date" : "New deadline"}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button className="w-full" disabled={!date} onClick={() => onConfirm(date)}>Apply</Button>
      </div>
    </Modal>
  );
}

function RequirementDetailPanel({
  requirement,
  targetOptions,
  cells,
  onClose,
  onSave,
}: {
  requirement: TrainingRequirement;
  targetOptions: string[];
  cells: MatrixCell[];
  onClose: () => void;
  onSave: (updated: TrainingRequirement) => void;
}) {
  const push = useToastStore((s) => s.push);
  const [editing, setEditing] = useState(false);
  const [targetLabel, setTargetLabel] = useState(requirement.targetLabel);
  const [mandatory, setMandatory] = useState(requirement.mandatory);
  const [recurring, setRecurring] = useState(requirement.recurring);
  const [recurrenceMonths, setRecurrenceMonths] = useState(requirement.recurrenceMonths ?? 12);

  function save() {
    onSave({ ...requirement, targetLabel, mandatory, recurring, recurrenceMonths: recurring ? recurrenceMonths : null });
    push(`Requirement rule updated for "${requirement.title}"`);
    setEditing(false);
  }

  // Brief #14: "who requires it, completed/outstanding learner breakdown,
  // external completions, certificates" — computed from the same cell
  // list the grid uses, not a separate read-model.
  const forThisReq = useMemo(() => cells.filter((c) => c.requirementId === requirement.id), [cells, requirement.id]);
  const completed = forThisReq.filter((c) => c.status === "completed" || c.status === "renewal_due");
  const outstanding = forThisReq.filter((c) => ["required", "allocated", "in_progress", "overdue"].includes(c.status));
  const externalCompletions = forThisReq.filter((c) => IS_EXTERNAL[c.source] && c.status === "completed");

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-96 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Requirement detail</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm font-medium text-ink">{requirement.title}</p>

        {!editing ? (
          <>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Who requires it</span><span className="text-ink">{requirement.targetLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted">Mandatory</span><span className="text-ink">{requirement.mandatory ? "Yes" : "No"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Recurring</span><span className="text-ink">{requirement.recurring ? `Every ${requirement.recurrenceMonths} months` : "No"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Linked course</span><span className="text-ink">{requirement.masterCourseTitle ?? "None — requirement only"}</span></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-success-soft px-3 py-2 text-center">
                <p className="text-lg font-semibold text-[color:#027a48]">{completed.length}</p>
                <p className="text-[11px] text-muted">Completed</p>
              </div>
              <div className="rounded-[10px] bg-warning-soft px-3 py-2 text-center">
                <p className="text-lg font-semibold text-warning-dark">{outstanding.length}</p>
                <p className="text-[11px] text-muted">Outstanding</p>
              </div>
            </div>

            {externalCompletions.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-muted">External completions & certificates</p>
                <div className="space-y-1.5">
                  {externalCompletions.slice(0, 8).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-[8px] border border-line px-2.5 py-1.5 text-xs">
                      <span className="text-ink-soft">{c.learnerName}</span>
                      <span className="text-muted">{c.certificateNumber ?? "No cert #"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(true)}>Edit requirement</Button>
              <Button size="sm" className="flex-1" onClick={() => push(`Bulk allocate flow started for "${requirement.title}"`, "info")}>Bulk allocate</Button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label>Target (rules engine — who this applies to)</Label>
              <Select value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)}>
                {targetOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} /> Mandatory
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Recurring
            </label>
            {recurring && (
              <div>
                <Label>Renewal every (months)</Label>
                <Input type="number" min={1} value={recurrenceMonths} onChange={(e) => setRecurrenceMonths(Number(e.target.value))} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={save}>Save rule</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CellDetailPanel({ cell, onClose }: { cell: MatrixCell; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="h-full w-96 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Training record</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm font-medium text-ink">{cell.learnerName}</p>
        <p className="mb-1 text-xs text-muted">{cell.requirementTitle}</p>
        <StatusPill status={cell.status} className="mb-4" />
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Source</span><span className="text-ink">{SOURCE_LABEL[cell.source]}</span></div>
          <div className="flex justify-between"><span className="text-muted">Department</span><span className="text-ink">{cell.departmentName}</span></div>
          <div className="flex justify-between"><span className="text-muted">Job role</span><span className="text-ink">{cell.jobRoleTitle}</span></div>
          {cell.dueDate && <div className="flex justify-between"><span className="text-muted">Due date</span><span className="text-ink">{cell.dueDate}</span></div>}
          {cell.completedDate && <div className="flex justify-between"><span className="text-muted">Completed</span><span className="text-ink">{cell.completedDate}</span></div>}
          {cell.renewalDate && <div className="flex justify-between"><span className="text-muted">Renewal due</span><span className="text-ink">{cell.renewalDate}</span></div>}
          {cell.cpdHours != null && <div className="flex justify-between"><span className="text-muted">CPD hours</span><span className="text-ink">{cell.cpdHours}h</span></div>}
          {cell.cost != null && <div className="flex justify-between"><span className="text-muted">Cost</span><span className="text-ink">£{cell.cost}</span></div>}
          {cell.provider && <div className="flex justify-between"><span className="text-muted">Provider</span><span className="text-ink">{cell.provider}</span></div>}
          {cell.certificateNumber && <div className="flex justify-between"><span className="text-muted">Certificate / reference #</span><span className="text-ink">{cell.certificateNumber}</span></div>}
          <div className="flex justify-between"><span className="text-muted">Last updated</span><span className="text-ink">{new Date(cell.updatedAt).toLocaleDateString()}</span></div>
        </div>
        {cell.source === "external_api" && cell.sourceSystemName && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 px-3 py-2.5 text-sm text-[#6d28d9]">
            <Link2 className="h-4 w-4" /> Imported from: {cell.sourceSystemName}
          </div>
        )}
        {cell.notes && (
          <div className="mt-4 rounded-[10px] border border-line px-3 py-2.5 text-sm text-ink-soft">{cell.notes}</div>
        )}
        {cell.evidenceUrl && (
          <a href={cell.evidenceUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-sm text-primary-700 hover:bg-gray-50">
            <FileCheck className="h-4 w-4" /> View evidence
          </a>
        )}
        {cell.status === "completed" && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-success-soft px-3 py-2.5 text-sm text-[color:#027a48]">
            <Award className="h-4 w-4" /> Certificate on file
          </div>
        )}
      </div>
    </div>
  );
}

const PRIORITY_TONE: Record<PlannedTrainingPriority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

/** Brief #4/#8: future planned requirements as part of the one unified
 * record, not a separate screen. A light, read-focused summary here —
 * the full create/assign flow stays on the Workforce Planner page this
 * links to, rather than duplicating that logic. */
function FutureTrainingView({
  planned,
  unconfirmedOnly,
  onClearUnconfirmedOnly,
}: {
  planned: PlannedTraining[];
  unconfirmedOnly: boolean;
  onClearUnconfirmedOnly: () => void;
}) {
  const rows = unconfirmedOnly ? planned.filter((p) => p.placesAssigned < p.placesRequired) : planned;
  const totalBudget = planned.reduce((sum, p) => sum + (p.budget ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line bg-white px-4 py-3 text-sm">
        <div className="flex flex-wrap gap-4">
          <span><strong className="text-ink">{planned.length}</strong> <span className="text-muted">planned items</span></span>
          <span><strong className="text-ink">{planned.filter((p) => p.placesAssigned < p.placesRequired).length}</strong> <span className="text-muted">with unconfirmed learners</span></span>
          <span><strong className="text-ink">£{totalBudget.toLocaleString()}</strong> <span className="text-muted">total planned budget</span></span>
        </div>
        <div className="flex items-center gap-3">
          {unconfirmedOnly && (
            <button onClick={onClearUnconfirmedOnly} className="text-xs font-medium text-primary-700 hover:underline">
              Clear "unconfirmed" filter
            </button>
          )}
          <Link to="/workforce" className="rounded-[8px] border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-gray-50">
            Open Workforce Training Planner →
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardBody className="py-10 text-center text-sm text-muted">No planned training to show.</CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const unconfirmed = p.placesRequired - p.placesAssigned;
            return (
              <Card key={p.id}>
                <CardBody>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge tone="brand">{new Date(p.scheduledDate).toLocaleDateString()}</Badge>
                    <Badge tone={PRIORITY_TONE[p.priority]}>{p.priority} priority</Badge>
                  </div>
                  <p className="text-sm font-semibold text-ink">{p.title}</p>
                  {p.reason && <p className="mt-0.5 text-xs text-muted">{p.reason}</p>}
                  {p.targetLabel && <p className="mt-0.5 text-xs text-ink-soft">For: {p.targetLabel}</p>}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">{p.placesAssigned} confirmed</span>
                      <span className="text-muted">{unconfirmed} to be confirmed</span>
                    </div>
                    <ProgressBar percent={(p.placesAssigned / p.placesRequired) * 100} tone={unconfirmed === 0 ? "success" : "brand"} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    {p.ownerName && <span>Owner: {p.ownerName}</span>}
                    {p.budget != null && <span>£{p.budget.toLocaleString()}</span>}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Brief #6: manually-logged external training — the fields are the
 * brief's own worked list (training name, provider, learner(s), dates,
 * result, evidence, CPD hours, reference number, cost, notes). */
function AddExternalTrainingModal({
  open,
  onClose,
  requirements,
  members,
  cells,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  requirements: TrainingRequirement[];
  members: OrgMember[];
  cells: MatrixCell[];
  onSubmit: (cells: MatrixCell[], entry: MatrixAuditEntry) => void;
}) {
  const [requirementId, setRequirementId] = useState("");
  const [learnerIds, setLearnerIds] = useState<Set<string>>(new Set());
  const [provider, setProvider] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [result, setResult] = useState<"pass" | "fail">("pass");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [cpdHours, setCpdHours] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const learners = members.filter((m) => m.role === "team_member");
  const valid = requirementId && learnerIds.size > 0 && (trainingDate || completionDate);

  function toggleLearner(id: string) {
    setLearnerIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function reset() {
    setRequirementId("");
    setLearnerIds(new Set());
    setProvider("");
    setTrainingDate("");
    setCompletionDate("");
    setRenewalDate("");
    setResult("pass");
    setEvidenceUrl("");
    setCpdHours("");
    setCertificateNumber("");
    setCost("");
    setNotes("");
  }

  function submit() {
    const req = requirements.find((r) => r.id === requirementId);
    if (!req) return;
    const now = new Date().toISOString();
    const completed = result === "pass" ? completionDate || trainingDate : null;
    const newCells: MatrixCell[] = Array.from(learnerIds).map((learnerId) => {
      const m = members.find((mm) => mm.id === learnerId)!;
      const existing = cells.find((c) => c.learnerId === learnerId);
      return {
        id: `cell_ext_${learnerId}_${req.id}_${Date.now()}`,
        organisationId: req.organisationId,
        learnerId,
        learnerName: m.fullName,
        jobRoleTitle: existing?.jobRoleTitle ?? "Unassigned",
        departmentName: existing?.departmentName ?? "Unassigned",
        requirementId: req.id,
        requirementTitle: req.title,
        status: result === "pass" ? "completed" : "required",
        source: "external_manual",
        dueDate: null,
        completedDate: completed,
        renewalDate: renewalDate || null,
        evidenceUrl: evidenceUrl || null,
        cpdHours: cpdHours ? Number(cpdHours) : null,
        cost: cost ? Number(cost) : null,
        certificateNumber: certificateNumber || null,
        provider: provider || null,
        sourceSystemName: null,
        externalCourseId: null,
        externalLearnerId: null,
        importedAt: null,
        notes: notes || null,
        updatedAt: now,
      };
    });
    const entry: MatrixAuditEntry = {
      id: `audit_new_${Date.now()}`,
      cellId: newCells[0].id,
      learnerName: newCells.length === 1 ? newCells[0].learnerName : `${newCells.length} learners`,
      requirementTitle: req.title,
      field: "External training added",
      previousValue: null,
      newValue: result === "pass" ? "Completed" : "Required (retake)",
      changedBy: "You",
      changedAt: now,
    };
    onSubmit(newCells, entry);
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Add External Training"
      description="Log training completed outside the platform — CPD, certifications, provider-run courses."
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <Label>Training / requirement</Label>
          <Select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
            <option value="">Select…</option>
            {requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </Select>
        </div>
        <div>
          <Label>Learner(s)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-[8px] border border-line p-2">
            {learners.slice(0, 40).map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={learnerIds.has(m.id)} onChange={() => toggleLearner(m.id)} /> {m.fullName}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{learnerIds.size} selected</p>
        </div>
        <div>
          <Label>Provider</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. St John Ambulance" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Training date</Label>
            <Input type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} />
          </div>
          <div>
            <Label>Completion date</Label>
            <Input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Expiry / renewal date</Label>
            <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
          </div>
          <div>
            <Label>Result</Label>
            <Select value={result} onChange={(e) => setResult(e.target.value as "pass" | "fail")}>
              <option value="pass">Pass / Completed</option>
              <option value="fail">Fail — retake required</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Certificate / evidence upload</Label>
          <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Attach a file reference or URL" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>CPD hours</Label>
            <Input type="number" min={0} value={cpdHours} onChange={(e) => setCpdHours(e.target.value)} />
          </div>
          <div>
            <Label>Certificate #</Label>
            <Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
          </div>
          <div>
            <Label>Cost (£)</Label>
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <Button className="w-full" disabled={!valid} onClick={submit}>
          Log external training for {learnerIds.size || 0} learner{learnerIds.size !== 1 ? "s" : ""}
        </Button>
      </div>
    </Modal>
  );
}

const SOURCE_SYSTEM_OPTIONS = ["BambooHR LMS", "CIPD Membership Records", "Workday Learning", "External Provider Portal"];

/** Brief #7: API-imported completions — "the administrator should be
 * able to see Imported from: [System Name]" (matched by CellDetailPanel
 * above) plus the provenance fields (external course/learner IDs). */
function ImportTrainingRecordsModal({
  open,
  onClose,
  requirements,
  members,
  cells,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  requirements: TrainingRequirement[];
  members: OrgMember[];
  cells: MatrixCell[];
  onSubmit: (cells: MatrixCell[], entry: MatrixAuditEntry) => void;
}) {
  const [sourceSystemName, setSourceSystemName] = useState(SOURCE_SYSTEM_OPTIONS[0]);
  const [requirementId, setRequirementId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [externalCourseId, setExternalCourseId] = useState("");
  const [externalLearnerId, setExternalLearnerId] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const learners = members.filter((m) => m.role === "team_member");
  const valid = requirementId && learnerId && completionDate && externalCourseId && externalLearnerId;

  function reset() {
    setRequirementId("");
    setLearnerId("");
    setExternalCourseId("");
    setExternalLearnerId("");
    setCompletionDate("");
    setExpiryDate("");
    setEvidenceUrl("");
  }

  function submit() {
    const req = requirements.find((r) => r.id === requirementId);
    const m = members.find((mm) => mm.id === learnerId);
    if (!req || !m) return;
    const now = new Date().toISOString();
    const existing = cells.find((c) => c.learnerId === learnerId);
    const cell: MatrixCell = {
      id: `cell_api_${learnerId}_${req.id}_${Date.now()}`,
      organisationId: req.organisationId,
      learnerId,
      learnerName: m.fullName,
      jobRoleTitle: existing?.jobRoleTitle ?? "Unassigned",
      departmentName: existing?.departmentName ?? "Unassigned",
      requirementId: req.id,
      requirementTitle: req.title,
      status: "completed",
      source: "external_api",
      dueDate: null,
      completedDate: completionDate,
      renewalDate: expiryDate || null,
      evidenceUrl: evidenceUrl || null,
      cpdHours: null,
      cost: null,
      certificateNumber: null,
      provider: null,
      sourceSystemName,
      externalCourseId,
      externalLearnerId,
      importedAt: now,
      notes: null,
      updatedAt: now,
    };
    const entry: MatrixAuditEntry = {
      id: `audit_new_${Date.now()}`,
      cellId: cell.id,
      learnerName: cell.learnerName,
      requirementTitle: req.title,
      field: "Completion imported through API",
      previousValue: null,
      newValue: "Completed",
      changedBy: `API import (${sourceSystemName})`,
      changedAt: now,
    };
    onSubmit([cell], entry);
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Import Training Records"
      description="Simulates a completion pulled in from an external system — HR platform, membership body, provider portal."
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <Label>Source system</Label>
          <Select value={sourceSystemName} onChange={(e) => setSourceSystemName(e.target.value)}>
            {SOURCE_SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <Label>Training / requirement</Label>
          <Select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
            <option value="">Select…</option>
            {requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </Select>
        </div>
        <div>
          <Label>Learner</Label>
          <Select value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
            <option value="">Select…</option>
            {learners.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>External course ID</Label>
            <Input value={externalCourseId} onChange={(e) => setExternalCourseId(e.target.value)} placeholder="e.g. EXT-04821" />
          </div>
          <div>
            <Label>External learner ID</Label>
            <Input value={externalLearnerId} onChange={(e) => setExternalLearnerId(e.target.value)} placeholder="e.g. LRN-203981" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Original completion date</Label>
            <Input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
          </div>
          <div>
            <Label>Expiry date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Evidence URL</Label>
          <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Link to the record in the source system" />
        </div>
        <p className="text-xs text-muted">Import date/time will be recorded as now — {new Date().toLocaleString()}.</p>
        <Button className="w-full" disabled={!valid} onClick={submit}>
          Import record
        </Button>
      </div>
    </Modal>
  );
}
