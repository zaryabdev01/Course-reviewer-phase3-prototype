import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listPlannedTraining, listTrainingGaps } from "@/lib/api/matrix";
import { CalendarPlus, MapPin, Building2 } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  platform_course: "Platform course",
  virtual: "Virtual",
  at_venue: "At-venue",
  external: "External",
};

export function WorkforcePlannerPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const [tab, setTab] = useState<"planned" | "future" | "gaps">("planned");

  const { data: planned, isLoading } = useQuery({ queryKey: ["planned-training", orgId], queryFn: () => listPlannedTraining(orgId) });
  const { data: gaps } = useQuery({ queryKey: ["training-gaps"], queryFn: listTrainingGaps, enabled: tab === "gaps" });

  const byMonth = new Map<string, typeof planned>();
  for (const p of planned ?? []) {
    const month = new Date(p.scheduledDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    byMonth.set(month, [...(byMonth.get(month) ?? []), p]);
  }

  return (
    <>
      <PageHeader
        title="Workforce Planner"
        description="Planned training tracks places before it has named learners — converts to allocations once attendees are confirmed."
        actions={
          <Button size="sm">
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
          isLoading ? <SkeletonRows rows={6} /> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planned?.map((p) => (
                <Card key={p.id}>
                  <CardBody>
                    <div className="mb-2 flex items-center justify-between">
                      <Badge tone="brand">{SOURCE_LABEL[p.source]}</Badge>
                      <span className="text-xs text-muted">{new Date(p.scheduledDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-ink">{p.title}</p>
                    {p.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> {p.location}</p>
                    )}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted">{p.placesAssigned} assigned</span>
                        <span className="text-muted">{p.placesRequired - p.placesAssigned} remaining</span>
                      </div>
                      <ProgressBar percent={(p.placesAssigned / p.placesRequired) * 100} />
                      <p className="mt-1 text-[11px] text-muted">
                        {p.placesRequired} required − {p.placesAssigned} assigned − {p.placesRequired - p.placesAssigned} remaining
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" className="mt-3 w-full">Assign learners</Button>
                  </CardBody>
                </Card>
              ))}
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
                      {items?.map((p) => (
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
                    <tr key={g.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2.5 font-medium text-ink">{g.requirementTitle}</td>
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
    </>
  );
}
