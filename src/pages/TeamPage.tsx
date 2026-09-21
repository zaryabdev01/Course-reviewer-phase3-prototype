import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useActivePersona } from "@/lib/store/personaStore";
import { listMembers, listOrgSyncRequests } from "@/lib/api/organisations";
import { avatarColorFor } from "@/mocks/generators/organisations";
import { useToastStore } from "@/lib/store/toastStore";
import type { OrgMember, OrgSyncRequest } from "@/contracts";
import { UserPlus, Users, Search, LogOut, UserMinus } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  org_administrator: "Org Administrator",
  org_manager: "Org Manager",
  team_member: "Team Member",
};

export function TeamPage() {
  const persona = useActivePersona();
  const orgId = persona.organisationId!;
  const push = useToastStore((s) => s.push);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  const { data: membersData, isLoading } = useQuery({ queryKey: ["members", orgId], queryFn: () => listMembers(orgId) });
  const { data: syncRequestsData } = useQuery({ queryKey: ["org-sync-requests"], queryFn: listOrgSyncRequests });

  const [members, setMembers] = useState<OrgMember[] | null>(null);
  useEffect(() => {
    if (membersData && members === null) setMembers(membersData);
  }, [membersData, members]);

  const [syncRequests, setSyncRequests] = useState<OrgSyncRequest[] | null>(null);
  useEffect(() => {
    if (syncRequestsData && syncRequests === null) setSyncRequests(syncRequestsData);
  }, [syncRequestsData, syncRequests]);

  const isManager = persona.organisationRole === "org_manager";
  // The manager persona doesn't correspond to one specific seeded member
  // id, so it's pinned to the first generated org_manager record — real
  // scoping (only that manager's direct reports), not cosmetic. Same
  // anchor is reused on Matrix and Allocations for consistent scoping.
  const scopedManagerId = isManager ? members?.find((m) => m.role === "org_manager")?.id : undefined;
  const visibleMembers = (members ?? []).filter((m) => {
    if (isManager) {
      const isVisible = m.lineManagerId === scopedManagerId || m.id === scopedManagerId;
      if (!isVisible) return false;
    }
    return m.fullName.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase());
  });

  function markLeaver(m: OrgMember) {
    setMembers((prev) => (prev ?? []).map((x) => (x.id === m.id ? { ...x, status: "left" } : x)));
    push(`${m.fullName} marked as a leaver`);
  }

  return (
    <>
      <PageHeader
        title="Team"
        description={isManager ? "Scoped to learners reporting into you — manager data scoping (M2)." : "Everyone in Acme Logistics Ltd."}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setBulkInviteOpen(true)}>
              <Users className="h-4 w-4" /> Bulk invite
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite team member
            </Button>
          </div>
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
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === "accepted" ? "success" : r.status === "pending" ? "warning" : "neutral"}>
                    {r.status}
                  </Badge>
                  {r.status === "accepted" && (
                    <button
                      onClick={() => {
                        setSyncRequests((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, status: "unsynced" } : x)));
                        push(`Unsynced ${r.professionalEmail} from ${r.organisationName}`);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                    >
                      <LogOut className="h-3 w-3" /> Unsync
                    </button>
                  )}
                </div>
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
          {isLoading || members === null ? (
            <SkeletonRows className="p-5" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Invited</th>
                  <th className="px-5 py-3 text-right">Actions</th>
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
                    <td className="px-5 py-2.5 text-right">
                      {m.status !== "left" && m.role === "team_member" && (
                        <button title="Mark as leaver" onClick={() => markLeaver(m)} className="rounded-[6px] p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
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

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member">
        <SingleInviteForm onSubmit={(email) => { push(`Invitation sent to ${email}`); setInviteOpen(false); }} />
      </Modal>

      <Modal open={bulkInviteOpen} onClose={() => setBulkInviteOpen(false)} title="Bulk invite" description="One email per line.">
        <BulkInviteForm onSubmit={(count) => { push(`${count} invitations sent`); setBulkInviteOpen(false); }} />
      </Modal>
    </>
  );
}

function SingleInviteForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const valid = /\S+@\S+\.\S+/.test(email);
  return (
    <div className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button className="w-full" disabled={!valid} onClick={() => onSubmit(email)}>Send invitation</Button>
    </div>
  );
}

function BulkInviteForm({ onSubmit }: { onSubmit: (count: number) => void }) {
  const [text, setText] = useState("");
  const emails = text.split("\n").map((l) => l.trim()).filter((l) => /\S+@\S+\.\S+/.test(l));
  return (
    <div className="space-y-4">
      <div>
        <Label>Emails</Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"sam@acmelogistics.co.uk\npriya@acmelogistics.co.uk"}
          className="h-32 w-full rounded-[10px] border border-line bg-white p-3 font-mono text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>
      <p className="text-xs text-muted">{emails.length} valid email{emails.length !== 1 ? "s" : ""} detected</p>
      <Button className="w-full" disabled={emails.length === 0} onClick={() => onSubmit(emails.length)}>
        Send {emails.length} invitation{emails.length !== 1 ? "s" : ""}
      </Button>
    </div>
  );
}
