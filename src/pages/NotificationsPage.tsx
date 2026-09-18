import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listNotifications } from "@/lib/api/engagement";
import type { NotificationCategory } from "@/contracts";
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

export function NotificationsPage() {
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });

  return (
    <>
      <PageHeader title="Notifications" description="Allocations, deadlines, format readiness, reports, renewals, Q&A and lease alerts — all in one feed." />
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
    </>
  );
}
