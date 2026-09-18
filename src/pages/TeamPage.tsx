import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listMembers, listOrgSyncRequests } from "@/lib/api/organisations";
import { avatarColorFor } from "@/mocks/generators/organisations";
import { UserPlus, Search } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  org_administrator: "Org Administrator",
  org_manager: "Org Manager",
  team_member: "Team Member",
};

export function TeamPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const [query, setQuery] = useState("");

  const { data: members, isLoading } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });
  const { data: syncRequests } = useQuery({ queryKey: ["org-sync-requests"], queryFn: listOrgSyncRequests });

  const isManager = persona.organisationRole === "org_manager";
  const visibleMembers = (members ?? []).filter((m) => {
    if (isManager && m.lineManagerId !== persona.id && m.role !== "team_member") return false;
    return m.fullName.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <PageHeader
        title="Team"
        description={isManager ? "Scoped to learners reporting into you — manager data scoping (M2)." : "Everyone in Acme Logistics Ltd."}
        actions={
          <Button size="sm">
            <UserPlus className="h-4 w-4" /> Invite team member
          </Button>
        }
      />

      {persona.organisationRole === "org_administrator" && syncRequests && syncRequests.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Professional-to-organisation sync requests</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {syncRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{r.professionalEmail}</p>
                  <p className="text-xs text-muted">Requested {new Date(r.requestedAt).toLocaleDateString()}</p>
                </div>
                <Badge tone={r.status === "accepted" ? "success" : r.status === "pending" ? "warning" : "neutral"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2 sm:w-80">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full text-sm outline-none"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <SkeletonRows className="p-5" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Invited</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.slice(0, 40).map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.fullName} color={avatarColorFor(m.id)} size={28} />
                        <div>
                          <p className="font-medium text-ink">{m.fullName}</p>
                          <p className="text-xs text-muted">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{ROLE_LABEL[m.role]}</td>
                    <td className="px-5 py-2.5">
                      <Badge tone={m.status === "active" ? "success" : m.status === "invited" ? "warning" : "neutral"}>{m.status}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{new Date(m.invitedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      {visibleMembers.length > 40 && (
        <p className="mt-2 text-xs text-muted">Showing 40 of {visibleMembers.length} — pagination in the real build.</p>
      )}
    </>
  );
}
