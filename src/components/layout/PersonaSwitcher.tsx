import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PERSONAS, usePersonaStore, useActivePersona } from "@/lib/store/personaStore";
import { cn } from "@/lib/cn";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  professional: "Professional",
  organisational: "Organisational",
  platform_admin: "Platform Admin",
  platform_super_admin: "Platform Super Admin",
};

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const persona = useActivePersona();
  const setPersonaId = usePersonaStore((s) => s.setPersonaId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-2 py-1.5 hover:bg-gray-50"
      >
        <Avatar name={persona.label} color={persona.avatarColor} size={28} />
        <div className="text-left">
          <p className="text-xs font-semibold leading-tight text-ink">{persona.label.split(" — ")[0]}</p>
          <p className="text-[11px] leading-tight text-muted">
            {ACCOUNT_TYPE_LABEL[persona.accountType]}
            {persona.organisationRole ? ` · ${persona.organisationRole.replace("_", " ")}` : ""}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-[12px] border border-line bg-white p-2 shadow-[var(--shadow-popover)]">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            View as — no auth in this prototype
          </p>
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPersonaId(p.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left hover:bg-gray-50",
                p.id === persona.id && "bg-primary-50",
              )}
            >
              <Avatar name={p.label} color={p.avatarColor} size={30} />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{p.label}</p>
                <p className="text-[11px] text-muted">
                  {ACCOUNT_TYPE_LABEL[p.accountType]}
                  {p.organisationRole ? ` · ${p.organisationRole.replace("_", " ")}` : ""}
                </p>
              </div>
              {p.id === persona.id && <Check className="h-4 w-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
