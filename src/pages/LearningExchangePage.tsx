import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { listMasterCourses } from "@/lib/api/courses";
import { useActivePersona } from "@/lib/store/personaStore";
import { Plus } from "lucide-react";

export function LearningExchangePage() {
  const persona = useActivePersona();
  const isOrg = persona.accountType === "organisational";
  const [target, setTarget] = useState<"personal" | "team">("personal");
  const { data: courses } = useQuery({ queryKey: ["master-courses"], queryFn: listMasterCourses });

  return (
    <>
      <PageHeader
        title="Learning Exchange"
        description="Browse published master courses. Phase 3 adds Personal Development, Team Development and controlled course allocation."
      />

      {isOrg && (
        <div className="mb-4">
          <Tabs
            value={target}
            onChange={setTarget}
            options={[
              { value: "personal", label: "Personal Development" },
              { value: "team", label: "Team Development (seat purchase)" },
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="mb-2 h-2 w-10 rounded-full" style={{ backgroundColor: c.thumbnailColor }} />
              <p className="text-sm font-semibold text-ink">{c.title}</p>
              <p className="mt-1 text-xs text-muted line-clamp-2">{c.description}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge tone="neutral">{c.sector}</Badge>
                {c.isFree ? <Badge tone="success">Free</Badge> : <Badge tone="brand">{c.priceCredits} credits</Badge>}
              </div>
              <Button size="sm" className="mt-3 w-full">
                <Plus className="h-3.5 w-3.5" /> {target === "team" ? "Buy seats for team" : "Add to Development"}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
