# Specs & Plans — Chronological Index

The technical decision ledger for this project. Each row is one unit of work: a dated spec (the
design, the reasoning, the reconciliation against what already exists) and, where the work was
non-trivial enough to need one, a plan (the task breakdown an implementer or subagent executed
against). Unlike `docs/PRD.md` or `docs/architecture.md`, nothing here needs to be kept "current" —
a spec is true the day it's written and stays true as a historical record. The only thing that goes
stale is this index itself if a new spec lands without a row.

**Maintenance rule:** adding a spec or plan under `docs/superpowers/{specs,plans}/` gets one new row
here, in the same commit. See `CLAUDE.md`'s "Docs to update when architecture changes."

---

| Date | Spec | Plan | What it did | Supersedes / extends |
|---|---|---|---|---|
| 2026-07-01 | [ai-mocking-layer-design.md](specs/2026-07-01-ai-mocking-layer-design.md) | [ai-mocking-layer.md](plans/2026-07-01-ai-mocking-layer.md) | HTTP-boundary mock for server-side AI provider calls — `page.route()` can't reach a BullMQ worker's own `fetch`, so this builds the mock the original testing decision log assumed but couldn't actually deliver | — |
| 2026-07-01 | [web-e2e-tests-design.md](specs/2026-07-01-web-e2e-tests-design.md) | [web-e2e-tests.md](plans/2026-07-01-web-e2e-tests.md) | First real-browser Playwright test, driving the static web demo end to end (record/upload → transcript → flavour → chronicle) | Depends on the mocking layer above |
| 2026-07-03 | [pt-messaging-design.md](specs/2026-07-03-pt-messaging-design.md) | *(none — small copy change)* | Landing-page copy signaling Portuguese input works — the pipeline already handled it silently, nothing to fix, just to say | — |
| 2026-07-06 | [sample-chronicle-design.md](specs/2026-07-06-sample-chronicle-design.md) | *(none — small copy change)* | A hand-written example chronicle added to the landing page so visitors see the output style before recording their own | — |
| 2026-07-30 | [web-frontend-rebuild-design.md](specs/2026-07-30-web-frontend-rebuild-design.md) | [web-frontend-rebuild.md](plans/2026-08-02-web-frontend-rebuild.md) | Replaced the static HTML demo with `apps/web` — React + Vite, MVP (Model/Presenter/View) layering, generated typed `packages/api-client`. Adopted the first Claude Design visual handoff ("Nocturne") in the same pass | Retires the Phase-0 static test rig |
| 2026-08-31 | [web-styling-tailwind-shadcn-design.md](specs/2026-08-31-web-styling-tailwind-shadcn-design.md) | [web-styling-tailwind-shadcn.md](plans/2026-08-31-web-styling-tailwind-shadcn.md) | Migrated `apps/web`'s ~130 inline `style={{}}` objects to Tailwind v4 + shadcn primitives — responsive, `data-flavour` CSS-variable theming, focus-ring/reduced-motion accessibility | Extends the web-frontend-rebuild above (same app, styling layer only) |
| 2026-09-04 | [web-frontend-motion-design.md](specs/2026-09-04-web-frontend-motion-design.md) | [web-frontend-motion-rebuild.md](plans/2026-09-08-web-frontend-motion-rebuild.md) | Persistent shell (one `RecordRing` surviving every stage), a fourth Confirm view, five designed error states, and a full cross-view motion spec — second Claude Design handoff (transitions) | Supersedes/extends the 2026-07-30 rebuild spec directly (see that spec's own 2026-08-27 addendum) |

---

## Related, not part of this ledger

- `docs/ROADMAP.md` — the linear LinkedIn post sequence. Some posts draw on specs above (e.g. the
  2026-09-10 frontend-standard and Claude-Design posts both cite rows in this table); the post itself
  is never the source of technical truth, the spec is.
- `docs/HORIZONS.md` — non-linear menu of what might become the *next* spec. Nothing there has a row
  here yet because nothing there has been speced.
- `docs/linkedin/` (formerly `devlog/`) — three files predate this index entirely (`2026-06-09-mcp.md`,
  `2026-06-15-testing.md`, `2026-06-19-queue-architecture-and-production-bugs.md`, all Jun 9–19, before
  the first spec on 2026-07-01). They did a spec's job in a public-narrative voice before this practice
  existed. Not rows here — they're a different, earlier practice, not retroactively part of this one.
