import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listOrgUnits, listJobRoles, listCustomGroups, previewCsvImport } from "@/lib/api/organisations";
import { useMutation } from "@tanstack/react-query";
import { Building2, Users, Upload, FileCheck2, FileWarning, FileX2 } from "lucide-react";

function unitTree(units: { id: string; type: string; name: string; parentId: string | null; headCount: number }[]) {
  const byParent = new Map<string | null, typeof units>();
  for (const u of units) {
    const arr = byParent.get(u.parentId) ?? [];
    arr.push(u);
    byParent.set(u.parentId, arr);
  }
  return byParent;
}

export function OrgStructurePage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const [tab, setTab] = useState<"structure" | "roles" | "groups" | "import">("structure");

  const { data: units, isLoading: unitsLoading } = useQuery({ queryKey: ["org-units", orgId], queryFn: () => listOrgUnits(orgId) });
  const { data: jobRoles } = useQuery({ queryKey: ["job-roles", orgId], queryFn: () => listJobRoles(orgId) });
  const { data: groups } = useQuery({ queryKey: ["custom-groups", orgId], queryFn: () => listCustomGroups(orgId) });
  const csvPreview = useMutation({ mutationFn: previewCsvImport });

  const tree = units ? unitTree(units) : new Map();

  function renderUnit(unit: { id: string; type: string; name: string; headCount: number }, depth: number) {
    const children = tree.get(unit.id) ?? [];
    return (
      <div key={unit.id}>
        <div className="flex items-center justify-between border-b border-line py-2.5" style={{ paddingLeft: depth * 20 }}>
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted" />
            <span className="text-sm text-ink">{unit.name}</span>
            <Badge tone="neutral" className="capitalize">{unit.type}</Badge>
          </div>
          <span className="text-xs text-muted">{unit.headCount} people</span>
        </div>
        {children.map((c: any) => renderUnit(c, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Organisation Structure & Teams"
        description="Locations, departments, teams, job roles and custom groups — the targeting units Allocation and the Training Matrix build on."
        actions={<Button size="sm"><Upload className="h-4 w-4" /> Import staff (CSV)</Button>}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "structure", label: "Structure", count: units?.length },
          { value: "roles", label: "Job Roles", count: jobRoles?.length },
          { value: "groups", label: "Custom Groups", count: groups?.length },
          { value: "import", label: "CSV Import" },
        ]}
      />

      <div className="mt-4">
        {tab === "structure" && (
          <Card>
            <CardHeader>
              <CardTitle>Locations → Departments → Teams</CardTitle>
            </CardHeader>
            <CardBody>
              {unitsLoading ? <SkeletonRows /> : (tree.get(null) ?? []).map((u: any) => renderUnit(u, 0))}
            </CardBody>
          </Card>
        )}

        {tab === "roles" && (
          <Card>
            <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobRoles?.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                  <span className="text-sm text-ink">{r.title}</span>
                  <Badge tone="neutral">{r.headCount}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {tab === "groups" && (
          <Card>
            <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups?.map((g) => (
                <div key={g.id} className="rounded-[10px] border border-line px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted" />
                    <span className="text-sm font-medium text-ink">{g.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Custom group · used for allocation and Matrix targeting</p>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {tab === "import" && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk staff import</CardTitle>
              <Button size="sm" variant="secondary" onClick={() => csvPreview.mutate()} disabled={csvPreview.isPending}>
                {csvPreview.isPending ? "Parsing…" : "Upload staff.csv"}
              </Button>
            </CardHeader>
            <CardBody>
              {!csvPreview.data && !csvPreview.isPending && (
                <p className="text-sm text-muted">Upload a CSV to preview rows before they're imported — duplicate-safe, matched on email.</p>
              )}
              {csvPreview.isPending && <SkeletonRows rows={4} />}
              {csvPreview.data && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted">
                        <th className="py-2 pr-3">Row</th>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Job Role</th>
                        <th className="py-2 pr-3">Department</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.data.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-line last:border-0">
                          <td className="py-2 pr-3 text-muted">{row.rowNumber}</td>
                          <td className="py-2 pr-3 text-ink">{row.fullName}</td>
                          <td className="py-2 pr-3 text-ink-soft">{row.email}</td>
                          <td className="py-2 pr-3 text-ink-soft">{row.jobRoleTitle}</td>
                          <td className="py-2 pr-3 text-ink-soft">{row.orgUnitName}</td>
                          <td className="py-2 pr-3">
                            {row.status === "valid" && <Badge tone="success"><FileCheck2 className="mr-1 inline h-3 w-3" />Valid</Badge>}
                            {row.status === "warning" && <Badge tone="warning" title={row.message}><FileWarning className="mr-1 inline h-3 w-3" />Warning</Badge>}
                            {row.status === "error" && <Badge tone="danger" title={row.message}><FileX2 className="mr-1 inline h-3 w-3" />Error</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => csvPreview.reset()}>Cancel</Button>
                    <Button size="sm">Import {csvPreview.data.filter((r) => r.status !== "error").length} valid rows</Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
