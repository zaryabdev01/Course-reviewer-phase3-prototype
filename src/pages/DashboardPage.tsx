import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useActivePersona } from "@/lib/store/personaStore";
import { listAllocations, listSeatPools } from "@/lib/api/allocations";
import { listMatrixCells, listTrainingGaps } from "@/lib/api/matrix";
import { listLeases, listUsageAlerts } from "@/lib/api/distribution";
import { listRevenueLines } from "@/lib/api/engagement";
import { listMembers } from "@/lib/api/organisations";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { ArrowUpRight, Users, Grid3x3, Share2, TrendingUp } from "lucide-react";

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Users }) {
  return (
    <Card>
      <CardBody className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-50 text-primary-700">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardBody>
    </Card>
  );
}

function OrgAdminDashboard({ organisationId }: { organisationId: string }) {
  const { data: members } = useQuery({ queryKey: ["members", organisationId], queryFn: () => listMembers(organisationId) });
  const { data: cells } = useQuery({ queryKey: ["matrix-cells", organisationId], queryFn: () => listMatrixCells(organisationId) });
  const { data: gaps } = useQuery({ queryKey: ["training-gaps"], queryFn: listTrainingGaps });
  const { data: leases } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: alerts } = useQuery({ queryKey: ["usage-alerts"], queryFn: listUsageAlerts });
  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: listRevenueLines });

  const overdue = cells?.filter((c) => c.status === "overdue").length ?? 0;
  const completed = cells?.filter((c) => c.status === "completed").length ?? 0;
  const activeLeases = leases?.filter((l) => l.status === "active").length ?? 0;
  const learnerCount = members?.filter((m) => m.role === "team_member" && m.status === "active").length ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active learners" value={String(learnerCount)} hint="Acme Logistics Ltd" icon={Users} />
        <StatCard label="Matrix completions" value={String(completed)} hint={`${overdue} overdue`} icon={Grid3x3} />
        <StatCard label="Active leases" value={String(activeLeases)} hint={`${alerts?.length ?? 0} near limit`} icon={Share2} />
        <StatCard label="Net earnings (Sep)" value={`£${revenue?.at(-1)?.netEarnings.toLocaleString() ?? "—"}`} hint="+9.8% vs Aug" icon={TrendingUp} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <Link to="/billing" className="flex items-center gap-1 text-xs font-medium text-primary-700">
              View billing <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7384" }} axisLine={false} tickLine={false} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: any) => `£${Number(v).toLocaleString()}`) as any}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e4e7ef", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="netEarnings" stroke="#16a34a" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top training gaps</CardTitle>
            <Link to="/workforce" className="flex items-center gap-1 text-xs font-medium text-primary-700">
              Planner <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {gaps?.slice(0, 5).map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{g.requirementTitle}</span>
                  <span className="text-muted">{g.completed}/{g.required}</span>
                </div>
                <ProgressBar percent={(g.completed / g.required) * 100} tone={g.completed / g.required < 0.5 ? "warning" : "success"} />
                <p className="mt-1 text-[11px] text-muted">{g.departmentName}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Licence usage alerts</CardTitle>
            <Link to="/distribution-hub" className="flex items-center gap-1 text-xs font-medium text-primary-700">
              Distribution Hub <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {alerts && alerts.length > 0 ? (
              alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{a.customerName}</p>
                    <p className="text-xs text-muted">{a.currentPercent}% of licences in use</p>
                  </div>
                  <Badge tone="warning">Near limit</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No leases near their licence limit.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue compliance</CardTitle>
            <Link to="/matrix" className="flex items-center gap-1 text-xs font-medium text-primary-700">
              Open Matrix <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-semibold text-danger">{overdue}</p>
            <p className="text-sm text-muted">learner × requirement records are overdue across the organisation.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function TeamMemberDashboard() {
  const { data: allocations } = useQuery({ queryKey: ["allocations", "org_acme"], queryFn: () => listAllocations("org_acme") });
  const mine = allocations?.slice(0, 6) ?? [];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>My allocated training</CardTitle>
          <Link to="/development" className="flex items-center gap-1 text-xs font-medium text-primary-700">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody className="space-y-3">
          {mine.map((a) => (
            <Link to={`/development`} key={a.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-ink">{a.masterCourseTitle}</p>
                <p className="text-xs text-muted">Due {a.deadline ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar percent={a.progressPercent} className="w-28" />
                <span className="text-xs text-muted">{a.progressPercent}%</span>
              </div>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function ProfessionalDashboard() {
  const { data: allocations } = useQuery({ queryKey: ["allocations", "org_acme"], queryFn: () => listAllocations("org_acme") });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatCard label="Credit balance" value="1,240" hint="Personal wallet" icon={TrendingUp} />
      <StatCard label="In Development" value="9" hint="courses in progress" icon={Grid3x3} />
      <StatCard label="Synced organisations" value="2" hint="1 pending" icon={Users} />
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Recently allocated (via synced organisation)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {allocations?.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
              <p className="text-sm font-medium text-ink">{a.masterCourseTitle}</p>
              <ProgressBar percent={a.progressPercent} className="w-28" />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function PlatformDashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Organisations" value="2" hint="Acme, Bright Path" icon={Users} />
      <StatCard label="Active leases (platform-wide)" value="8" icon={Share2} />
      <StatCard label="AI generation cost (Sep)" value="£3,760" icon={TrendingUp} />
      <StatCard label="Open disputes" value="0" icon={Grid3x3} />
    </div>
  );
}

export function DashboardPage() {
  const persona = useActivePersona();

  return (
    <>
      <PageHeader
        title={`Welcome back, ${persona.label.split(" — ")[0].split(" ")[0]}`}
        description={
          persona.accountType === "organisational"
            ? "Acme Logistics Ltd — dummy data, Phase 3 prototype"
            : "Dummy data — Phase 3 prototype"
        }
      />
      {persona.accountType === "organisational" && persona.organisationRole !== "team_member" && persona.organisationId && (
        <OrgAdminDashboard organisationId={persona.organisationId} />
      )}
      {persona.accountType === "organisational" && persona.organisationRole === "team_member" && <TeamMemberDashboard />}
      {persona.accountType === "professional" && <ProfessionalDashboard />}
      {(persona.accountType === "platform_admin" || persona.accountType === "platform_super_admin") && <PlatformDashboard />}
    </>
  );
}
