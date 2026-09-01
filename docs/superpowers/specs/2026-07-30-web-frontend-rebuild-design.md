# Web Frontend Rebuild — Design

**Date:** 2026-07-30
**Motivation:** the web demo (`apps/api/src/static/index.html`) is a single static HTML file with vanilla JS, built as a Phase 0 test rig and never revisited. Following the direction change to deprioritize groups/multiplayer to backlog (SDD §2, 2026-07-28), the single-user experience is now the near-term product focus, and the current UI is the limiting factor, not the pipeline behind it. This rebuild applies the crystallized architecture standard (`docs/standards/frontend-architecture-standard.md`) to that experience: React + Vite, TanStack Query, Zod, MVP (Model/Presenter/View) layering, composition-first Views, contract-first generated API client.

---

## Addendum — visual/UX direction adopted (2026-08-27)

**Supersedes the "same UX behavior" line below.** A high-fidelity visual/UX design was produced via
Claude Design and handed off at `docs/standards/design_handoff_epic_chronicler/` (Landing / Processing
/ Chronicle views, the "Nocturne" dark design system, a per-flavour CSS scene behind the hero). This
rebuild now targets that design directly, in the same pass as the architecture port, rather than
porting today's plain styling first and restyling later. Reconciliation decisions made against this
app's actual scope and API contract:

- **Flow reorder** — the design picks the narrator flavour on the Landing carousel, before recording,
  where today's app picks it at Step 3 after the transcript exists. Trivial for the MVP-layering
  architecture: `useChroniclePresenter` already holds `selectedFlavour` as state independent of step
  order, so this is a UI reorder, not a structural change.
- **Retell ("Tell it again as X") pills** — the design's Chronicle view lets a user re-narrate the
  existing transcript in a new flavour. SDD §2 lists this under Out of Scope (written for the
  groups-era model, reasoned as "requires opening regeneration to all members"). Rather than reopen
  that SDD line or build real regeneration, the pills stay visually but redirect to Landing (start
  over) instead of calling `/generate` again — no new backend surface, SDD's out-of-scope call stays
  intact for now.
- **Error & edge states** — see `docs/standards/design_handoff_epic_chronicler/README.md`'s "Error &
  edge states" section for the five designed states and two implementation simplifications (client-side
  format validation; whole-job retry instead of true per-stage resumability). This replaces the
  "Error and loading handling" section below.
- **Transcript-review gate, missing from the handoff** — the handoff flows straight from recording into
  an automatic transcribe→rewrite→narrate pipeline (Processing view), with no screen to review/correct
  the transcript before the paid LLM call fires. Today's app has that gate deliberately (edit the
  transcript, then manually click "Tell the story"). Decision: **keep the gate**. A brief review step is
  inserted between Landing (recording/upload complete) and Processing — reuses a plain editable
  textarea (no new visual design needed for this one interstitial moment) with a "Tell the story"
  button that starts the Processing pipeline. Not in the handoff; added because removing cost control
  in front of a paid API call is a product regression, not a simplification.
- **Source-of-truth rule for this and future handoffs**: this spec and the SDD are authoritative: where
  a Claude Design handoff implies scope neither has agreed to, simplify or flag it rather than
  expanding scope to match the visual design.

---

## Scope

**In scope:** rebuild today's existing flow (record/upload → transcript → flavour selection → chronicle result), same functionality, same four API endpoints, on the new stack, **with the visual/UX direction from the Claude Design handoff** (see addendum above) rather than today's plain styling. Includes the sample-chronicle example card, the Portuguese-input messaging line, and the MCP developer callout footer, carried over in substance (exact placement/styling now follows the handoff).

**Explicitly out of scope for this pass:**
- Saving/revisiting past chronicles (agreed MVP-scope item, but deferred to a follow-up so the architecture migration ships on its own, not bundled with a new persistence decision)
- Any auth/accounts work (backlog per SDD §2)
- True chronicle regeneration ("retell" pills redirect to Landing instead — see addendum)
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

Superseded by the designed states in `docs/standards/design_handoff_epic_chronicler/epic-chronicler-error-states.html`
(mic denied, invalid upload, failed pipeline stage, expired job, generic failure) — see that bundle's
README section for the full spec and the two simplifications reconciled against this app's real API.

- `useFlavours` (fetch-on-mount, no polling) uses `useSuspenseQuery` directly.
- `useUploadAudio`/`useJobPoll` and `useGenerateChronicle`'s job-polling are modeled as a query with `refetchInterval`, polling until the job reaches `completed`/`failed`, so the hook only resolves once there's a real result. No manual `isLoading` branching in components.
- One `ErrorBoundary` **per step card**, not a single global boundary, matching the designed states where mic/upload errors (Landing), pipeline-stage failures (Processing) and expired/generic failures (Processing or Chronicle) each render independently.
- Mic-denied and invalid-upload states render inline in place of the record ring / upload path, driven by browser permission state and client-side file validation respectively — no new API surface.
- Pipeline-stage failure state is derived from `job.progress` (10/60/85/100 marks transcribe/rewrite/narrate boundaries) plus `job.failedReason` for the raw detail line — no invented error codes, no per-stage retry (see addendum: retry re-runs the whole `/generate` call).
- Expired-job state is the existing `404` from `GET /jobs/:id`; generic-failure state is `status: "failed"` — both already distinct today, no backend change.

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
