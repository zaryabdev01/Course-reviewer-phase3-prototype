# Course Reviewer — Phase 3 Prototype

A clickable, dummy-data-only prototype of the Phase 3 milestone plan, built on
the same stack as the real Phase 2 frontend (React 19 + Vite + TypeScript +
TanStack Query + Zod + Tailwind v4 + react-hook-form + react-router-dom),
so it can become the real Phase 3 frontend rather than being thrown away.

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5183`. No login — use the **persona switcher**
(top-right) to view the app as any of the Phase 3 account types:
Professional, Organisational (Org Administrator / Org Manager / Team
Member), Platform Admin, Platform Super Admin. The sidebar navigation and
each screen's content change with the persona — this is the Phase 3
permission matrix (Milestone 2) made visible before a single line of the
real policy layer exists.

## Architecture — read this before extending it

```
src/
  contracts/   Zod schemas — the API contract. Types every screen consumes.
  mocks/       Seeded fake data generators + the in-memory "database" (db.ts).
  lib/api/     Fake network layer — async functions with simulated latency.
               THE ONLY layer that reads from mocks/. Swap these function
               bodies for real fetch/axios calls and nothing else changes.
  lib/store/   Zustand — persona switcher only (no real auth in this app).
  components/  ui/ (primitives) and layout/ (shell, sidebar, nav config).
  pages/       One file per screen, grouped loosely by milestone area.
  app/         providers.tsx (TanStack Query client), router.tsx (routes).
```

**The rule that keeps this non-throwaway:** no component ever imports from
`mocks/` directly. Everything goes through `lib/api/*`. When the real
backend exists, only `lib/api/*` changes.

`contracts/` is deliberately treated as the API contract, not just UI
types — it is the shape the real backend should implement. Zod schemas
here should be the starting point for that work, not a separate exercise.

## What's built vs. stubbed

Built with real interaction (filters, wizards, virtualization, forms):
Dashboard (persona-aware), Development, Readiness Check → Learning Setup →
Choose Format → Conversion Status → Course Player, Allocation, Org
Structure & Teams (incl. CSV import preview), Training Matrix (5 views,
7 statuses, virtualized grid, bulk-action bar, requirement detail panel,
audit trail), Workforce Planner (planned training, future planner,
training gaps), Distribution Hub (6 tabs + Create Lease wizard with
react-hook-form + Zod validation), Reports, Downloads, Messages,
Notifications, Billing & Revenue, Audit Log, Platform Admin.

Deliberately light: Content Library and Learning Exchange are populated
list views without the full Phase 2 authoring/versioning UI — those
already exist in the real product and weren't worth re-prototyping.

## Data

`src/mocks/seed.ts` fixes the faker seed, so the dataset (Acme Logistics
Ltd, ~90 staff, 14 courses, ~900 Matrix cells, 8 leases across 5
customers, 6 months of revenue) is identical on every reload — useful for
repeat client demos and UAT screen-sharing.

## Known gaps (see the timeline conversation, not this prototype)

This prototype does not attempt to resolve the open architectural
questions raised earlier — the variant-key content-affecting settings,
the event backbone the Matrix/Reports read-models assume, marketplace-vs-
lease precedence, GDPR/append-only tension. It renders a plausible UI for
each; it does not encode the answers.
