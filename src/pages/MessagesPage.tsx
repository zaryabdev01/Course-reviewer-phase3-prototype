import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { listMessageThreads, listMessages } from "@/lib/api/engagement";
import type { MessageThreadType } from "@/contracts";
import { Send } from "lucide-react";

const TYPE_LABEL: Record<MessageThreadType, string> = {
  direct: "Direct",
  peer_review: "Peer Review",
  org_broadcast: "Organisation Broadcast",
  course_qa: "Course Q&A",
};

export function MessagesPage() {
  const { data: threads } = useQuery({ queryKey: ["message-threads"], queryFn: listMessageThreads });
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = threads?.find((t) => t.id === activeId) ?? threads?.[0];
  const { data: messages } = useQuery({
    queryKey: ["messages", active?.id],
    queryFn: () => listMessages(active!.id),
    enabled: !!active,
  });

  return (
    <>
      <PageHeader title="Messages" description="Direct conversations, organisation broadcasts and course Q&A in one hub." />
      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[14px] border border-line bg-white lg:grid-cols-[320px_1fr]" style={{ height: 560 }}>
        <div className="overflow-y-auto border-r border-line">
          {threads?.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b border-line px-4 py-3 text-left hover:bg-gray-50",
                (active?.id ?? threads[0]?.id) === t.id && "bg-primary-50",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-ink">{t.subject}</span>
                {t.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary-500" />}
              </div>
              <Badge tone="neutral">{TYPE_LABEL[t.type]}</Badge>
              <p className="line-clamp-1 text-xs text-muted">{t.lastMessagePreview}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {active ? (
            <>
              <div className="border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">{active.subject}</p>
                {active.courseTitle && <p className="text-xs text-muted">{active.courseTitle}</p>}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages?.map((m) => (
                  <div key={m.id} className={cn("max-w-md rounded-[12px] px-3 py-2 text-sm", m.isSelf ? "ml-auto bg-primary-50 text-primary-900" : "bg-gray-100 text-ink")}>
                    <p>{m.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{m.authorName} · {new Date(m.sentAt).toLocaleTimeString()}</p>
                  </div>
                ))}
                {(!messages || messages.length === 0) && <p className="text-sm text-muted">No messages yet in this thread.</p>}
              </div>
              <div className="flex items-center gap-2 border-t border-line p-3">
                <Input placeholder="Write a message…" className="flex-1" />
                <Button size="sm"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a conversation</div>
          )}
        </div>
      </div>
    </>
  );
}
