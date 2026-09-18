import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listOrganisations } from "@/lib/api/organisations";

export function PlatformOrganisationsPage() {
  const { data: organisations } = useQuery({ queryKey: ["organisations"], queryFn: listOrganisations });

  return (
    <>
      <PageHeader title="Organisations" description="Every organisational account on the platform." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organisations?.map((o) => (
          <Card key={o.id}>
            <CardBody>
              <div className="mb-3 h-8 w-8 rounded-[8px]" style={{ backgroundColor: o.logoColor }} />
              <p className="text-sm font-semibold text-ink">{o.name}</p>
              <p className="text-xs text-muted">{o.industry}</p>
              <div className="mt-3 flex gap-2">
                <Badge tone="neutral">{o.learnerCount} learners</Badge>
                <Badge tone="neutral">{o.seatCount} seats</Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted">Since {new Date(o.createdAt).toLocaleDateString()}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
