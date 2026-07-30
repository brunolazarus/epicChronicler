# Web Frontend Rebuild — Design

**Date:** 2026-07-30
**Motivation:** the web demo (`apps/api/src/static/index.html`) is a single static HTML file with vanilla JS, built as a Phase 0 test rig and never revisited. Following the direction change to deprioritize groups/multiplayer to backlog (SDD §2, 2026-07-28), the single-user experience is now the near-term product focus, and the current UI is the limiting factor, not the pipeline behind it. This rebuild applies the crystallized architecture standard (`docs/standards/frontend-architecture-standard.md`) to that experience: React + Vite, TanStack Query, Zod, MVP (Model/Presenter/View) layering, composition-first Views, contract-first generated API client.

---

## Scope

**In scope:** rebuild today's existing flow (record/upload → transcript → flavour selection → chronicle result), same functionality, same four API endpoints, same UX behavior, on the new stack. Includes the sample-chronicle example card, the Portuguese-input messaging line, and the MCP developer callout footer, all carried over unchanged in content.

**Explicitly out of scope for this pass:**
- Saving/revisiting past chronicles (agreed MVP-scope item, but deferred to a follow-up so the architecture migration ships on its own, not bundled with a new persistence decision)
- Any auth/accounts work (backlog per SDD §2)
- `packages/core` and `packages/ui` as shared packages — per the standard's "promotion, not preemption" principle, there is currently only one frontend app (`apps/web`); shared packages get created when a second app (e.g. a future mobile app) actually needs to share Model hooks or UI primitives, not before. Model/Presenter/View layers live local to `apps/web` for now.
- Any change to `apps/api`'s pipeline logic, routes, or `apps/mcp`. This is a frontend-only rebuild; the backend contract stays exactly as it is today.

---

## Structure

```
apps/
  web/                      # NEW — React + Vite, replaces the static demo
    src/
      models/               # TanStack Query hooks, local to this app
        useUploadAudio.ts
        useJobPoll.ts
        useFlavours.ts
        useGenerateChronicle.ts
      presenters/
        useChroniclePresenter.ts   # orchestrates the whole record→transcript→flavour→result flow
      views/
        SampleChronicleCard.tsx
        RecordStep.tsx
        TranscriptStep.tsx
        FlavourStep.tsx
        ResultStep.tsx
        McpCallout.tsx
      App.tsx                # composes the views, no orchestration logic of its own

packages/
  api-client/                # NEW — generated from apps/api's existing OpenAPI spec
    src/
      types.gen.ts           # generated
      client.ts              # thin typed fetch wrapper

apps/api/                    # unchanged pipeline routes/logic
                              # static-serving now points at apps/web's Vite build output
                              # instead of apps/api/src/static/index.html
```

Each of today's cards becomes its own View component composed together in `App.tsx`. `useChroniclePresenter` is the single place holding flow state (current step, selected flavour, transcript text); Views stay render-only; Models stay thin wrappers around the four existing endpoints (`/upload`, `/jobs/:id`, `/flavours`, `/generate`), called through `packages/api-client` instead of raw `fetch`.

---

## Data flow

```
View (e.g. RecordStep)
  → Presenter (useChroniclePresenter)
  → Model (useUploadAudio / useJobPoll / useFlavours / useGenerateChronicle)
  → packages/api-client (generated, typed fetch — no auth token; there is no login yet)
  → apps/api (existing Zod-validated Hono routes, unchanged)
  → existing BullMQ workers → R2 / Redis (all unchanged)
```

---

## Error and loading handling

- `useFlavours` (fetch-on-mount, no polling) uses `useSuspenseQuery` directly.
- `useUploadAudio`/`useJobPoll` and `useGenerateChronicle`'s job-polling are modeled as a query with `refetchInterval`, polling until the job reaches `completed`/`failed`, so the hook only resolves once there's a real result. No manual `isLoading` branching in components.
- One `ErrorBoundary` **per step card**, not a single global boundary, matching today's behavior where the upload card and the generate card can independently show an error state without affecting each other.
- Fallback content renders the raw API error message directly (e.g. `err.message`), matching today's existing behavior exactly. This is the standard's named early-stage trade-off (§5 of the standard doc), formalized here rather than newly introduced.

---

## Testing

- **Unit-level:** Vitest + React Testing Library. Models tested with mocked fetch; Presenters tested as pure orchestration logic in isolation; Views get simple render tests.
- **Contract drift:** a CI job regenerates `packages/api-client` from `apps/api`'s live OpenAPI spec and diffs it against what's committed. Any undeclared change to a route's real response shape fails the build. This is new to the project.
- **E2E (Playwright):** the existing suite selects on hand-written IDs tied to the static HTML (`#btn-record`, `#card-upload`, etc.). Add stable `data-testid` attributes to each View component and repoint the existing specs at those, same user-facing flow under test, decoupled from implementation details. Updated as part of this same body of work, not deferred.

---

## Deployment and rollout

No new deployment target. `apps/web` builds via Vite to static assets; `apps/api`'s existing Hono process serves them the same way it serves `index.html` today, same Railway service (`epicChronicler-web`), no new service, no CORS, no separate hosting.

**Rollout:** build `apps/web` alongside the current static file (doesn't touch production). Get the Playwright suite green against it locally. Swap `apps/api`'s static-serving to point at the Vite build output. Delete `apps/api/src/static/index.html`. One cutover point, not a gradual migration, since it's a single-page flow with nothing to migrate incrementally.

---

## Success criteria

- The rebuilt `apps/web` reproduces today's full flow (sample card, record/upload, transcript, flavour selection, chronicle result + audio playback, MCP footer) with no functional regression
- Updated Playwright E2E suite passes against the new app
- A contract-drift CI check exists and fails on a deliberately introduced backend/client type mismatch (verify once implemented)
- No new Railway service, no new backend routes, no auth introduced
- `packages/core` and `packages/ui` are not created in this pass
