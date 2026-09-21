import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { listNotifications } from "@/lib/api/engagement";
import { useToastStore } from "@/lib/store/toastStore";
import { NOTIFICATION_CATEGORY_LABELS, type NotificationCategory } from "@/contracts";
import { cn } from "@/lib/cn";
import {
  ClipboardCheck,
  Clock,
  Sparkles,
  FileBarChart,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Settings,
  MessageSquare,
} from "lucide-react";

const CATEGORY_ICON: Record<NotificationCategory, typeof ClipboardCheck> = {
  allocation: ClipboardCheck,
  deadline: Clock,
  format_ready: Sparkles,
  report_ready: FileBarChart,
  renewal: RefreshCw,
  qa: HelpCircle,
  lease_alert: AlertTriangle,
  system: Settings,
  message: MessageSquare,
};

const CATEGORIES = Object.keys(CATEGORY_ICON) as NotificationCategory[];

export function NotificationsPage() {
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });
  const [tab, setTab] = useState<"feed" | "preferences">("feed");
  const [prefs, setPrefs] = useState<Record<NotificationCategory, { inApp: boolean; email: boolean }>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, { inApp: true, email: c !== "system" }])) as Record<NotificationCategory, { inApp: boolean; email: boolean }>,
  );
  const push = useToastStore((s) => s.push);

  function toggle(category: NotificationCategory, channel: "inApp" | "email") {
    setPrefs((p) => ({ ...p, [category]: { ...p[category], [channel]: !p[category][channel] } }));
  }

  return (
    <>
      <PageHeader title="Notifications" description="Allocations, deadlines, format readiness, reports, renewals, Q&A and lease alerts — all in one feed." />

      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} options={[{ value: "feed", label: "Feed" }, { value: "preferences", label: "Preferences" }]} />
      </div>

      {tab === "feed" ? (
        <Card>
          <CardBody className="space-y-1 p-2">
            {notifications?.map((n) => {
              const Icon = CATEGORY_ICON[n.category];
              const content = (
                <div className={cn("flex items-start gap-3 rounded-[10px] px-3 py-3", !n.read && "bg-primary-50")}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
                    </div>
                    <p className="text-xs text-muted">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge tone="neutral" className="capitalize">{n.category.replace("_", " ")}</Badge>
                </div>
              );
              return n.actionHref ? (
                <Link key={n.id} to={n.actionHref} className="block hover:bg-gray-50 rounded-[10px]">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">In-app</th>
                  <th className="px-5 py-3 text-center">Email</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c];
                  return (
                    <tr key={c} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-ink">
                          <Icon className="h-4 w-4 text-muted" /> {NOTIFICATION_CATEGORY_LABELS[c]}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input type="checkbox" checked={prefs[c].inApp} onChange={() => toggle(c, "inApp")} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input type="checkbox" checked={prefs[c].email} onChange={() => toggle(c, "email")} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end border-t border-line p-4">
              <button
                onClick={() => push("Notification preferences saved")}
                className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Save preferences
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
