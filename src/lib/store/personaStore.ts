import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "@/contracts";
import { ORG_ACME_ID, ORG_BRIGHTPATH_ID } from "@/mocks/seed";

/**
 * Dev-only "act as" switcher. There is no auth in this prototype — every
 * screen behind account-type or role-based access is reached by picking a
 * persona here, which is also how the Phase 3 permission matrix (M2)
 * becomes visibly testable before a single line of the real policy layer
 * exists. Persisted to localStorage purely as a per-viewer convenience
 * (remember the last-picked persona across reloads) — never treated as
 * real auth state.
 */
export const PERSONAS: Persona[] = [
  {
    id: "professional",
    label: "Jordan Blake — Professional",
    accountType: "professional",
    avatarColor: "#0d9488",
    email: "jordan.blake@example.com",
  },
  {
    id: "org_admin",
    label: "Priya Nair — Org Administrator",
    accountType: "organisational",
    organisationId: ORG_ACME_ID,
    organisationRole: "org_administrator",
    avatarColor: "#16a34a",
    email: "priya.nair@acmelogistics.co.uk",
  },
  {
    id: "org_manager",
    label: "Sam Okafor — Org Manager",
    accountType: "organisational",
    organisationId: ORG_ACME_ID,
    organisationRole: "org_manager",
    avatarColor: "#f79009",
    email: "sam.okafor@acmelogistics.co.uk",
  },
  {
    id: "team_member",
    label: "Alex Whitfield — Team Member",
    accountType: "organisational",
    organisationId: ORG_ACME_ID,
    organisationRole: "team_member",
    avatarColor: "#4f39f6",
    email: "alex.whitfield@acmelogistics.co.uk",
  },
  {
    id: "brightpath_admin",
    label: "Daniel Osei — Org Administrator (Bright Path)",
    accountType: "organisational",
    organisationId: ORG_BRIGHTPATH_ID,
    organisationRole: "org_administrator",
    avatarColor: "#4f39f6",
    email: "daniel.osei@brightpathcare.co.uk",
  },
  {
    id: "platform_admin",
    label: "Ravi Chandra — Platform Admin",
    accountType: "platform_admin",
    avatarColor: "#e62e2e",
    email: "ravi.chandra@coursereviewer.io",
  },
  {
    id: "platform_super_admin",
    label: "Morgan Hale — Platform Super Admin",
    accountType: "platform_super_admin",
    avatarColor: "#106b32",
    email: "morgan.hale@coursereviewer.io",
  },
];

interface PersonaState {
  personaId: string;
  setPersonaId: (id: string) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      personaId: "org_admin",
      setPersonaId: (id) => set({ personaId: id }),
    }),
    { name: "phase3-prototype-persona" },
  ),
);

export function useActivePersona(): Persona {
  const personaId = usePersonaStore((s) => s.personaId);
  return PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[1];
}
