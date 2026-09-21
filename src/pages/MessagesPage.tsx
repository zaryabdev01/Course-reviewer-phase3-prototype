import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { listMessageThreads, listMessages } from "@/lib/api/engagement";
import { useActivePersona } from "@/lib/store/personaStore";
import { useToastStore } from "@/lib/store/toastStore";
import type { Message, MessageThread, MessageThreadType, BroadcastAudience } from "@/contracts";
import { Send, Plus, Inbox } from "lucide-react";

const TYPE_LABEL: Record<MessageThreadType, string> = {
  direct: "Direct",
  peer_review: "Peer Review",
  org_broadcast: "Organisation Broadcast",
  course_qa: "Course Q&A",
  crm_broadcast: "CRM Broadcast",
};

const CRM_SEGMENTS = ["All active users", "Free plan users", "Paid plan users", "Inactive 30+ days", "New starters this month"];

type FilterTab = "all" | "shared_inbox" | "qa" | "crm";

export function MessagesPage() {
  const persona = useActivePersona();
  const push = useToastStore((s) => s.push);
  const { data: threadsData } = useQuery({ queryKey: ["message-threads"], queryFn: listMessageThreads });

  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  useEffect(() => {
    if (threadsData && threads === null) setThreads(threadsData);
  }, [threadsData, threads]);

  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const filteredThreads = (threads ?? []).filter((t) => {
    if (filterTab === "shared_inbox") return t.type === "org_broadcast";
    if (filterTab === "qa") return t.type === "course_qa";
    if (filterTab === "crm") return t.type === "crm_broadcast";
    return true;
  });

  const active = threads?.find((t) => t.id === activeId) ?? filteredThreads[0];

  const { data: fetchedMessages } = useQuery({
    queryKey: ["messages", active?.id],
    queryFn: () => listMessages(active!.id),
    enabled: !!active && !(active.id in messagesByThread),
  });
  useEffect(() => {
    if (active && fetchedMessages && !(active.id in messagesByThread)) {
      setMessagesByThread((m) => ({ ...m, [active.id]: fetchedMessages }));
    }
  }, [active, fetchedMessages, messagesByThread]);

  const isOrgAdmin = persona.accountType === "organisational" && (persona.organisationRole === "org_administrator" || persona.organisationRole === "org_manager");
  const isPlatformAdmin = persona.accountType === "platform_admin" || persona.accountType === "platform_super_admin";

  function sendMessage() {
    if (!active || !draft.trim()) return;
    const msg: Message = { id: `m_${Date.now()}`, threadId: active.id, authorName: "You", body: draft.trim(), sentAt: new Date().toISOString(), isSelf: true };
    setMessagesByThread((m) => ({ ...m, [active.id]: [...(m[active.id] ?? []), msg] }));
    setThreads((prev) => (prev ?? []).map((t) => (t.id === active.id ? { ...t, lastMessagePreview: msg.body, lastMessageAt: msg.sentAt } : t)));
    setDraft("");
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Direct conversations, organisation broadcasts, CRM broadcasts and course Q&A in one hub."
        actions={
          (isOrgAdmin || isPlatformAdmin) && (
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <Plus className="h-4 w-4" /> Compose
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Tabs
          value={filterTab}
          onChange={setFilterTab}
          options={[
            { value: "all", label: "All" },
            { value: "shared_inbox", label: "Shared Inbox", count: (threads ?? []).filter((t) => t.type === "org_broadcast").length },
            { value: "qa", label: "Course Q&A" },
            { value: "crm", label: "CRM Broadcasts" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-[14px] border border-line bg-white lg:grid-cols-[320px_1fr]" style={{ height: 560 }}>
        <div className="overflow-y-auto border-r border-line">
          {filteredThreads.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
              <Inbox className="h-6 w-6" /> Nothing in this view
            </div>
          )}
          {filteredThreads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b border-line px-4 py-3 text-left hover:bg-gray-50",
                active?.id === t.id && "bg-primary-50",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-ink">{t.subject}</span>
                {t.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary-500" />}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge tone="neutral">{TYPE_LABEL[t.type]}</Badge>
                {t.broadcastAudience && <Badge tone="brand" className="capitalize">{t.broadcastAudience.replace("_", " ")}</Badge>}
                {t.segment && <Badge tone="info">{t.segment}</Badge>}
              </div>
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
                <p className="text-xs text-muted">{active.participants.join(", ")}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {(messagesByThread[active.id] ?? []).map((m) => (
                  <div key={m.id} className={cn("max-w-md rounded-[12px] px-3 py-2 text-sm", m.isSelf ? "ml-auto bg-primary-50 text-primary-900" : "bg-gray-100 text-ink")}>
                    <p>{m.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{m.authorName} · {new Date(m.sentAt).toLocaleTimeString()}</p>
                  </div>
                ))}
                {(messagesByThread[active.id] ?? []).length === 0 && <p className="text-sm text-muted">No messages yet in this thread.</p>}
              </div>
              <div className="flex items-center gap-2 border-t border-line p-3">
                <Input
                  placeholder="Write a message…"
                  className="flex-1"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a conversation</div>
          )}
        </div>
      </div>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        allowCrm={isPlatformAdmin}
        onSend={(thread) => {
          setThreads((prev) => [thread, ...(prev ?? [])]);
          setMessagesByThread((m) => ({ ...m, [thread.id]: [] }));
          setActiveId(thread.id);
          setComposeOpen(false);
          push(thread.type === "crm_broadcast" ? `CRM broadcast sent to "${thread.segment}"` : `Broadcast sent to ${thread.participants.join(", ")}`);
        }}
      />
    </>
  );
}

function ComposeModal({
  open,
  onClose,
  allowCrm,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  allowCrm: boolean;
  onSend: (thread: MessageThread) => void;
}) {
  const [kind, setKind] = useState<"org_broadcast" | "crm_broadcast">("org_broadcast");
  const [audience, setAudience] = useState<BroadcastAudience>("all_staff");
  const [recipient, setRecipient] = useState("");
  const [segment, setSegment] = useState(CRM_SEGMENTS[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const valid = subject.trim() && body.trim() && (kind === "crm_broadcast" || audience === "all_staff" || recipient.trim());

  function submit() {
    const thread: MessageThread =
      kind === "org_broadcast"
        ? {
            id: `t_${Date.now()}`,
            type: "org_broadcast",
            subject: subject.trim(),
            participants: [audience === "all_staff" ? "All Staff" : recipient.trim()],
            lastMessagePreview: body.trim(),
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
            courseTitle: null,
            broadcastAudience: audience,
            segment: null,
          }
        : {
            id: `t_${Date.now()}`,
            type: "crm_broadcast",
            subject: subject.trim(),
            participants: [segment],
            lastMessagePreview: body.trim(),
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
            courseTitle: null,
            broadcastAudience: null,
            segment,
          };
    onSend(thread);
    setSubject("");
    setBody("");
    setRecipient("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose broadcast" width="max-w-lg">
      <div className="space-y-4">
        {allowCrm && (
          <div className="flex gap-2">
            <button
              onClick={() => setKind("org_broadcast")}
              className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${kind === "org_broadcast" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
            >
              Organisation broadcast
            </button>
            <button
              onClick={() => setKind("crm_broadcast")}
              className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium ${kind === "crm_broadcast" ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
            >
              CRM broadcast (all end users)
            </button>
          </div>
        )}

        {kind === "org_broadcast" ? (
          <div>
            <Label>Send to</Label>
            <div className="mb-2 flex gap-2">
              {(["person", "group", "all_staff"] as BroadcastAudience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium capitalize ${audience === a ? "border-primary-300 bg-primary-50 text-primary-700" : "border-line text-muted"}`}
                >
                  {a.replace("_", " ")}
                </button>
              ))}
            </div>
            {audience !== "all_staff" && (
              <Input placeholder={audience === "person" ? "e.g. Sam Okafor" : "e.g. Warehouse Operations (Dept)"} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            )}
          </div>
        ) : (
          <div>
            <Label>Segment</Label>
            <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
              {CRM_SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}

        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </div>
        <div>
          <Label>Message</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-24 w-full rounded-[10px] border border-line bg-white p-3 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            placeholder="Write your message…"
          />
        </div>
        <Button className="w-full" disabled={!valid} onClick={submit}>
          Send {kind === "crm_broadcast" ? "CRM broadcast" : "broadcast"}
        </Button>
      </div>
    </Modal>
  );
}
