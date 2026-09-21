import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { listDevelopmentItems, listAllocations, listSeatPools } from "@/lib/api/allocations";
import { useActivePersona } from "@/lib/store/personaStore";
import { FolderPlus, Sparkles } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  synced_organisation: "Synced organisation",
  bought: "Bought",
  added: "Added",
};

export function DevelopmentPage() {
  const persona = useActivePersona();
  const isOrgAdmin = persona.accountType === "organisational" && persona.organisationRole !== "team_member";
  const [sourceFilter, setSourceFilter] = useState<"all" | "synced_organisation" | "bought" | "added">("all");

  const { data: items, isLoading } = useQuery({ queryKey: ["development-items"], queryFn: listDevelopmentItems });
  const { data: seatPools } = useQuery({
    queryKey: ["seat-pools", persona.organisationId],
    queryFn: () => listSeatPools(persona.organisationId!),
    enabled: isOrgAdmin,
  });
  const { data: allocations } = useQuery({
    queryKey: ["allocations", persona.organisationId],
    queryFn: () => listAllocations(persona.organisationId!),
    enabled: !!persona.organisationId,
  });

  const filtered = items?.filter((i) => sourceFilter === "all" || i.source === sourceFilter) ?? [];
  const myAllocations = allocations?.filter((a) => a.status !== "completed").slice(0, 12) ?? [];

  return (
    <>
      <PageHeader
        title="Development"
        description="Courses added, bought, or received through a synced organisation — personal to you regardless of account type."
        actions={
          <Link to="/learning-exchange">
            <Button variant="secondary" size="sm">
              <FolderPlus className="h-4 w-4" /> Add from Learning Exchange
            </Button>
          </Link>
        }
      />

      {persona.organisationRole === "team_member" && myAllocations.length > 0 && (
        <Card className="mb-5">
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-ink">Allocated to you by Acme Logistics Ltd</p>
            <div className="space-y-2">
              {myAllocations.map((a) => (
                <Link
                  key={a.id}
                  to={`/course/${a.masterCourseId}/format`}
                  className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{a.masterCourseTitle}</p>
                    <p className="text-xs text-muted">Due {a.deadline ?? "—"} {a.appearInMatrix && "· Counts toward Training Matrix"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar percent={a.progressPercent} className="w-28" />
                    <Badge tone={a.status === "overdue" ? "danger" : "neutral"}>{a.status.replace("_", " ")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {isOrgAdmin && seatPools && seatPools.length > 0 && (
        <Card className="mb-5">
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-ink">Seat pools</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seatPools.map((s) => (
                <div key={s.id} className="rounded-[10px] border border-line p-3">
                  <p className="text-sm font-medium text-ink">{s.masterCourseTitle}</p>
                  <p className="mb-2 text-[11px] text-muted">{SOURCE_LABEL[s.source]}</p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{s.allocated}/{s.purchased} allocated</span>
                    <span>{s.consumed} consumed</span>
                  </div>
                  <ProgressBar percent={(s.allocated / s.purchased) * 100} className="mt-1.5" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <Tabs
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            { value: "all", label: "All" },
            { value: "synced_organisation", label: "From synced org" },
            { value: "bought", label: "Bought" },
            { value: "added", label: "Added" },
          ]}
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Add a course from the Learning Exchange to start building your Development library." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardBody>
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone="brand">{SOURCE_LABEL[item.source]}</Badge>
                  {item.progressPercent === 100 && <Badge tone="success">Completed</Badge>}
                </div>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mb-3 text-xs text-muted">{item.sourceLabel}</p>
                <ProgressBar percent={item.progressPercent} />
                <Link to={`/course/${item.masterCourseId}/readiness`} className="mt-3 block">
                  <Button size="sm" variant="secondary" className="w-full">
                    <Sparkles className="h-3.5 w-3.5" /> Learning Experience Setup
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
