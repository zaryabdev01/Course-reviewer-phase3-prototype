import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PERSONAS } from "@/lib/store/personaStore";
import { listOrganisations } from "@/lib/api/organisations";

const ACCOUNT_TONE: Record<string, "brand" | "success" | "warning" | "danger"> = {
  professional: "brand",
  organisational: "success",
  platform_admin: "warning",
  platform_super_admin: "danger",
};

export function PlatformUsersPage() {
  const { data: organisations } = useQuery({ queryKey: ["organisations"], queryFn: listOrganisations });

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Account type replaces the Phase 2 role enum. Shown here: the prototype's persona catalog — every screen behind an account type is reachable via the switcher, top-right."
      />
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Account type</th>
                <th className="px-5 py-3">Organisation</th>
                <th className="px-5 py-3">Org role</th>
              </tr>
            </thead>
            <tbody>
              {PERSONAS.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 text-ink">{p.label.split(" — ")[0]}</td>
                  <td className="px-5 py-2.5"><Badge tone={ACCOUNT_TONE[p.accountType]} className="capitalize">{p.accountType.replace("_", " ")}</Badge></td>
                  <td className="px-5 py-2.5 text-ink-soft">
                    {p.organisationId ? organisations?.find((o) => o.id === p.organisationId)?.name : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-ink-soft capitalize">{p.organisationRole?.replace("_", " ") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
