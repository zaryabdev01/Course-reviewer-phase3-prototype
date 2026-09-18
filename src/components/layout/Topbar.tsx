import { Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "@/lib/api/engagement";

export function Topbar() {
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-line bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-[10px] border border-line bg-gray-50 px-3 py-1.5 text-sm text-muted md:flex">
          <Search className="h-4 w-4" />
          <span>Search…</span>
        </div>
        <Link
          to="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white hover:bg-gray-50"
        >
          <Bell className="h-4.5 w-4.5 text-ink-soft" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Link>
        <PersonaSwitcher />
      </div>
    </header>
  );
}
