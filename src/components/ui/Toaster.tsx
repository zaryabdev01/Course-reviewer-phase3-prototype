import { CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/store/toastStore";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm text-ink shadow-[var(--shadow-popover)]"
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-primary-500" />
          )}
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-1 text-muted hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
