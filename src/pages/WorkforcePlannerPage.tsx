import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Field";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listPlannedTraining, listTrainingGaps, listRequirements, listMatrixCells } from "@/lib/api/matrix";
import { listMembers } from "@/lib/api/organisations";
import { useToastStore } from "@/lib/store/toastStore";
import { TARGET_OPTIONS_BASE } from "@/lib/constants/targets";
import type { PlannedTraining, TrainingGap, TrainingSource, PlannedTrainingPriority } from "@/contracts";
import { CalendarPlus, MapPin, Building2, X, Users, CheckCircle2 } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  platform_course: "Platform course",
  virtual: "Virtual",
  at_venue: "At-venue",
};

const PRIORITY_TONE: Record<PlannedTrainingPriority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function WorkforcePlannerPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const push = useToastStore((s) => s.push);
  const [tab, setTab] = useState<"planned" | "future" | "gaps">("planned");

  const { data: plannedData, isLoading } = useQuery({ queryKey: ["planned-training", orgId], queryFn: () => listPlannedTraining(orgId) });
  const { data: gaps } = useQuery({ queryKey: ["training-gaps"], queryFn: listTrainingGaps, enabled: tab === "gaps" });
  const { data: requirements } = useQuery({ queryKey: ["requirements", orgId], queryFn: () => listRequirements(orgId) });
  const { data: members } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });
  const { data: cells } = useQuery({ queryKey: ["matrix-cells", orgId], queryFn: () => listMatrixCells(orgId), enabled: tab === "gaps" });

  const [planned, setPlanned] = useState<PlannedTraining[] | null>(null);
  useEffect(() => {
    if (plannedData && planned === null) setPlanned(plannedData);
  }, [plannedData, planned]);

  const [assignFor, setAssignFor] = useState<PlannedTraining | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [gapDrillDown, setGapDrillDown] = useState<TrainingGap | null>(null);

  const byMonth = new Map<string, PlannedTraining[]>();
  for (const p of planned ?? []) {
    const month = new Date(p.scheduledDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    byMonth.set(month, [...(byMonth.get(month) ?? []), p]);
  }

  const missingLearners = gapDrillDown
    ? (cells ?? []).filter((c) => c.requirementTitle === gapDrillDown.requirementTitle && c.departmentName === gapDrillDown.departmentName && c.status !== "completed")
    : [];

  return (
    <>
      <PageHeader
        title="Workforce Planner"
        description="Planned training tracks places before it has named learners — converts to allocations once attendees are confirmed."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Plan training
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "planned", label: "Planned Training", count: planned?.length },
          { value: "future", label: "Future Training Planner" },
          { value: "gaps", label: "Training Gaps", count: gaps?.length },
        ]}
      />

      <div className="mt-4">
        {tab === "planned" && (
          isLoading || planned === null ? <SkeletonRows rows={6} /> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planned.map((p) => {
                const full = p.placesAssigned >= p.placesRequired;
                return (
                  <Card key={p.id}>
                    <CardBody>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="brand">{SOURCE_LABEL[p.source]}</Badge>
                          <Badge tone={PRIORITY_TONE[p.priority]}>{p.priority}</Badge>
                        </div>
                        <span className="text-xs text-muted">{new Date(p.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink">{p.title}</p>
                      {p.reason && <p className="mt-0.5 text-xs text-muted">{p.reason}</p>}
                      {p.targetLabel && <p className="mt-0.5 text-xs text-ink-soft">For: {p.targetLabel}</p>}
                      {p.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {p.location}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs text-muted">
                        {p.ownerName && <span>Owner: {p.ownerName}</span>}
                        {p.budget != null && <span>Budget: £{p.budget.toLocaleString()}</span>}
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted">{p.placesAssigned} assigned</span>
                          <span className="text-muted">{p.placesRequired - p.placesAssigned} remaining</span>
                        </div>
                        <ProgressBar percent={(p.placesAssigned / p.placesRequired) * 100} tone={full ? "success" : "brand"} />
                        <p className="mt-1 text-[11px] text-muted">
                          {p.placesRequired} required − {p.placesAssigned} assigned − {p.placesRequired - p.placesAssigned} remaining
                        </p>
                      </div>
                      {full ? (
                        <Button
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => push(`"${p.title}" converted to ${p.placesAssigned} individual allocations`)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Convert to allocation
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setAssignFor(p)}>
                          <Users className="h-3.5 w-3.5" /> Assign learners
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {tab === "future" && (
          <Card>
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from(byMonth.entries()).map(([month, items]) => (
                  <div key={month} className="rounded-[10px] border border-line p-3">
                    <p className="mb-2 text-sm font-semibold text-ink">{month}</p>
                    <div className="space-y-1.5">
                      {items.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-ink-soft">{p.title}</span>
                          <span className="text-muted">{p.placesAssigned}/{p.placesRequired}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {tab === "gaps" && (
          <Card>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-5 py-3">Requirement</th>
                    <th className="px-5 py-3"><Building2 className="mr-1 inline h-3 w-3" />Department</th>
                    <th className="px-5 py-3">Required</th>
                    <th className="px-5 py-3">Allocated</th>
                    <th className="px-5 py-3">Completed</th>
                    <th className="px-5 py-3 w-40">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps?.map((g) => (
                    <tr key={g.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-gray-50" onClick={() => setGapDrillDown(g)}>
                      <td className="px-5 py-2.5 font-medium text-primary-700 hover:underline">{g.requirementTitle}</td>
                      <td className="px-5 py-2.5 text-ink-soft">{g.departmentName}</td>
                      <td className="px-5 py-2.5 text-muted">{g.required}</td>
                      <td className="px-5 py-2.5 text-muted">{g.allocated}</td>
                      <td className="px-5 py-2.5 text-muted">{g.completed}</td>
                      <td className="px-5 py-2.5">
                        <ProgressBar percent={(g.completed / g.required) * 100} tone={g.completed / g.required < 0.5 ? "warning" : "success"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Assign learners */}
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="Assign learners" description={assignFor ? `${assignFor.title} — ${assignFor.placesRequired - assignFor.placesAssigned} places remaining` : ""}>
        {assignFor && (
          <AssignLearnersForm
            remaining={assignFor.placesRequired - assignFor.placesAssigned}
            members={(members ?? []).filter((m) => m.role === "team_member")}
            onSubmit={(count) => {
              setPlanned((prev) => (prev ?? []).map((p) => (p.id === assignFor.id ? { ...p, placesAssigned: Math.min(p.placesRequired, p.placesAssigned + count) } : p)));
              push(`${count} learner${count !== 1 ? "s" : ""} assigned to "${assignFor.title}"`);
              setAssignFor(null);
            }}
          />
        )}
      </Modal>

      {/* Plan training */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Plan training" description="Places-tracked training without named learners yet.">
        <PlanTrainingForm
          requirements={requirements ?? []}
          onSubmit={(values) => {
            const req = requirements?.find((r) => r.id === values.requirementId);
            const newItem: PlannedTraining = {
              id: `planned_new_${Date.now()}`,
              organisationId: orgId,
              title: req?.title ?? values.title,
              requirementId: values.requirementId || null,
              source: values.source,
              scheduledDate: values.scheduledDate,
              placesRequired: values.placesRequired,
              placesAssigned: 0,
              location: values.location || null,
              provider: values.provider || null,
              reason: values.reason || null,
              targetLabel: values.targetLabel || null,
              budget: values.budget ? Number(values.budget) : null,
              priority: values.priority,
              ownerName: values.ownerName || null,
              notes: values.notes || null,
            };
            setPlanned((prev) => [newItem, ...(prev ?? [])]);
            setCreateOpen(false);
            push(`Planned "${newItem.title}" — ${newItem.placesRequired} places`);
          }}
        />
      </Modal>

      {/* Training gap drill-down */}
      {gapDrillDown && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={() => setGapDrillDown(null)}>
          <div className="h-full w-96 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Who's missing this</h3>
              <button onClick={() => setGapDrillDown(null)} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-1 text-sm font-medium text-ink">{gapDrillDown.requirementTitle}</p>
            <p className="mb-4 text-xs text-muted">{gapDrillDown.departmentName}</p>
            <div className="space-y-2">
              {missingLearners.length === 0 && <p className="text-sm text-muted">No matching Matrix records for this exact requirement/department pairing in the sampled data.</p>}
              {missingLearners.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2">
                  <div>
                    <p className="text-sm text-ink">{c.learnerName}</p>
                    <p className="text-xs text-muted">{c.jobRoleTitle}</p>
                  </div>
                  <Badge tone="warning">{c.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AssignLearnersForm({
  remaining,
  members,
  onSubmit,
}: {
  remaining: number;
  members: { id: string; fullName: string }[];
  onSubmit: (count: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < remaining) next.add(id);
      return next;
    });
  }
  return (
    <div className="space-y-3">
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {members.slice(0, 30).map((m) => (
          <label key={m.id} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm hover:bg-gray-50">
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} disabled={!selected.has(m.id) && selected.size >= remaining} />
            {m.fullName}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">{selected.size} of {remaining} places selected</p>
      <Button className="w-full" disabled={selected.size === 0} onClick={() => onSubmit(selected.size)}>Assign {selected.size} learner{selected.size !== 1 ? "s" : ""}</Button>
    </div>
  );
}

function PlanTrainingForm({
  requirements,
  onSubmit,
}: {
  requirements: { id: string; title: string }[];
  onSubmit: (v: {
    requirementId: string;
    title: string;
    source: TrainingSource;
    scheduledDate: string;
    placesRequired: number;
    location: string;
    provider: string;
    reason: string;
    targetLabel: string;
    budget: string;
    priority: PlannedTrainingPriority;
    ownerName: string;
    notes: string;
  }) => void;
}) {
  const [requirementId, setRequirementId] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<TrainingSource>("virtual");
  const [scheduledDate, setScheduledDate] = useState("");
  const [placesRequired, setPlacesRequired] = useState(10);
  const [location, setLocation] = useState("");
  const [provider, setProvider] = useState("");
  const [reason, setReason] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState<PlannedTrainingPriority>("medium");
  const [ownerName, setOwnerName] = useState("");
  const [notes, setNotes] = useState("");

  const valid = (requirementId || title.trim()) && scheduledDate && placesRequired > 0;

  return (
    <div className="space-y-4">
      <div>
        <Label>Requirement</Label>
        <Select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
          <option value="">Link to a requirement…</option>
          {requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </Select>
      </div>
      {!requirementId && (
        <div>
          <Label>Or a title (requirement without a course/provider yet)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Manual Handling refresher" />
        </div>
      )}
      <div>
        <Label>Source</Label>
        <Select value={source} onChange={(e) => setSource(e.target.value as TrainingSource)}>
          <option value="virtual">Virtual</option>
          <option value="at_venue">At-venue</option>
          <option value="platform_course">Platform course</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </div>
        <div>
          <Label>Places required</Label>
          <Input type="number" min={1} value={placesRequired} onChange={(e) => setPlacesRequired(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label>Reason required (why the company knows it'll need this)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New regulatory requirement" />
      </div>
      <div>
        <Label>Department / Team / Role</Label>
        <Select value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)}>
          <option value="">Not yet targeted…</option>
          {TARGET_OPTIONS_BASE.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Budget (optional)</Label>
          <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="£" />
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as PlannedTrainingPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Owner (optional)</Label>
        <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Priya Nair" />
      </div>
      <div>
        <Label>Location (optional)</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London HQ — Training Room 2" />
      </div>
      <div>
        <Label>Provider (optional)</Label>
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. St John Ambulance" />
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else relevant" />
      </div>
      <Button
        className="w-full"
        disabled={!valid}
        onClick={() => onSubmit({ requirementId, title, source, scheduledDate, placesRequired, location, provider, reason, targetLabel, budget, priority, ownerName, notes })}
      >
        Add to Planned Training
      </Button>
    </div>
  );
}
