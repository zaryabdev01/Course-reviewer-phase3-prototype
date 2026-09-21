import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select, Input, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listAllocations } from "@/lib/api/allocations";
import { listMembers, listCustomGroups } from "@/lib/api/organisations";
import { listMasterCourses } from "@/lib/api/courses";
import { useToastStore } from "@/lib/store/toastStore";
import type { Allocation, AllocationStatus, LearningFormat } from "@/contracts";
import { FORMAT_LABELS } from "@/contracts";
import { Plus, History, RefreshCw, Trash2, X } from "lucide-react";

const STATUS_TONE: Record<AllocationStatus, "success" | "warning" | "neutral" | "danger"> = {
  assigned: "neutral",
  in_progress: "warning",
  completed: "success",
  overdue: "danger",
  removed: "neutral",
};

const ACTION_LABEL: Record<string, string> = {
  allocated: "Allocated",
  reallocated: "Reallocated",
  removed: "Removed",
  reminder_sent: "Reminder sent",
};

export function AllocationsPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const push = useToastStore((s) => s.push);
  const [status, setStatus] = useState<AllocationStatus | "all">("all");

  const { data: allocationsData, isLoading } = useQuery({ queryKey: ["allocations", orgId], queryFn: () => listAllocations(orgId) });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });
  const { data: groups } = useQuery({ queryKey: ["custom-groups", orgId], queryFn: () => listCustomGroups(orgId) });
  const { data: courses } = useQuery({ queryKey: ["master-courses"], queryFn: listMasterCourses });

  // Local, mutable copy — allocation creation/reallocation/removal act on
  // this rather than the query cache, since there's no backend to persist
  // to. Seeded once from the query result.
  const [rows, setRows] = useState<Allocation[] | null>(null);
  useEffect(() => {
    if (allocationsData && rows === null) setRows(allocationsData);
  }, [allocationsData, rows]);

  const [createOpen, setCreateOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<Allocation | null>(null);
  const [reallocateFor, setReallocateFor] = useState<Allocation | null>(null);

  // Manager data scoping (M2) — same anchor pattern as Team and Matrix:
  // an Org Manager only sees allocations targeting their own direct reports.
  const isManager = persona.organisationRole === "org_manager";
  const scopedLearnerIds = (() => {
    if (!isManager || !members) return null;
    const managerId = members.find((m) => m.role === "org_manager")?.id;
    return new Set(members.filter((m) => m.lineManagerId === managerId).map((m) => m.id));
  })();

  const filtered = (rows ?? [])
    .filter((a) => status === "all" || a.status === status)
    .filter((a) => !scopedLearnerIds || a.targetType !== "learner" || scopedLearnerIds.has(a.targetId));
  const learners = (members?.filter((m) => m.role === "team_member") ?? []).filter((m) => !scopedLearnerIds || scopedLearnerIds.has(m.id));

  function removeAllocation(a: Allocation) {
    setRows((prev) =>
      (prev ?? []).map((r) =>
        r.id === a.id
          ? {
              ...r,
              status: "removed" as const,
              history: [...r.history, { at: new Date().toISOString(), action: "removed" as const, by: persona.email }],
            }
          : r,
      ),
    );
    push(`Removed allocation of "${a.masterCourseTitle}" for ${a.targetLabel}`);
  }

  return (
    <>
      <PageHeader
        title="Allocation"
        description={
          isManager
            ? "Scoped to learners reporting into you — manager data scoping (M2)."
            : "Allocate courses to learners or groups, with deadlines, Matrix visibility and format choice."
        }
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New allocation
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as AllocationStatus | "all")} className="w-48">
          <option value="all">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="removed">Removed</option>
        </Select>
        <span className="text-xs text-muted">{filtered.length} allocations</span>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading || rows === null ? (
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
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 60).map((a) => (
                  <tr key={a.id} className={`border-b border-line last:border-0 hover:bg-gray-50 ${a.status === "removed" ? "opacity-50" : ""}`}>
                    <td className="px-5 py-2.5 font-medium text-ink">{a.masterCourseTitle}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{a.targetLabel}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{a.deadline ?? "—"}</td>
                    <td className="px-5 py-2.5">{a.appearInMatrix ? <Badge tone="brand">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                    <td className="px-5 py-2.5 w-32"><ProgressBar percent={a.progressPercent} /></td>
                    <td className="px-5 py-2.5"><Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge></td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button title="History" onClick={() => setHistoryFor(a)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {a.status !== "removed" && a.status !== "completed" && (
                          <>
                            <button title="Reallocate" onClick={() => setReallocateFor(a)} className="rounded-[6px] p-1.5 text-muted hover:bg-gray-100 hover:text-ink">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button title="Remove" onClick={() => removeAllocation(a)} className="rounded-[6px] p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      {filtered.length > 60 && <p className="mt-2 text-xs text-muted">Showing 60 of {filtered.length} — pagination in the real build.</p>}

      {/* New allocation */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New allocation" description="Allocate a course to a learner or group.">
        <AllocationForm
          learners={learners}
          groups={groups ?? []}
          courses={courses ?? []}
          onSubmit={(values) => {
            const course = courses?.find((c) => c.id === values.courseId);
            if (!course || values.targetIds.length === 0) return;
            const targets = values.targetType === "group"
              ? (groups ?? []).filter((g) => values.targetIds.includes(g.id))
              : learners.filter((l) => values.targetIds.includes(l.id));
            if (targets.length === 0) return;
            const now = new Date().toISOString();
            const newAllocs: Allocation[] = targets.map((target, i) => ({
              id: `alloc_new_${Date.now()}_${i}`,
              organisationId: orgId,
              masterCourseId: course.id,
              masterCourseTitle: course.title,
              targetType: values.targetType,
              targetId: target.id,
              targetLabel: "fullName" in target ? target.fullName : target.name,
              formatChoice: values.formatChoice,
              fixedFormat: values.formatChoice === "fixed" ? values.fixedFormat : null,
              deadline: values.deadline || null,
              appearInMatrix: values.appearInMatrix,
              status: "assigned",
              progressPercent: 0,
              allocatedAt: now,
              allocatedBy: persona.email,
              seatConsumed: true,
              history: [{ at: now, action: "allocated", by: persona.email }],
            }));
            setRows((prev) => [...newAllocs, ...(prev ?? [])]);
            setCreateOpen(false);
            push(
              newAllocs.length === 1
                ? `Allocated "${course.title}" to ${newAllocs[0].targetLabel}`
                : `Allocated "${course.title}" to ${newAllocs.length} learners`,
            );
          }}
        />
      </Modal>

      {/* Reallocate */}
      <Modal open={!!reallocateFor} onClose={() => setReallocateFor(null)} title="Reallocate" description={reallocateFor ? `${reallocateFor.masterCourseTitle} — ${reallocateFor.targetLabel}` : ""}>
        {reallocateFor && (
          <ReallocateForm
            allocation={reallocateFor}
            onSubmit={(deadline, appearInMatrix) => {
              setRows((prev) =>
                (prev ?? []).map((r) =>
                  r.id === reallocateFor.id
                    ? {
                        ...r,
                        deadline,
                        appearInMatrix,
                        status: "assigned",
                        history: [...r.history, { at: new Date().toISOString(), action: "reallocated", by: persona.email }],
                      }
                    : r,
                ),
              );
              push(`Reallocated "${reallocateFor.masterCourseTitle}" — new deadline ${deadline || "none"}`);
              setReallocateFor(null);
            }}
          />
        )}
      </Modal>

      {/* History drawer */}
      {historyFor && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={() => setHistoryFor(null)}>
          <div className="h-full w-96 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Allocation history</h3>
              <button onClick={() => setHistoryFor(null)} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-1 text-sm font-medium text-ink">{historyFor.masterCourseTitle}</p>
            <p className="mb-4 text-xs text-muted">{historyFor.targetLabel}</p>
            <div className="space-y-3">
              {[...historyFor.history].reverse().map((h, i) => (
                <div key={i} className="border-l-2 border-primary-200 pl-3">
                  <p className="text-sm font-medium text-ink">{ACTION_LABEL[h.action] ?? h.action}</p>
                  <p className="text-xs text-muted">{new Date(h.at).toLocaleString()} · {h.by}</p>
                  {h.note && <p className="mt-0.5 text-xs text-ink-soft">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AllocationForm({
  learners,
  groups,
  courses,
  onSubmit,
}: {
  learners: { id: string; fullName: string }[];
  groups: { id: string; name: string }[];
  courses: { id: string; title: string; availableFormats: LearningFormat[] }[];
  onSubmit: (v: {
    targetType: "learner" | "group";
    targetIds: string[];
    courseId: string;
    deadline: string;
    appearInMatrix: boolean;
    formatChoice: "learner_choice" | "fixed";
    fixedFormat: LearningFormat | null;
  }) => void;
}) {
  const [targetType, setTargetType] = useState<"learner" | "group">("learner");
  const [learnerIds, setLearnerIds] = useState<Set<string>>(new Set());
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [appearInMatrix, setAppearInMatrix] = useState(true);
  const [formatChoice, setFormatChoice] = useState<"learner_choice" | "fixed">("learner_choice");
  const [fixedFormat, setFixedFormat] = useState<LearningFormat>("reading");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const targetIds = targetType === "learner" ? Array.from(learnerIds) : groupId ? [groupId] : [];
  const valid = targetIds.length > 0 && courseId;

  function toggleLearner(id: string) {
    setLearnerIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Allocate to</Label>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => { setTargetType("learner"); setGroupId(""); }}
            className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${targetType === "learner" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
          >
            Learner(s)
          </button>
          <button
            onClick={() => { setTargetType("group"); setLearnerIds(new Set()); }}
            className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${targetType === "group" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
          >
            Group
          </button>
        </div>
        {targetType === "learner" ? (
          <>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-[8px] border border-line p-2">
              {learners.slice(0, 60).map((l) => (
                <label key={l.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={learnerIds.has(l.id)} onChange={() => toggleLearner(l.id)} /> {l.fullName}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{learnerIds.size} selected</p>
          </>
        ) : (
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Select a group…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        )}
      </div>

      <div>
        <Label>Course</Label>
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select a course…</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </div>

      <div>
        <Label>Deadline</Label>
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      <div>
        <Label>Format</Label>
        <div className="flex gap-2">
          <button
            onClick={() => setFormatChoice("learner_choice")}
            className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${formatChoice === "learner_choice" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
          >
            Learner chooses
          </button>
          <button
            onClick={() => setFormatChoice("fixed")}
            className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${formatChoice === "fixed" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
          >
            Fixed format
          </button>
        </div>
        {formatChoice === "fixed" && (
          <Select className="mt-2" value={fixedFormat} onChange={(e) => setFixedFormat(e.target.value as LearningFormat)}>
            {(selectedCourse?.availableFormats.length ? selectedCourse.availableFormats : (Object.keys(FORMAT_LABELS) as LearningFormat[])).map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
            ))}
          </Select>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={appearInMatrix} onChange={(e) => setAppearInMatrix(e.target.checked)} /> Appear in Training Matrix
      </label>

      <Button
        className="w-full"
        disabled={!valid}
        onClick={() => onSubmit({ targetType, targetIds, courseId, deadline, appearInMatrix, formatChoice, fixedFormat: formatChoice === "fixed" ? fixedFormat : null })}
      >
        Create allocation{targetType === "learner" && learnerIds.size > 1 ? `s (${learnerIds.size})` : ""}
      </Button>
    </div>
  );
}

function ReallocateForm({ allocation, onSubmit }: { allocation: Allocation; onSubmit: (deadline: string, appearInMatrix: boolean) => void }) {
  const [deadline, setDeadline] = useState(allocation.deadline ?? "");
  const [appearInMatrix, setAppearInMatrix] = useState(allocation.appearInMatrix);
  return (
    <div className="space-y-4">
      <div>
        <Label>New deadline</Label>
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={appearInMatrix} onChange={(e) => setAppearInMatrix(e.target.checked)} /> Appear in Training Matrix
      </label>
      <Button className="w-full" onClick={() => onSubmit(deadline, appearInMatrix)}>Save reallocation</Button>
    </div>
  );
}
