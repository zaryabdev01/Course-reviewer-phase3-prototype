import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Input, Label } from "@/components/ui/Field";
import { listLeases, listUsageAlerts } from "@/lib/api/distribution";
import { listRevenueLines } from "@/lib/api/engagement";
import { useToastStore } from "@/lib/store/toastStore";
import { Key, Plus, Trash2, Download, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  last4: string;
  createdAt: string;
  rateLimit: string;
}

const SEED_KEYS: ApiKey[] = [
  { id: "k1", label: "Northfield Retail — API delivery", last4: "8f21", createdAt: "2026-06-02", rateLimit: "600 req/min" },
  { id: "k2", label: "Internal reporting service", last4: "2af9", createdAt: "2026-03-14", rateLimit: "1200 req/min" },
];

const FAKE_QUEUES = [
  { name: "AI format conversion", depth: 3, status: "processing" as const },
  { name: "Group/overall report exports", depth: 1, status: "processing" as const },
  { name: "Certificate rendering", depth: 0, status: "idle" as const },
  { name: "Lease usage rating (nightly)", depth: 0, status: "idle" as const },
];

export function AdminMonitorsPage() {
  const [tab, setTab] = useState<"monitors" | "api_keys" | "gdpr">("monitors");
  const push = useToastStore((s) => s.push);

  const { data: leases } = useQuery({ queryKey: ["leases"], queryFn: listLeases });
  const { data: alerts } = useQuery({ queryKey: ["usage-alerts"], queryFn: listUsageAlerts });
  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: listRevenueLines });

  const [keys, setKeys] = useState<ApiKey[]>(SEED_KEYS);
  const [newKeyLabel, setNewKeyLabel] = useState("");

  const activeLeases = leases?.filter((l) => l.status === "active").length ?? 0;
  const latestAiCost = revenue?.at(-1)?.aiCost ?? 0;

  return (
    <>
      <PageHeader title="Admin Monitors" description="Lease health, background queues, AI spend, API access and data-privacy actions — platform-wide." />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "monitors", label: "Monitors" },
          { value: "api_keys", label: "API Keys", count: keys.length },
          { value: "gdpr", label: "GDPR & Retention" },
        ]}
      />

      <div className="mt-4">
        {tab === "monitors" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card><CardBody><p className="text-xs text-muted">Active leases</p><p className="mt-1.5 text-2xl font-semibold text-ink">{activeLeases}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-muted">Leases near licence limit</p><p className="mt-1.5 text-2xl font-semibold text-warning-dark">{alerts?.length ?? 0}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-muted">AI cost (this month)</p><p className="mt-1.5 text-2xl font-semibold text-ink">£{latestAiCost.toLocaleString()}</p></CardBody></Card>
            </div>

            <Card className="mb-4">
              <CardHeader><CardTitle>Background queues</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {FAKE_QUEUES.map((q) => (
                  <div key={q.name} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                    <span className="text-sm text-ink">{q.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{q.depth} queued</span>
                      {q.status === "processing" ? (
                        <Badge tone="warning"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Processing</Badge>
                      ) : (
                        <Badge tone="success"><CheckCircle2 className="mr-1 inline h-3 w-3" />Idle</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lease alerts</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {alerts && alerts.length > 0 ? alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                    <span className="text-sm text-ink">{a.customerName}</span>
                    <Badge tone="warning">{a.currentPercent}% of licences in use</Badge>
                  </div>
                )) : <p className="text-sm text-muted">No leases currently over their alert threshold.</p>}
              </CardBody>
            </Card>
          </>
        )}

        {tab === "api_keys" && (
          <Card>
            <CardHeader>
              <CardTitle>API keys</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mb-4 flex gap-2">
                <Input placeholder="Key label, e.g. customer integration name" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} className="flex-1" />
                <Button
                  disabled={!newKeyLabel.trim()}
                  onClick={() => {
                    const key: ApiKey = { id: `k_${Date.now()}`, label: newKeyLabel.trim(), last4: Math.random().toString(16).slice(2, 6), createdAt: new Date().toISOString().slice(0, 10), rateLimit: "600 req/min" };
                    setKeys((k) => [key, ...k]);
                    setNewKeyLabel("");
                    push(`API key created — shown once: sk_live_••••••••${key.last4}`);
                  }}
                >
                  <Plus className="h-4 w-4" /> Generate key
                </Button>
              </div>
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted" />
                      <div>
                        <p className="text-sm font-medium text-ink">{k.label}</p>
                        <p className="text-xs text-muted">sk_live_••••••••{k.last4} · created {k.createdAt} · {k.rateLimit}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setKeys((prev) => prev.filter((x) => x.id !== k.id)); push(`Revoked key "${k.label}"`); }}
                      className="rounded-[6px] p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {tab === "gdpr" && (
          <Card>
            <CardHeader><CardTitle>GDPR export, erasure & retention</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">Export a user's data</p>
                  <p className="text-xs text-muted">Generates a machine-readable export of everything held against one account.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => push("Data export queued — will appear in Downloads once ready", "info")}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">Erase a user's data</p>
                  <p className="text-xs text-muted">Irreversible. Audit log entries are retained (append-only) but personal fields are redacted.</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => push("Erasure request submitted for review")}>
                  <ShieldAlert className="h-3.5 w-3.5" /> Erase
                </Button>
              </div>
              <div>
                <Label>Retention period — audit log</Label>
                <Input defaultValue="7 years" className="w-48" />
              </div>
              <div>
                <Label>Retention period — inactive account data</Label>
                <Input defaultValue="24 months" className="w-48" />
              </div>
              <Button onClick={() => push("Retention rules saved")}>Save retention rules</Button>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
