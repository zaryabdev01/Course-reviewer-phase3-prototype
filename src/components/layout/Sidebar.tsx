import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navSectionsFor } from "./navConfig";
import { useActivePersona } from "@/lib/store/personaStore";
import { GraduationCap } from "lucide-react";

export function Sidebar() {
  const persona = useActivePersona();
  const sections = navSectionsFor(persona.accountType, persona.organisationRole);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[var(--color-sidebar)] text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/10">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Course Reviewer</p>
          <p className="text-[11px] leading-tight text-white/50">Phase 3 prototype</p>
        </div>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-white/12 font-medium text-white"
                        : "text-[var(--color-sidebar-text)] hover:bg-white/8 hover:text-white",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-sidebar-border)] px-4 py-3">
        <p className="text-[11px] text-white/40">Dummy data — prototype only</p>
      </div>
    </aside>
  );
}
