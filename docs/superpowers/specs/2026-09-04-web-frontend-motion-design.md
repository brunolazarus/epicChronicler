# Web Frontend Motion & Confirm-Step Rebuild — Design

**Date:** 2026-09-04
**Supersedes/extends:** `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` (the MVP-architecture
rebuild that shipped `apps/web`). This spec covers a second design handoff — `docs/standards/transitions-handoff/design_handoff_epic_chronicler/`
— that adds a fourth view (Confirm), five designed error/edge states, and a motion spec connecting all
four views. It does not reopen anything the prior spec already decided except where noted below.

**Motivation:** the shipped `apps/web` swaps a full View per pipeline stage (`App.tsx`'s `Flow()` is a
plain `if/else` on `stage`), with no shared header, no consistent container, no scroll management, and
zero cross-step transitions. In practice this reads as separate pages rather than one flow — flagged
independently before this handoff arrived (see [[project_web_ux_transitions]] memory) via: the header
vanishing after Landing, background/width/margin jumping per stage, and scroll position carrying over
from a stage the user has left. The new handoff's motion spec addresses this directly and is more
specific than the ad-hoc "persistent shell" idea floated earlier — this design follows the handoff, not
that earlier sketch.

---

## Reconciliation against the real codebase

Confirmed **no drift** — the handoff's data assumptions match the live code exactly:
- Flavour keys/names/descriptions (`packages/core/src/flavours/index.ts`) match the README's table verbatim.
- Voice ids (`packages/core/src/tts/openrouter-models.ts`): `bm_george`/`am_adam`/`bf_emma`/`af_bella` match.
- Upload limit (25 MB) and accepted formats (webm/mp3/m4a/wav/ogg) match, enforced both client
  (`apps/web/src/models/validateAudioFile.ts`) and server (`apps/api/src/routes/pipeline.ts:90-93`).
- The accent system in `apps/web/src/index.css` already implements the exact recipe the handoff
  specifies: `oklch(0.734 …)` per flavour, `color-mix(... 20%/9%)` for soft/ghost, error at
  `oklch(0.734 0.155 25)` / `oklch(0.86 0.09 25)`, cascaded via `[data-flavour]`.
- `apps/web/src/scenes.ts` already is the data-driven `Shape[]`-per-flavour, fixed-900×300-stage
  generator the handoff describes — reused as-is, not rebuilt.

**Real gaps, resolved as follows:**

1. **Retell semantics conflict — resolved in favour of the standing spec.** This handoff states a
   retell "re-runs rewrite + narrate from the existing transcript... should not re-transcribe." The
   prior spec's addendum explicitly scoped retell **out** (pills redirect to Landing, citing SDD §2).
   **Decision (confirmed with Bruno 2026-09-04): keep the existing behavior — retell pills redirect to
   Landing.** Not reopening a closed scope decision for this pass. If real retell regeneration is
   wanted later, it's its own spec.
2. **No chronicle title field.** `ChronicleJobResultSchema` returns one `text` string; the design shows
   a distinct legend title. No backend change in this pass (out of scope per the standing rule — this is
   a frontend-only rebuild). **Resolution: no separate title.** The chronicle card's title slot is
   dropped from the port; the existing narrator-name kicker stays as the only heading element above the
   body text.
3. **`durationSeconds` / `wordCount` / `detectedLanguages` mostly don't exist server-side.**
   `wordCount` is derived client-side from `chronicleText.split(/\s+/).length`. Narration duration
   is read from the `<audio>` element once its metadata loads. Recording duration is captured
   client-side at record/upload time (readable from the recorded `Blob`/`File` before the raw audio is
   discarded server-side) and threaded through presenter state. **`detectedLanguages` ("pt-br + en
   detected") has no data source and no client-side substitute — dropped from this port.** The
   transcript footer keeps only the duration and word-count pieces it can support honestly.
4. **Missing `--accent-line` token.** `index.css` defines `--accent-soft`/`--accent-ghost` per
   flavour but not the 34%-mix `--accent-line` the handoff's ring/carousel borders use. Add it
   alongside the existing `--error-line` (same recipe, accent instead of error).
5. **Focus ring isn't error-aware.** `index.css:73-76` always outlines `:focus-visible` in
   `var(--accent)`. Error-outlined controls (retry buttons, the mic-blocked "Try again" pill) need a
   2px **error** ring instead. Resolved by scoping the existing rule with `:not([data-error-control])`
   plus a second rule for `[data-error-control]:focus-visible { outline-color: var(--error) }`, rather
   than a new focus-ring system.
6. **`jobId` isn't threaded to the UI.** `ChronicleView.tsx` currently hardcodes `jobId="—"` in its
   `EmptyStateShell` call. The presenter already tracks `generateJobId` — pass the real value through.

**Open question — resolved:** whether a returning user can skip the Confirm step. **Decision (confirmed
with Bruno 2026-09-04): no skip.** The gate stays unconditional for every visit. There's no
account/session concept to hang a "don't ask again" preference on, and the step exists specifically as
cost control in front of a paid LLM call — the same reasoning the original spec used to insist on
keeping the gate at all.

---

## Motion architecture — the central decision

**Constraint from the handoff:** the record ring, the scene band, and the pipeline strip must never
unmount across Landing → Confirm → Processing → Chronicle. Everything else (headline, carousel,
transcript field, chronicle text) may still mount/unmount per stage — the handoff's own timing table
lists "card mount" as an animated 280ms transition, meaning step cards are expected to mount fresh, not
persist.

**Approaches considered:**

- **A — Everything always mounted, all four steps' markup in the DOM simultaneously,** visibility/layout
  driven by a `data-step` attribute. Rejected: fights the design's own "card mount" transition, and
  creates an accessibility problem (hidden panels stay in the tab order unless carefully `inert`ed).
- **B — Persistent chrome, swapping cards (chosen).** Only the three named elements
  (`RecordRing`, a new `SceneBand`, a new `PipelineStrip`) live above the per-stage conditional, in
  `App.tsx`, positioned via geometry keyed on `stage`. Everything else keeps the existing mount/unmount
  pattern, wrapped in the existing `components/ui/card.tsx` with a 280ms fade/lift-in instead of an
  abrupt cut. This is close to verbatim what the handoff's own "Implementation notes" describe (the
  wrapper spanning scene band + card, the 34px slot math) — a specified problem, not an open one — and
  it's a bounded migration: most existing Views keep their current internal shape.
- **C — Native View Transitions API** (`document.startViewTransition`). Rejected: inconsistent Safari
  support for a public demo, and it layers a second animation system on top of Tailwind's explicit
  transitions, working against the handoff's "one curve everywhere" rule.

**Chosen: B.**

---

## File / component breakdown

```
apps/web/src/
  App.tsx                  # becomes the actual shell — renders SceneBand, RecordRing, PipelineStrip
                            # at the top level (not per-view), plus a swapped Card region for
                            # step-specific content, all keyed off presenter.stage
  views/
    SceneBand.tsx           # NEW — scene layer + two scrims + caption, extracted from LandingView.
                             # Only `height` (420 -> 260 -> 128px) is stage-driven. scenes.ts / theme.ts
                             # reused unchanged.
    PipelineStrip.tsx       # NEW — extracted from ProcessingView's stage rows. Mounts on Confirm
                             # (transcribe done, rewrite reads "waiting for you" over a dashed track),
                             # stays through Processing, collapses (height -> 0) on Chronicle.
                             # Owns the per-stage 'failed'/'blocked' row rendering (error state #3).
    RecordRing.tsx           # REWORKED — takes `slot: 'hero' | 'timer' | 'marker'` driving geometry
                             # (200px control -> 228px timer -> 34px header marker) and position;
                             # internals swap live control -> static status marker on arrival.
                             # micError path gets the "no animation while blocked" treatment + icon swap.
    ConfirmView.tsx          # REPLACES ReviewStep.tsx — gate-not-form: read-only default, Edit toggle,
                             # held pipeline strip via PipelineStrip, "step 2 of 3".
    ProcessingView.tsx       # slimmed — stage rows move into PipelineStrip; keeps the log block.
    ChronicleView.tsx        # tab strip + player bar (play button, 44-bar waveform) added; title slot
                             # dropped per reconciliation #2; jobId threaded through per #6.
    LandingView.tsx          # slimmed — scene band and ring extracted out to the shared shell.
    EmptyStateShell.tsx      # REUSED — already implements expired/generic states close to spec;
                             # needs Phosphor icon swap (currently hand-rolled SVGs) and jobId wiring.
    NoticeCard.tsx           # extended for the invalid-upload rejected-file strip (error state #2).
  lib/
    icons/                  # NEW — inlined Phosphor SVGs on currentColor: microphone-slash,
                             # upload-simple, warning-circle, clock-counter-clockwise, pencil-simple, play/pause.
  index.css                 # + --accent-line token, error-aware focus-visible rule, five new
                             # --dur-* custom properties (see Motion timing below).
```

**Flavour state flow** — unchanged. `useChroniclePresenter` still owns `selectedFlavour`; `App.tsx`
already computes `theme`/`data-flavour` once and passes it down. `SceneBand` and `RecordRing`, now
living in the shared shell instead of inside `LandingView`, receive `theme` as a prop the same way. No
new state.

**Motion timing — CSS-first, one source of truth.** Rather than the prototype's JS timing object,
extend the existing `recpulse`/`ringout` convention (already CSS custom properties + a
`prefers-reduced-motion` override in `index.css`): add `--dur-ring` (520ms), `--dur-scene` (440ms),
`--dur-copy` (280ms), `--dur-stag` (340ms), `--dur-bar` (700ms), all using the existing
`cubic-bezier(.22,.8,.26,1)` curve, redefined to `120ms linear` (stagger delays to `0ms`) inside the
existing `@media (prefers-reduced-motion: reduce)` block. Components reference these via
`transition-duration: var(--dur-x)` rather than hardcoded values, so the reduced-motion path can't drift
by construction — same guarantee the handoff asks for, without introducing a parallel JS mechanism this
codebase doesn't otherwise use.

---

## Error & edge states

All five map onto the breakdown above rather than needing new top-level components:

| State | Where it lives |
| --- | --- |
| Mic permission denied | `RecordRing` (`micError` prop, already exists — needs icon swap + no-animation) |
| Invalid upload | `NoticeCard` (already exists — needs the rejected-file strip) |
| Failed pipeline stage | `PipelineStrip` (new `failed`/`blocked` row states + detail block + per-stage retry, matching the table in the handoff's §3) |
| Expired job | `EmptyStateShell` (already exists, `kind="expired"`) |
| Generic/unexpected failure | `EmptyStateShell` (already exists, `kind="generic"`) |

Icons move from the current hand-rolled inline SVGs to actual Phosphor glyphs (stroke weight 16, 256
viewBox, round caps/joins) per the handoff's explicit requirement — a small, mechanical swap, not a
redesign of these components.

---

## Testing

- **Vitest/RTL:** `SceneBand`, `PipelineStrip`, and the reworked `RecordRing` (assert geometry/props per
  `slot`/`stage`), `ConfirmView`'s read-only/Edit toggle behavior, error-state row rendering in
  `PipelineStrip`.
- **Playwright:** the existing E2E suite (`tests/web/full-journey.spec.ts`) gets a new assertion that
  the record ring is the *same DOM node* (not remounted) across Landing → Confirm → Processing, not just
  a visual check. Existing `data-testid`s carry over; new ones added for `SceneBand`/`PipelineStrip` as
  needed.

---

## Scope

**In scope:** the Confirm view, the five error/edge states, the motion/persistence architecture
described above, and the reconciliation fixes (retell behavior confirmed unchanged, `--accent-line`
token, error-aware focus ring, `jobId` threading, client-derivable duration/word-count).

**Explicitly out of scope:**
- Any backend change (chronicle title field, language detection, real retell regeneration) — all three
  reconciliation gaps above are resolved by dropping/simplifying the frontend requirement, not by
  extending `apps/api`.
- Real narrator artwork for the carousel cards — placeholders stay marked as placeholders per the
  handoff's explicit instruction.

**Additive, not part of this design decision (implementation detail for the plan, not scoped out):**
drag/swipe on the carousel and keyboard-arrow navigation are requirements the handoff calls out as
production additions over the prototype. They land inside `NarratorCarousel.tsx` independently of the
motion/persistence architecture above — a normal implementation task, not something this design needs
to resolve.

---

## Success criteria

- The ring, scene band, and pipeline strip are verifiably the same DOM node across every stage
  transition (Playwright identity check, not just a visual diff).
- All five error/edge states render per the handoff's exact specs (colors, copy, retry semantics per
  stage).
- `prefers-reduced-motion: reduce` collapses every listed transition to the single reduced set, driven
  by the shared `--dur-*` tokens — no per-component reduced-motion branching.
- Confirm step is unconditional for every visit (no skip-preference feature built).
- Retell pills still redirect to Landing (unchanged from the prior spec).
- No backend route, schema, or pipeline logic changes.
