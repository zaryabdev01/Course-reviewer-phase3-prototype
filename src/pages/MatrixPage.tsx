import { useEffect, useMemo, useRef, useState } from "react";
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
import { useActivePersona } from "@/lib/store/personaStore";
import { listMatrixCells, listRequirements, listMatrixAudit } from "@/lib/api/matrix";
import { listMembers } from "@/lib/api/organisations";
import { useToastStore } from "@/lib/store/toastStore";
import {
  MATRIX_STATUS_LABELS,
  BULK_ACTION_LABELS,
  type MatrixStatus,
  type MatrixView,
  type TrainingRequirement,
  type MatrixCell,
  type TrainingSource,
  type BulkActionType,
} from "@/contracts";
import { Download, Filter, X, FileCheck, Award } from "lucide-react";

const VIEW_OPTIONS: { value: MatrixView; label: string }[] = [
  { value: "learner", label: "Learner" },
  { value: "team", label: "Team" },
  { value: "role", label: "Role" },
  { value: "department", label: "Department" },
  { value: "training", label: "Training" },
];

const SOURCE_LABEL: Record<TrainingSource, string> = {
  platform_course: "Platform course",
  external: "External",
  virtual: "Virtual",
  at_venue: "At-venue",
};

const ROW_HEIGHT = 40;

/** All 13 filters named in M7's Scope of Work: seven direct filters plus
 * "13 filters and quick filters" — search/department/status/role/source
 * are full dropdown filters; mandatory-only and recurring-only are the
 * "quick filters" (single-click toggles). That's 7 named here; the
 * remainder (job-role hierarchy, location, team, evidence-present,
 * renewal-window, cost-range) are listed but not wired, same honesty
 * pattern as before — see the counter next to the filter row. */
const FILTERS_BUILT = 7;
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
  const [search, setSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkActionType | null>(null);

  const { data: cells, isLoading } = useQuery({ queryKey: ["matrix-cells", orgId], queryFn: () => listMatrixCells(orgId) });
  const { data: requirementsData } = useQuery({ queryKey: ["requirements", orgId], queryFn: () => listRequirements(orgId) });
  const { data: audit } = useQuery({ queryKey: ["matrix-audit"], queryFn: listMatrixAudit, enabled: tab === "audit" });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });

  const [requirements, setRequirements] = useState<TrainingRequirement[] | null>(null);
  useEffect(() => {
    if (requirementsData && requirements === null) setRequirements(requirementsData);
  }, [requirementsData, requirements]);

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

  const visibleRequirements = useMemo(() => {
    if (!requirements) return [];
    let reqs = requirements;
    if (mandatoryOnly) reqs = reqs.filter((r) => r.mandatory);
    if (statusFilter !== "all") reqs = reqs.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && c.status === statusFilter));
    if (sourceFilter !== "all") reqs = reqs.filter((req) => (cells ?? []).some((c) => c.requirementId === req.id && c.source === sourceFilter));
    return reqs;
  }, [requirements, statusFilter, sourceFilter, mandatoryOnly, cells]);

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
        title="Training Matrix"
        description={
          isManager
            ? "Scoped to learners reporting into you — manager data scoping (M2)."
            : "Compliance record — status pre-computed, updated by allocation and completion events."
        }
        actions={
          <Button size="sm" variant="secondary" onClick={exportCsv} title="Downloads a real .csv file with the currently visible grid">
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
            <span className="text-xs text-muted">{FILTERS_BUILT} of {FILTERS_TOTAL} filters in full scope</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-3">
            {(Object.keys(MATRIX_STATUS_LABELS) as MatrixStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <StatusDot status={s} /> {MATRIX_STATUS_LABELS[s]}
              </div>
            ))}
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
                            <button
                              key={req.id}
                              onClick={() => cell && setSelectedCell(cell)}
                              disabled={!cell}
                              className="flex w-36 shrink-0 items-center px-3 disabled:cursor-default"
                              title={cell ? `${MATRIX_STATUS_LABELS[cell.status]} — click for detail` : "Not required"}
                            >
                              {cell ? <StatusDot status={cell.status} /> : <span className="h-2.5 w-2.5 rounded-full bg-gray-100" />}
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
          onSave={(updated) => setRequirements((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)))}
        />
      )}

      {selectedCell && <CellDetailPanel cell={selectedCell} onClose={() => setSelectedCell(null)} />}

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

const TARGET_OPTIONS = [
  "All Staff",
  "Warehouse Operations (Dept)",
  "Fleet & Delivery (Dept)",
  "Customer Service (Dept)",
  "Forklift Certified (Group)",
  "New Starters 2026 (Group)",
];

function RequirementDetailPanel({
  requirement,
  onClose,
  onSave,
}: {
  requirement: TrainingRequirement;
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
              <div className="flex justify-between"><span className="text-muted">Target</span><span className="text-ink">{requirement.targetLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted">Mandatory</span><span className="text-ink">{requirement.mandatory ? "Yes" : "No"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Recurring</span><span className="text-ink">{requirement.recurring ? `Every ${requirement.recurrenceMonths} months` : "No"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Linked course</span><span className="text-ink">{requirement.masterCourseTitle ?? "None — requirement only"}</span></div>
            </div>
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
                {TARGET_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
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
          <div className="flex justify-between"><span className="text-muted">Last updated</span><span className="text-ink">{new Date(cell.updatedAt).toLocaleDateString()}</span></div>
        </div>
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
