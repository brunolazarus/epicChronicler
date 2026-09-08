# Web Frontend Motion & Confirm-Step Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/web`'s pipeline flow (Landing → Confirm → Processing → Chronicle) as one persistent element tree whose CSS changes per step, add the designed Confirm view and the five error/edge states, and drive all cross-step motion from a single reduced-motion-safe source.

**Architecture:** "Persistent chrome, swapping cards." Three elements — the record ring, the scene band, the pipeline strip — are hoisted out of the per-stage views into a shell in `App.tsx` and never unmount; their geometry is driven by a `data-stage` attribute + CSS custom properties. Everything else keeps the existing mount/unmount-per-stage pattern, wrapped in the existing `Card` primitive with a fade/lift-in. Motion durations live as `--dur-*` CSS custom properties in `index.css` with one `prefers-reduced-motion` override block.

**Tech Stack:** React 18 + Vite 5, TypeScript ESM (all relative imports use `.js` extensions even for `.ts`/`.tsx` sources — Node ESM requirement), TanStack Query v5, Tailwind v4 (`@theme`/`@theme inline`, utility classes, no CSS-in-JS, no `tailwind.config.js`), shadcn-style primitives in `apps/web/src/components/ui/`, `cn()` from `apps/web/src/lib/utils.js`, `@phosphor-icons/react` (added in Task 2), Vitest + React Testing Library, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-09-04-web-frontend-motion-design.md` — read it before starting. The design handoff it implements is at `docs/standards/transitions-handoff/design_handoff_epic_chronicler/` (gitignored; `README.md` there is the value source of truth, the `epic-chronicler-*.html` bundles are the visual targets — open them in a browser).

## Global Constraints

- **No backend changes.** No route, Zod schema, pipeline, or worker change in `apps/api` or `packages/core`. Every gap is resolved on the frontend by simplifying the requirement.
- **Retell pills redirect to Landing** (`retellAs` → full reset). Not real regeneration. Unchanged from today.
- **Confirm step is unconditional** — every visit passes through it. No "skip"/"don't ask again" preference.
- **No chronicle title element** — the narrator-name kicker is the only heading above the chronicle body.
- **No `detectedLanguages` UI** — the transcript/confirm footers show only duration + word count.
- **One easing everywhere:** `cubic-bezier(.22,.8,.26,1)`. Never introduce a second curve.
- **Motion durations (non-reduced):** ring travel/size `520ms`, scene-band height `440ms`, copy fade/lift + card mount `280ms`, chronicle stagger `340ms`, pipeline bar fill `700ms`. Reduced-motion: all `120ms linear`, stagger delays `0ms`, `recpulse`/`ringout`/edit-caret stopped.
- **Forward rises, back falls:** step content enters with 20px vertical travel + fade. Never a horizontal slide.
- **Errors get no motion:** 120ms opacity only, no travel, no stagger, in every state.
- **Icons are Phosphor**, rendered inline as SVG inheriting `currentColor`. The six used: `microphone-slash`, `upload-simple`, `warning-circle`, `clock-counter-clockwise`, `pencil-simple`, plus `play`/`pause` for the player.
- **Focus:** 2px `:focus-visible` ring, 2px offset, on every interactive element — accent by default, **error** red on error-outlined controls.
- **Flavour accents** are `oklch(0.734 …)` bases with `color-mix` derived `soft` (20%), `ghost` (9%), `line` (34%) variants. Never hardcode a mixed value. Error red is the fixed `oklch(0.734 0.155 25)` / text `oklch(0.86 0.09 25)`, independent of flavour.
- **Upload limit 25 MB; formats webm, mp3, m4a, wav, ogg** (already enforced client + server — do not change).
- **Carousel card art stays a marked placeholder.** No emoji/icon/generated-SVG substitution.
- **Scene stage is a fixed 900×300 coordinate space** scaled as a whole. Never make individual shapes responsive.
- Tests live under a `test/` folder beside the code (`apps/web/src/views/test/Foo.test.tsx`), matching the existing layout.

---

## File Structure

**New files:**
- `apps/web/src/lib/icons.tsx` — re-exports the Phosphor glyphs the app uses, with project defaults.
- `apps/web/src/views/SceneBand.tsx` — scene shape stack + two scrims + caption; `height` driven by stage.
- `apps/web/src/views/PipelineStrip.tsx` — the three-stage progress rows + per-stage failure detail block; owns the `PipelineStage` type. Persistent across Confirm → Processing → Chronicle.
- `apps/web/src/views/ConfirmView.tsx` — replaces `ReviewStep.tsx`; read-only-by-default transcript gate with an Edit toggle.
- test files beside each of the above.

**Modified files:**
- `apps/web/src/index.css` — add `--accent-line` per flavour, `--dur-*` tokens + reduced-motion overrides, error-aware focus ring, ring-geometry custom properties per `[data-stage]`.
- `apps/web/src/App.tsx` — becomes the shell: renders `SceneBand` + a ring-travel wrapper + `PipelineStrip` above a swapped `Card` region; scroll-to-top on stage change.
- `apps/web/src/views/RecordRing.tsx` — add `slot: 'hero' | 'timer' | 'marker'` prop; internal control→marker swap; Phosphor mic-slash + no-animation while blocked.
- `apps/web/src/views/LandingView.tsx` — drop the inline scene band + ring; render just header, copy, carousel, sample card.
- `apps/web/src/views/ProcessingView.tsx` — drop the inline stage rows (now `PipelineStrip`); keep the log block + header strip.
- `apps/web/src/views/ChronicleView.tsx` — add tab strip + custom player bar (play/pause + 44-bar waveform); derive word count; thread real `jobId`; no title element.
- `apps/web/src/views/NoticeCard.tsx` — split `detail` into a filename · offending-value · limit strip.
- `apps/web/src/views/EmptyStateShell.tsx` — swap hand-rolled SVGs for Phosphor; take a real `jobId`.
- `apps/web/src/views/NarratorCarousel.tsx` — clickable dots + keyboard arrow navigation.
- `apps/web/src/presenters/useChroniclePresenter.ts` — expose `jobId`; capture recording duration; rename `confirmTranscript` stays, add `recordingSeconds`.
- `apps/web/src/App.tsx` test (`apps/web/src/test/App.test.tsx`) and `tests/web/full-journey.spec.ts` — updated for the Confirm view and ring persistence.
- Delete `apps/web/src/views/ReviewStep.tsx` + `apps/web/src/views/test/ReviewStep.test.tsx` (replaced by ConfirmView).

---

## Task 1: Motion tokens, accent-line, error-aware focus ring

**Files:**
- Modify: `apps/web/src/index.css`
- Test: `apps/web/src/test/motion-tokens.test.ts` (create)

**Interfaces:**
- Produces: CSS custom properties available anywhere in `apps/web`:
  `--dur-ring`, `--dur-scene`, `--dur-copy`, `--dur-stag`, `--dur-bar` (all `<time> cubic-bezier(.22,.8,.26,1)` shaped as a **duration only** — the easing is applied separately as `--ease`), `--ease`, `--stag-delay`, and per-`[data-flavour]` `--accent-line`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

`apps/web/src/test/motion-tokens.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

describe('index.css motion + accent tokens', () => {
  it('defines the five motion duration tokens and the shared easing', () => {
    for (const t of ['--dur-ring', '--dur-scene', '--dur-copy', '--dur-stag', '--dur-bar', '--ease']) {
      expect(css).toContain(t)
    }
  })

  it('sets the non-reduced durations to the spec values', () => {
    expect(css).toMatch(/--dur-ring:\s*520ms/)
    expect(css).toMatch(/--dur-scene:\s*440ms/)
    expect(css).toMatch(/--dur-copy:\s*280ms/)
    expect(css).toMatch(/--dur-stag:\s*340ms/)
    expect(css).toMatch(/--dur-bar:\s*700ms/)
    expect(css).toMatch(/--ease:\s*cubic-bezier\(\.22,\s*\.8,\s*\.26,\s*1\)/)
  })

  it('collapses every duration and the stagger unit inside the reduced-motion block', () => {
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
    for (const t of ['--dur-ring', '--dur-scene', '--dur-copy', '--dur-stag', '--dur-bar']) {
      expect(reduced).toMatch(new RegExp(`${t}:\\s*120ms`))
    }
    expect(reduced).toMatch(/--stag-delay:\s*0ms/)
  })

  it('defines --stag-delay as a real time value', () => {
    expect(css).toMatch(/--stag-delay:\s*80ms/)
  })

  it('derives --accent-line as a 34% color-mix for every flavour', () => {
    expect(css).toMatch(/--accent-line:\s*color-mix\(in srgb,\s*var\(--accent\)\s*34%/)
  })

  it('gives error-outlined controls an error-coloured focus ring', () => {
    expect(css).toMatch(/\[data-error-control\][^{]*:focus-visible/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- motion-tokens`
Expected: FAIL — tokens not present.

- [ ] **Step 3: Implement**

In `apps/web/src/index.css`:

In the `@layer base { :root { … } }` block, after the existing `--accent-*` lines, add:

```css
    --accent-line: color-mix(in srgb, var(--accent) 34%, transparent);

    --ease: cubic-bezier(.22, .8, .26, 1);
    --stag-delay: 80ms;
    --dur-ring: 520ms;
    --dur-scene: 440ms;
    --dur-copy: 280ms;
    --dur-stag: 340ms;
    --dur-bar: 700ms;
```

In the existing `[data-flavour] { … }` block (the one that re-derives `--accent-soft`/`--accent-ghost`), add:

```css
    --accent-line: color-mix(in srgb, var(--accent) 34%, transparent);
```

Change the focus-visible rule from the single `:where(a, button, [role="button"], input, textarea, select):focus-visible` selector to two rules:

```css
  :where(a, button, [role="button"], input, textarea, select):not([data-error-control]):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  [data-error-control]:focus-visible {
    outline: 2px solid var(--error);
    outline-offset: 2px;
  }
```

In the existing `@media (prefers-reduced-motion: reduce) { … }` block, alongside the `animation: none` rule, add a `:root` override:

```css
  :root {
    --dur-ring: 120ms;
    --dur-scene: 120ms;
    --dur-copy: 120ms;
    --dur-stag: 120ms;
    --dur-bar: 120ms;
    --stag-delay: 0ms;
  }
```

Note: `--stag-delay` is the per-index stagger unit — `80ms` normally, `0ms` under reduced motion. Staggered elements set `--stagger-index: 0 | 1 | 2 | 3` and use `animation-delay: calc(var(--stagger-index) * var(--stag-delay))`. A `0ms` unit zeroes every stagger delay at once.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- motion-tokens`
Expected: PASS.

- [ ] **Step 5: Verify nothing else regressed**

Run: `pnpm --filter web test` then `pnpm --filter web build`
Expected: all green, build clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/index.css apps/web/src/test/motion-tokens.test.ts
git commit -m "feat(web): add motion duration tokens, --accent-line, error-aware focus ring"
```

---

## Task 2: Phosphor icon module

**Files:**
- Create: `apps/web/src/lib/icons.tsx`
- Modify: `apps/web/package.json` (add dependency)
- Test: `apps/web/src/lib/test/icons.test.tsx` (create)

**Interfaces:**
- Produces: named React components `MicrophoneSlashIcon`, `UploadSimpleIcon`, `WarningCircleIcon`, `ClockCounterClockwiseIcon`, `PencilSimpleIcon`, `PlayIcon`, `PauseIcon`. Each takes `{ size?: number; weight?: 'regular' | 'bold'; className?: string }`, renders an inline `<svg>` with `fill="currentColor"`, default `size={18}`, default `weight="regular"`.

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter web add @phosphor-icons/react@^2.1.7
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/lib/test/icons.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MicrophoneSlashIcon, WarningCircleIcon, PlayIcon } from '../icons.js'

describe('icons', () => {
  it('renders an inline svg that inherits currentColor', () => {
    const { container } = render(<WarningCircleIcon />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg!.getAttribute('fill')).toBe('currentColor')
  })

  it('honours the size prop', () => {
    const { container } = render(<MicrophoneSlashIcon size={34} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('34')
    expect(svg.getAttribute('height')).toBe('34')
  })

  it('exports a play glyph', () => {
    const { container } = render(<PlayIcon />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter web test -- icons`
Expected: FAIL — `../icons.js` does not exist.

- [ ] **Step 4: Implement**

`apps/web/src/lib/icons.tsx`:

```tsx
import {
  MicrophoneSlash,
  UploadSimple,
  WarningCircle,
  ClockCounterClockwise,
  PencilSimple,
  Play,
  Pause,
  type IconProps,
} from '@phosphor-icons/react'

type Props = Pick<IconProps, 'size' | 'weight' | 'className'>

const defaults = { size: 18, weight: 'regular' } as const

export const MicrophoneSlashIcon = (p: Props) => <MicrophoneSlash {...defaults} {...p} />
export const UploadSimpleIcon = (p: Props) => <UploadSimple {...defaults} {...p} />
export const WarningCircleIcon = (p: Props) => <WarningCircle {...defaults} {...p} />
export const ClockCounterClockwiseIcon = (p: Props) => <ClockCounterClockwise {...defaults} {...p} />
export const PencilSimpleIcon = (p: Props) => <PencilSimple {...defaults} {...p} />
export const PlayIcon = (p: Props) => <Play {...defaults} weight="fill" {...p} />
export const PauseIcon = (p: Props) => <Pause {...defaults} weight="fill" {...p} />
```

Note: `@phosphor-icons/react` renders `<svg ... fill="currentColor">` by default, satisfying the "inherits currentColor" requirement. If the test's `fill` assertion fails because the library puts `currentColor` somewhere else in that version, adjust the test to assert `svg.querySelector('[fill="currentColor"], path[fill="currentColor"]')` is present OR that no explicit non-`currentColor` fill is set — the requirement is "takes its colour from the text around it", verify that holds.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter web test -- icons`
Expected: PASS.

- [ ] **Step 6: Build check**

Run: `pnpm --filter web build`
Expected: clean (confirms the dependency resolves and tree-shakes).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/icons.tsx apps/web/src/lib/test/icons.test.tsx pnpm-lock.yaml
git commit -m "feat(web): add Phosphor icon module"
```

---

## Task 3: Extract SceneBand

Behaviour-preserving refactor: pull the hero scene layer, its two scrims, and the caption out of `LandingView` into a standalone component whose only stage-driven property is `height`.

**Files:**
- Create: `apps/web/src/views/SceneBand.tsx`
- Create: `apps/web/src/views/test/SceneBand.test.tsx`
- Modify: `apps/web/src/views/LandingView.tsx:119-170` (remove the inline scene band; render `<SceneBand>` instead — see note)

**Interfaces:**
- Consumes: `buildScene` from `apps/web/src/scenes.js`, `getFlavourTheme` from `apps/web/src/theme.js`.
- Produces:
  ```ts
  type SceneStage = 'landing' | 'confirm' | 'processing' | 'result'
  function SceneBand(props: { flavourKey: string; stage: SceneStage; children?: React.ReactNode }): JSX.Element
  ```
  Band heights by stage: `landing` 420px, `confirm` 260px, `processing` 260px, `result` 128px. Renders `data-testid="scene-band"` on the outer element. `overflow: hidden` on the band. Height transition: `transition: height var(--dur-scene) var(--ease)`. The scene shape stack scales as one unit from origin `50% 30%`, scale `1.4` (unchanged from today's LandingView). The caption ("the dungeon — …", from `getFlavourTheme(key).sceneLabel`) is absolutely positioned bottom-right and hidden below the `md` breakpoint, unchanged from today.

- [ ] **Step 1: Write the failing test**

`apps/web/src/views/test/SceneBand.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SceneBand } from '../SceneBand.js'

describe('SceneBand', () => {
  it('renders the scene shape stack for the given flavour', () => {
    const { container } = render(<SceneBand flavourKey="fantasy" stage="landing" />)
    // scenes.ts emits many absolutely-positioned divs; assert a non-trivial count
    expect(container.querySelectorAll('div').length).toBeGreaterThan(20)
  })

  it('sets the band height per stage', () => {
    const { rerender } = render(<SceneBand flavourKey="medieval" stage="landing" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '420px' })
    rerender(<SceneBand flavourKey="medieval" stage="processing" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '260px' })
    rerender(<SceneBand flavourKey="medieval" stage="result" />)
    expect(screen.getByTestId('scene-band')).toHaveStyle({ height: '128px' })
  })

  it('shows the flavour scene caption', () => {
    render(<SceneBand flavourKey="nature" stage="landing" />)
    expect(screen.getByText(/the jungle/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- SceneBand`
Expected: FAIL — `../SceneBand.js` missing.

- [ ] **Step 3: Implement `SceneBand.tsx`**

Move the JSX currently at `LandingView.tsx` lines ~146–170 (the `relative mx-auto max-w-[1280px] overflow-hidden md:h-[420px]` block, its scene-shape `.map`, the two scrim divs, and the caption at ~226–228) into the new component. Replace the fixed `md:h-[420px]` with an inline `style={{ height }}` where `height` is chosen from a `const BAND_HEIGHT: Record<SceneStage, string>` map, and add `transition: height var(--dur-scene) var(--ease)` via inline style or a utility. Put `data-testid="scene-band"` on the outer element. Keep the `hidden md:block` wrapper around the scaled shape stack and keep the caption exactly as-is. Accept `children` and render them in the content-grid position (Task 6 passes the hero copy grid through as children on `landing`; other stages pass nothing).

```tsx
import { buildScene } from '../scenes.js'
import { getFlavourTheme } from '../theme.js'
import type { FlavourKey } from '../theme.js'

export type SceneStage = 'landing' | 'confirm' | 'processing' | 'result'

const BAND_HEIGHT: Record<SceneStage, string> = {
  landing: '420px',
  confirm: '260px',
  processing: '260px',
  result: '128px',
}

export function SceneBand({ flavourKey, stage, children }: {
  flavourKey: string
  stage: SceneStage
  children?: React.ReactNode
}) {
  const theme = getFlavourTheme(flavourKey)
  const scene = buildScene((flavourKey as FlavourKey))
  return (
    <div
      data-testid="scene-band"
      className="relative mx-auto max-w-[1280px] overflow-hidden"
      style={{ height: BAND_HEIGHT[stage], transition: 'height var(--dur-scene) var(--ease)' }}
    >
      <div className="hidden md:block">
        <div className="pointer-events-none absolute left-1/2 top-[30%] h-[300px] w-[900px] origin-[50%_30%] -translate-x-1/2 -translate-y-[30%] scale-[1.15] lg:scale-[1.4]">
          {scene.map((s, i) => (
            <div key={i} className="absolute" style={{
              left: s.l, top: s.t, width: s.w, height: s.h, background: s.bg,
              borderRadius: s.r, boxShadow: s.sh, transform: s.tf, opacity: s.o, filter: s.fl,
            }} />
          ))}
        </div>
        <div className="absolute inset-0 [background:linear-gradient(90deg,rgba(10,11,16,.88)_0%,rgba(10,11,16,.6)_46%,transparent_72%)]" />
        <div className="absolute inset-0 [background:linear-gradient(180deg,transparent_60%,rgba(22,24,38,.85)_100%)]" />
      </div>
      {children}
      <div className="pointer-events-none absolute bottom-3.5 right-6 hidden text-right font-mono text-[10px] tracking-[.08em] text-fg/50 md:right-12 md:block">
        {theme.sceneLabel}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Point LandingView at it**

In `LandingView.tsx`, replace the removed block with `<SceneBand flavourKey={theme.key} stage="landing">{/* the existing content grid: kicker, h1, body, "or upload a file", and the right-column RecordRing branch */}</SceneBand>`. Keep the content-grid `<div className="relative grid …">` as the child. Leave everything else in LandingView (header, carousel, sample card) untouched for now — Task 6 removes the ring from here.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web test -- SceneBand LandingView`
Expected: PASS (LandingView's existing tests still pass — output is visually identical).

- [ ] **Step 6: Visual check**

Run `pnpm dev:all` + `pnpm --filter web dev`, open `http://localhost:5173`, compare the hero against `epic-chronicler-landing.html`. Should be pixel-identical on Landing.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/views/SceneBand.tsx apps/web/src/views/test/SceneBand.test.tsx apps/web/src/views/LandingView.tsx
git commit -m "refactor(web): extract SceneBand from LandingView, height per stage"
```

---

## Task 4: Extract PipelineStrip

Pull the three stage rows and the per-stage failure detail block out of `ProcessingView` into a standalone component. This becomes the persistent element in Task 6.

**Files:**
- Create: `apps/web/src/views/PipelineStrip.tsx`
- Create: `apps/web/src/views/test/PipelineStrip.test.tsx`
- Modify: `apps/web/src/views/ProcessingView.tsx` (render `<PipelineStrip>` in place of the inline rows; keep header strip + log block)
- Modify: `apps/web/src/presenters/useChroniclePresenter.ts` (import `PipelineStage` from the new file instead of defining it locally / importing from ProcessingView)

**Interfaces:**
- Produces:
  ```ts
  type StageKey = 'transcribe' | 'rewrite' | 'narrate'
  type StageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked' | 'held'
  interface PipelineStage { key: StageKey; status: StageStatus; pct: number }

  function PipelineStrip(props: {
    stages: PipelineStage[]
    transcriptionMs: number | null
    generateError: string | null
    onRetry: () => void
    collapsed?: boolean          // result stage: height -> 0
  }): JSX.Element
  ```
  Renders `data-testid="pipeline-strip"`. Row anatomy unchanged from today's ProcessingView (label left, status right, 2px track below). New `held` status: status text `waiting for you`, track rendered as a **dashed** `repeating-linear-gradient(90deg, #3f424d 0 5px, transparent 5px 10px)`, no fill. `blocked` rows read `blocked` in `#9397ab` with an empty track. `failed` rows freeze the fill at `pct` in `--error` with `0 0 10px --error` and show the detail block (existing markup) with the retry button. Bar-fill transition: `transition: width var(--dur-bar) var(--ease)`. When `collapsed`, outer element animates `height` to `0` with `overflow: hidden` and `transition: height var(--dur-scene) var(--ease)`.
- Consumes: `Button` from `@/components/ui/button.js`, `WarningCircleIcon` from `@/lib/icons.js`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/views/test/PipelineStrip.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PipelineStrip } from '../PipelineStrip.js'

const base = { transcriptionMs: 1800, generateError: null, onRetry: vi.fn() }

describe('PipelineStrip', () => {
  it('renders a held rewrite row that says it is waiting for the user', () => {
    render(<PipelineStrip {...base} stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'held', pct: 0 },
      { key: 'narrate', status: 'queued', pct: 0 },
    ]} />)
    expect(screen.getByText('waiting for you')).toBeInTheDocument()
  })

  it('freezes a failed row and offers a stage-specific retry', async () => {
    const onRetry = vi.fn()
    render(<PipelineStrip {...base} onRetry={onRetry} generateError="upstream 529" stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'failed', pct: 62 },
      { key: 'narrate', status: 'blocked', pct: 0 },
    ]} />)
    expect(screen.getByText('failed at 62%')).toBeInTheDocument()
    expect(screen.getByText('blocked')).toBeInTheDocument()
    expect(screen.getByText('upstream 529')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Retry rewrite'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('collapses to zero height on the result stage', () => {
    render(<PipelineStrip {...base} collapsed stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'done', pct: 100 },
      { key: 'narrate', status: 'done', pct: 100 },
    ]} />)
    expect(screen.getByTestId('pipeline-strip')).toHaveStyle({ height: '0px' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- PipelineStrip`
Expected: FAIL — file missing.

- [ ] **Step 3: Implement `PipelineStrip.tsx`**

Move the `stages.map(...)` block (`ProcessingView.tsx:54-99`) and its `STAGE_LABEL` / `STAGE_ERROR_TITLE` / `STAGE_RETRY_LABEL` maps into the new file. Add `held` handling to `statusText` (`'waiting for you'`) and to the track rendering (dashed gradient, no fill). Keep `blocked`/`failed`/`done`/`active`/`queued` exactly as today. Wrap the rows in an outer `div` with `data-testid="pipeline-strip"`, and when `collapsed` set `style={{ height: 0, overflow: 'hidden', transition: 'height var(--dur-scene) var(--ease)' }}`. Apply `transition: width var(--dur-bar) var(--ease)` to the fill div's style. Swap the failure detail block's title icon to `<WarningCircleIcon size={16} />`. Add `data-error-control` to the retry `<Button>` so it gets the error focus ring (Task 1).

- [ ] **Step 4: Rewire ProcessingView + presenter**

`ProcessingView.tsx`: import `PipelineStrip` + `PipelineStage`; delete the moved maps and the inline rows; render `<PipelineStrip stages={stages} transcriptionMs={transcriptionMs} generateError={generateError} onRetry={onRetry} />` inside the existing card body, above the log block. Keep the header strip and log block. Re-export `PipelineStage` from ProcessingView is removed; update its own imports.

`useChroniclePresenter.ts`: change `import type { PipelineStage } … from '../views/ProcessingView.js'` (or the local `interface PipelineStage`) to `import type { PipelineStage } from '../views/PipelineStrip.js'`. The presenter's `PipelineStageStatus` local type gains `'held'`. No logic change yet — `held` is produced in Task 8.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web test -- PipelineStrip ProcessingView useChroniclePresenter`
Expected: PASS. (ProcessingView's existing failing-rewrite test now exercises `PipelineStrip` through it.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/PipelineStrip.tsx apps/web/src/views/test/PipelineStrip.test.tsx apps/web/src/views/ProcessingView.tsx apps/web/src/presenters/useChroniclePresenter.ts
git commit -m "refactor(web): extract PipelineStrip; add held stage status"
```

---

## Task 5: RecordRing slots

Add the `slot` prop that drives the ring's size and internal composition. Position is set by the parent (Task 6) — this task only makes the ring render correctly at each of the three sizes and swap its innards.

**Files:**
- Modify: `apps/web/src/views/RecordRing.tsx`
- Modify: `apps/web/src/views/test/RecordRing.test.tsx`

**Interfaces:**
- Consumes: `MicrophoneSlashIcon` from `@/lib/icons.js`, `Button` from `@/components/ui/button.js`.
- Produces (extends today's props):
  ```ts
  function RecordRing(props: {
    slot: 'hero' | 'timer' | 'marker'
    micError: boolean
    isRecording: boolean
    elapsedLabel?: string        // shown in the 'timer' slot, e.g. "0:12"
    pipelineLive?: boolean       // 'marker' slot: dot takes recpulse while true, still otherwise
    onStart: () => void
    onStop: () => void
    onUploadInstead: () => void
    onRetryMic: () => void
  }): JSX.Element
  ```
  - `slot="hero"`: today's 200×200 control, five layers, "RECORD"/"Stop" label, `recpulse` dot, `ringout` outer ring. Clickable (start/stop). Keeps `data-testid="btn-record"`.
  - `slot="timer"`: 228×228, same five layers, label is `elapsedLabel`, still clickable to stop. `data-testid="btn-record"` retained (it is still the stop control).
  - `slot="marker"`: 34×34. Outer + middle rings at `opacity: 0`, no `ringout`, core inset → 0, glow `0 0 14px` accent, a single accent dot at `inset: 33%`. The dot takes `animate-recpulse` when `pipelineLive`, none otherwise. Not clickable, `role`/`tabIndex` removed, no `data-testid="btn-record"`.
  - `micError` (any slot, but only reachable on `hero`): bloom→`--error-soft`, outer ring `1px dashed --error-line` **no animation**, middle ring `--error-line`, core error values, centre is `<MicrophoneSlashIcon size={30} />` (static), label "MIC BLOCKED" in `--error-text`. The notice card below is unchanged except: its "Try again" button gets `data-error-control`.
  - The whole ring must accept a `style` prop passthrough so Task 6 can set `left/top/width/height` + the travel transition on the outer element.

- [ ] **Step 1: Update the test**

Replace `apps/web/src/views/test/RecordRing.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordRing } from '../RecordRing.js'

const noop = { onStart: vi.fn(), onStop: vi.fn(), onUploadInstead: vi.fn(), onRetryMic: vi.fn() }

describe('RecordRing', () => {
  it('hero slot: starts recording on click', async () => {
    const onStart = vi.fn()
    render(<RecordRing slot="hero" micError={false} isRecording={false} {...noop} onStart={onStart} />)
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStart).toHaveBeenCalled()
  })

  it('timer slot: shows the elapsed label and stops on click', async () => {
    const onStop = vi.fn()
    render(<RecordRing slot="timer" micError={false} isRecording elapsedLabel="0:12" {...noop} onStop={onStop} />)
    expect(screen.getByText('0:12')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStop).toHaveBeenCalled()
  })

  it('marker slot: is not an interactive control', () => {
    render(<RecordRing slot="marker" micError={false} isRecording={false} pipelineLive {...noop} />)
    expect(screen.queryByTestId('btn-record')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mic blocked: renders the slash icon, MIC BLOCKED label, and no ring animation', () => {
    const { container } = render(<RecordRing slot="hero" micError isRecording={false} {...noop} />)
    expect(screen.getByText('MIC BLOCKED')).toBeInTheDocument()
    expect(container.querySelector('.animate-ringout')).toBeNull()
    expect(container.querySelector('.animate-recpulse')).toBeNull()
  })

  it('mic blocked: wires Try again / Upload a file', async () => {
    const onRetryMic = vi.fn(); const onUploadInstead = vi.fn()
    render(<RecordRing slot="hero" micError isRecording={false} {...noop} onRetryMic={onRetryMic} onUploadInstead={onUploadInstead} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onRetryMic).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Upload a file'))
    expect(onUploadInstead).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- RecordRing`
Expected: FAIL — no `slot` prop, marker/timer behaviour absent.

- [ ] **Step 3: Implement**

Rework `RecordRing.tsx`:
- Add `slot`, `elapsedLabel`, `pipelineLive`, and `...rest` (spread onto the outer element for `style`).
- `const SIZE = { hero: 200, timer: 228, marker: 34 }[slot]` — apply to the outer sizing (replace the `clamp()` width/height for hero with `clamp(160px,44vw,200px)` still, but for `timer`/`marker` use fixed `SIZE`).
- **Keep the same five-layer structure for all three slots** — the ring is one element that morphs, not three subtrees (spec: "The ring is a single element... never unmounted or re-created"). Parametrize each layer's CSS by `slot`. For `marker` (34px): outer ring + middle ring `opacity: 0` and no `animate-ringout`; core collapsed (`inset: 0`) on `bg-abyss/55` with `boxShadow: 0 0 14px var(--accent)` (the reduced glow); the centre dot (fifth layer, `inset-1/3 rounded-full bg-accent`, `boxShadow: 0 0 14px var(--accent)`) is the visible element, `animate-recpulse` when `pipelineLive` else none. Marker stays non-interactive: no `role`, no `tabIndex`, no `data-testid="btn-record"`, no notice card. Hero/timer keep the layers fully visible as today.
- `hero`/`timer` differ only by `SIZE` and label text (`slot === 'timer' ? elapsedLabel : isRecording ? 'Stop' : 'RECORD'`). Both keep `data-testid="btn-record"`, `role="button"`, click → `isRecording ? onStop : onStart`.
- `micError` branch: as today but replace the `⦸` glyph span with `<MicrophoneSlashIcon size={30} />`, and confirm the outer ring class is `border-dashed border-error-line` with **no** `animate-ringout` (today's code already omits the animation in the error branch — keep that). Add `data-error-control` to the "Try again" `<Button>`.
- Marker slot renders no notice card regardless of `micError` (mic errors only happen on `hero`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- RecordRing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/RecordRing.tsx apps/web/src/views/test/RecordRing.test.tsx
git commit -m "feat(web): RecordRing slot prop (hero/timer/marker) + Phosphor mic-slash"
```

---

## Task 6: The shell — persistent ring, scene band, pipeline strip

The core of the rebuild. `App.tsx` mounts `SceneBand`, a ring-travel wrapper containing one `RecordRing`, and one `PipelineStrip` **outside** the per-stage conditional, so they never unmount. The per-stage `Card` region swaps beneath them.

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css` (ring geometry per `[data-stage]`)
- Modify: `apps/web/src/views/LandingView.tsx` (drop the RecordRing — the shell owns it now)
- Modify: `apps/web/src/views/ProcessingView.tsx` (drop `PipelineStrip` render — shell owns it; ProcessingView keeps only header strip + log block, positioned to sit under the shared strip)
- Modify: `apps/web/src/test/App.test.tsx`
- Create: `apps/web/src/test/App.motion.test.tsx`

**Interfaces:**
- Consumes: `useChroniclePresenter` (adds nothing new for this task — uses existing `stage`, `selectedFlavour`, `stages`, `transcriptionMs`, `generateError`, `retryGenerate`, mic/upload fields), `SceneBand`, `RecordRing`, `PipelineStrip`, `getFlavourTheme`.
- Produces: the rendered shell. The root element carries `data-flavour={selectedFlavour}` **and** `data-stage={stage}`. The ring wrapper has `data-testid="ring-wrapper"`; the single `RecordRing` is always mounted; `PipelineStrip` is always mounted once `stage !== 'landing'` — see note on `landing` below.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/test/App.motion.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from '../App.js'

vi.mock('@chronicler/api-client', () => ({ client: { GET: vi.fn(), POST: vi.fn() } }))

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><App /></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(client.GET).mockResolvedValue({
    data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
    error: undefined, response: new Response(),
  } as never)
})

describe('App shell', () => {
  it('stamps the current stage on the root element', async () => {
    renderApp()
    await waitFor(() => expect(document.querySelector('[data-stage="landing"]')).toBeTruthy())
  })

  it('keeps one record ring element mounted from the start', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByTestId('ring-wrapper')).toBeInTheDocument())
    // exactly one ring wrapper, always
    expect(screen.getAllByTestId('ring-wrapper')).toHaveLength(1)
  })
})
```

Add to `apps/web/src/test/App.test.tsx` an assertion that the app still renders the landing headline and the carousel after the shell change (keep whatever it asserts today; adjust selectors only if the DOM moved).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- App`
Expected: FAIL — no `data-stage`, no `ring-wrapper`.

- [ ] **Step 3: Restructure `App.tsx`**

Shape (fill in the existing prop wiring from today's `Flow()`):

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { StepBoundary } from './views/StepBoundary.js'
import { SceneBand } from './views/SceneBand.js'
import { RecordRing } from './views/RecordRing.js'
import { PipelineStrip } from './views/PipelineStrip.js'
import { NoticeCard } from './views/NoticeCard.js'
import { LandingView } from './views/LandingView.js'
import { ConfirmView } from './views/ConfirmView.js'      // Task 8 creates this; until then keep ReviewStep import + branch
import { ProcessingView } from './views/ProcessingView.js'
import { ChronicleView } from './views/ChronicleView.js'
import { useChroniclePresenter } from './presenters/useChroniclePresenter.js'
import { getFlavourTheme } from './theme.js'

function Flow() {
  const p = useChroniclePresenter()
  const theme = getFlavourTheme(p.selectedFlavour ?? 'medieval')
  const scrollTop = useRef<HTMLDivElement>(null)

  // scroll-to-top on every stage change — forward and restart behave identically
  useEffect(() => { scrollTop.current?.scrollIntoView({ block: 'start' }) }, [p.stage])

  const sceneStage = p.stage === 'review' ? 'confirm' : p.stage   // presenter uses 'review'; scene uses 'confirm'

  const ringSlot =
    p.stage === 'landing' ? (p.isRecording ? 'timer' : 'hero') : 'marker'

  // on landing, an invalid-upload notice takes the ring's place (design: "occupies the record ring's
  // place in the flow"). Mic-permission errors stay INSIDE RecordRing (its own notice card).
  const showUploadNotice = p.stage === 'landing' && p.uploadValidationError != null

  let card: ReactNode = null
  if (p.stage === 'landing') {
    card = <LandingView /* header, copy, carousel, sample card, mic/upload wiring — NO ring */ {...} />
  } else if (p.stage === 'review') {
    card = <ConfirmView {...} />
  } else if (p.stage === 'processing') {
    card = <ProcessingView /* header strip + log block only */ {...} />
  } else {
    card = <ChronicleView {...} />
  }

  const pipelineVisible = p.stage !== 'landing'

  return (
    <div ref={scrollTop} data-flavour={p.selectedFlavour ?? 'medieval'} data-stage={p.stage} className="relative min-h-screen bg-surface text-fg">
      {/* SceneBand: on landing it wraps the hero copy grid as children; other stages render it empty */}
      <SceneBand flavourKey={theme.key} stage={sceneStage}>
        {p.stage === 'landing' && <HeroCopyGrid {...} />}
      </SceneBand>

      {/* ring-travel wrapper spans scene band + card; ring positioned against it via CSS vars per data-stage */}
      <div data-testid="ring-wrapper" className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-auto absolute" style={{
          left: 'var(--ring-left)', top: 'var(--ring-top)',
          width: 'var(--ring-size)', height: 'var(--ring-size)',
          transition: 'left var(--dur-ring) var(--ease), top var(--dur-ring) var(--ease), width var(--dur-ring) var(--ease), height var(--dur-ring) var(--ease)',
        }}>
          {showUploadNotice ? (
            <NoticeCard
              title={p.uploadNotice.title} body={p.uploadNotice.body} detail={p.uploadNotice.detail}
              primaryLabel="Choose another file" onPrimary={p.openFilePicker}
              secondaryLabel="Record instead" onSecondary={p.clearUploadError}
            />
          ) : (
            <RecordRing
              slot={ringSlot}
              micError={p.micError}
              isRecording={p.isRecording}
              elapsedLabel={p.elapsedLabel}
              pipelineLive={p.stage === 'processing'}
              onStart={p.startRecording} onStop={p.stopRecording}
              onUploadInstead={p.openFilePicker} onRetryMic={p.clearMicError}
            />
          )}
        </div>
      </div>

      {pipelineVisible && (
        <div className="mx-auto max-w-[760px] px-6 md:px-12">
          <PipelineStrip
            stages={p.stages}
            transcriptionMs={p.transcriptionMs}
            generateError={p.generateError}
            onRetry={p.retryGenerate}
            collapsed={p.stage === 'result'}
          />
        </div>
      )}

      <div className="relative z-10">{card}</div>
    </div>
  )
}

export default function App() {
  return <StepBoundary fallback={<div className="p-12 text-fg-muted">Loading…</div>}><Flow /></StepBoundary>
}
```

Notes for the implementer:

**Exact prop wiring** — read today's `App.tsx` `Flow()` (106 lines) for the current set; it does not change except for the ring/scene/strip extraction. Each branch's view keeps the props it takes today:
- `LandingView`: `flavours, selectedFlavour, selectFlavour, micError, setMicError, clearMicError, tryUploadAudio, uploadValidationError, uploadStatus, uploadError` — **minus** the ring (now the shell's) and **minus** the scene band (now `SceneBand`); the hero copy grid becomes `HeroCopyGrid` rendered as `SceneBand`'s child.
- `ConfirmView`: `transcript, setTranscript, confirmTranscript, selectedFlavour, recordingLabel, wordCount` (Task 8 — until Task 8 lands, keep the `ReviewStep` import + `transcript/setTranscript/confirmTranscript` branch unchanged).
- `ProcessingView`: `transcriptionMs, flavourKey (theme.key), voice (theme.voice), generateError, onRetry (retryGenerate)` — **minus** `stages` (now the shell passes `stages` straight to `PipelineStrip`).
- `ChronicleView`: `chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart` (+ `jobId` from Task 10).

- `isRecording`, `startRecording`, `stopRecording`, `openFilePicker`, `elapsedLabel` currently live **inside `LandingView`**. Move that recording state + the `MediaRecorder` logic (`LandingView.tsx:57-100`) **up into `useChroniclePresenter`** so the shell's ring can drive it. This is required — the ring is no longer a child of LandingView. Expose from the presenter: `isRecording`, `elapsedLabel` (formatted `m:ss` from an `elapsed` counter ticked by a `setInterval` while recording), `startRecording`, `stopRecording`, `openFilePicker` (move the hidden `<input type="file">` from `LandingView.tsx:120-132` into the shell and drive it with a `fileInputRef` there).
- The invalid-upload notice construction currently lives in `LandingView.tsx:98-118` (the `notice` object) — move it into the presenter as `uploadNotice: { title: string; body: string; detail: string } | null` (same strings as today), and expose `clearUploadError()` (sets `uploadValidationError` and the derived notice back to `null`; this is the "Record instead" action). Task 11 enriches `uploadNotice` with `fileName`/`value`/`limit`. LandingView no longer renders `NoticeCard` at all — the shell owns it (in the ring slot).
- `HeroCopyGrid` is the left-column kicker/h1/body/"or upload a file" markup extracted from LandingView (small inline component in App.tsx or its own file — implementer's call; keep it small).
- `PipelineStrip` renders on `review`/`processing`/`result`. On `review` the presenter must supply `stages` as `[transcribe:done, rewrite:held, narrate:queued]` — Task 8 wires that; for this task, whatever the presenter returns on `review` today is fine (it may be empty until Task 8 — acceptable, tests for the held state live in Task 8).
- The `PipelineStrip` and the swapped `Card` both need to sit at the right vertical offset so the ring's `marker` slot lands in the card header's 34px slot. Use the geometry from the handoff's "Motion & transitions → Three continuities → 1": card `left: 40px` + header `padding-left: 20px` → ring target `left: 60px` from card's left edge; `top` = scene height (260) + 26px card margin + 10px header padding = **296px**. On `result` the scene is 128px so `top` = 128 + 26 + 10 = **164px**.

- [ ] **Step 4: Add ring geometry to `index.css`**

In `@layer base`, after the `[data-flavour]` rules:

```css
  /* record-ring travel target, per pipeline stage. Desktop values; see media query for mobile. */
  [data-stage="landing"]   { --ring-size: 200px; --ring-left: calc(50% + 260px); --ring-top: 150px; }
  [data-stage="review"]    { --ring-size: 34px;  --ring-left: calc(50% - 380px + 60px); --ring-top: 296px; }
  [data-stage="processing"]{ --ring-size: 34px;  --ring-left: calc(50% - 380px + 60px); --ring-top: 296px; }
  [data-stage="result"]    { --ring-size: 34px;  --ring-left: calc(50% - 540px + 60px); --ring-top: 164px; }

  @media (max-width: 767px) {
    [data-stage="landing"] { --ring-size: 180px; --ring-left: calc(50% - 90px); --ring-top: 380px; }
    [data-stage="review"], [data-stage="processing"] { --ring-left: 24px; --ring-top: 240px; }
    [data-stage="result"] { --ring-left: 24px; --ring-top: 150px; }
  }
```

The exact px offsets will need a visual tuning pass against the bundles (Step 6) — these are the starting values from the handoff's slot math (760px card → left edge at `50% - 380px`; 1080px result card → `50% - 540px`). Adjust `--ring-left`/`--ring-top` until the marker sits in the header slot; do not change the approach.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web test`
Expected: PASS. Fix any LandingView/ProcessingView/presenter tests that broke from the state move — the recording-state tests move from LandingView's test file to the presenter's test file (write equivalent assertions there: `startRecording` sets `isRecording`, `stopRecording` triggers upload).

- [ ] **Step 6: Visual + interaction check**

`pnpm dev:all` + web dev server. Walk Landing → (upload `tests/fixtures/sample.mp3` via the file picker) → Confirm → Processing → Chronicle. Confirm:
- The ring visibly travels and shrinks between steps rather than disappearing.
- The scene band shrinks (420→260→128) without cross-fading.
- The pipeline strip stays put across Confirm→Processing→Result and collapses on Result.
Compare each step against `epic-chronicler-transitions.html` (press "Play flow").

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/index.css apps/web/src/views/LandingView.tsx apps/web/src/views/ProcessingView.tsx apps/web/src/presenters/useChroniclePresenter.ts apps/web/src/test/
git commit -m "feat(web): persistent shell — ring/scene-band/pipeline-strip survive stage changes"
```

---

## Task 7: Apply motion timing — card entrance + shared keyframes

Wire the `--dur-*` tokens into the per-stage card region and add the shared motion CSS (card entrance + the stagger keyframe/utility that Task 9 will apply to the rebuilt Chronicle). Ring travel + scene height + pipeline bars were already tokenised in Tasks 3/4/6.

**Scope note (controller ruling, 2026-09-08):** the ChronicleView stagger *application* (`data-stagger` on the kicker/paragraphs/player) moved to **Task 9**, which rebuilds that exact column (tab strip + custom player). Task 7 ships the shared `stagger-in` keyframe + `stagger-block` utility so Task 9 only adds a class. No `ChronicleView.tsx` change in this task.

**Files:**
- Modify: `apps/web/src/App.tsx` (card-region entrance: `key` + `motion-card` class on the `<div className="relative z-10">{card}</div>` wrapper at ~line 175)
- Modify: `apps/web/src/index.css` (`motion-card` + `card-in`; `stagger-block` + `stagger-in`; `--dur-card`/`--dur-dots` tokens + reduced-motion overrides)
- Modify: `apps/web/src/views/NarratorCarousel.tsx` (replace hardcoded `duration-[450ms]`/`duration-[350ms]` with `duration-[var(--dur-card)]` / `duration-[var(--dur-dots)]`)
- Create: `apps/web/src/test/motion-css.test.ts`

**Interfaces:**
- Consumes: `--dur-copy`, `--dur-stag`, `--ease`, `--stag-delay` from Task 1.
- Produces: `@utility motion-card`, `@utility stagger-block` (consumed by Task 9), `--dur-card` (450ms) / `--dur-dots` (350ms) tokens. No JS/API change. The card wrapper gets `key={p.stage}` so React remounts it per stage, triggering the `card-in` animation.

- [ ] **Step 1: Write the failing test**

`apps/web/src/test/motion-css.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

describe('index.css entrance motion', () => {
  it('defines the card entrance keyframe + utility on --dur-copy', () => {
    expect(css).toMatch(/@keyframes card-in/)
    expect(css).toMatch(/@utility motion-card[\s\S]*?animation:\s*card-in var\(--dur-copy\) var\(--ease\)/)
  })

  it('defines the stagger keyframe + utility driven by --stagger-index * --stag-delay', () => {
    expect(css).toMatch(/@keyframes stagger-in/)
    expect(css).toMatch(/@utility stagger-block[\s\S]*?animation:\s*stagger-in var\(--dur-stag\) var\(--ease\)/)
    expect(css).toMatch(/animation-delay:\s*calc\(var\(--stagger-index[^)]*\)\s*\*\s*var\(--stag-delay\)\)/)
  })

  it('defines the carousel duration tokens and collapses them under reduced motion', () => {
    expect(css).toMatch(/--dur-card:\s*450ms/)
    expect(css).toMatch(/--dur-dots:\s*350ms/)
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(reduced).toMatch(/--dur-card:\s*120ms/)
    expect(reduced).toMatch(/--dur-dots:\s*120ms/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- motion-css`
Expected: FAIL — keyframes/utilities/tokens not present.

- [ ] **Step 3: Implement**

`App.tsx`: the card wrapper (currently `<div className="relative z-10">{card}</div>`, ~line 175) becomes `<div key={p.stage} className="motion-card relative z-10">{card}</div>`. Add to `index.css`:

```css
@utility motion-card {
  animation: card-in var(--dur-copy) var(--ease);
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Also add the stagger keyframe to `index.css`:

```css
@keyframes stagger-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@utility stagger-block {
  animation: stagger-in var(--dur-stag) var(--ease) both;
  animation-delay: calc(var(--stagger-index, 0) * var(--stag-delay));
}
```

Also add, in `@layer base` where the other `--dur-*` tokens live, `--dur-card: 450ms;` and `--dur-dots: 350ms;`, and inside the existing `@media (prefers-reduced-motion: reduce)` `:root` block add `--dur-card: 120ms;` and `--dur-dots: 120ms;` plus `[data-stagger] { animation-delay: 0ms; }` (belt-and-braces — `--stag-delay: 0ms` already collapses the calc).

(Forward rises. "Back falls" — for `restart`/`retellAs` returning to landing — is left as the same rise for this pass; note it as a known simplification in the commit message.)

`NarratorCarousel.tsx`: replace the two `duration-[450ms]` occurrences (the track `transition-transform`, the card `transition-all`) with `duration-[var(--dur-card)]`, and the `duration-[350ms]` on the dots with `duration-[var(--dur-dots)]`. The `ease-[cubic-bezier(.22,.8,.26,1)]` and `motion-reduce:transition-none` stay as-is. No behaviour change — same durations, now token-backed.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- motion-css NarratorCarousel App`
Expected: PASS. (`NarratorCarousel` + `App` existing tests must stay green — this is a no-behaviour-change pass.)

- [ ] **Step 5: Full check**

Run: `pnpm --filter web test` then `pnpm --filter web build`
Expected: all green, build clean. Optionally, `pnpm dev:all` + web dev server: walk a stage change and confirm the card fades/rises in rather than hard-cutting.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/index.css apps/web/src/views/NarratorCarousel.tsx apps/web/src/test/motion-css.test.ts
git commit -m "feat(web): card entrance + shared stagger keyframe, carousel durations tokenised"
```

---

## Task 8: ConfirmView (the gate)

Replace `ReviewStep` with the designed gate: read-only by default, opt-in Edit, held pipeline strip.

**Files:**
- Create: `apps/web/src/views/ConfirmView.tsx`
- Create: `apps/web/src/views/test/ConfirmView.test.tsx`
- Delete: `apps/web/src/views/ReviewStep.tsx`, `apps/web/src/views/test/ReviewStep.test.tsx`
- Modify: `apps/web/src/App.tsx` (swap the `review` branch to `ConfirmView`)
- Modify: `apps/web/src/presenters/useChroniclePresenter.ts` (on `review` stage, return `stages` = `[transcribe:done, rewrite:held, narrate:queued]`; expose `recordingSeconds` / `transcriptWordCount` for the footer)
- Modify: `tests/web/full-journey.spec.ts` (the E2E clicks `btn-generate` on ReviewStep — update to the ConfirmView flow)

**Interfaces:**
- Consumes: `Card`, `Textarea`, `Button` primitives; `PencilSimpleIcon`; `getFlavourTheme`.
- Produces:
  ```ts
  function ConfirmView(props: {
    transcript: string
    setTranscript: (t: string) => void
    confirmTranscript: () => void
    selectedFlavour: string
    recordingLabel: string | null   // "1:48 audio" or null when unknown (uploads)
    wordCount: number
  }): JSX.Element
  ```
  - Default: transcript rendered **read-only** (not a textarea) in JetBrains Mono. Header row: "WHAT YOU SAID" + an **Edit** pill (`data-testid="btn-edit-transcript"`, `PencilSimpleIcon`). Footer row: `recordingLabel` (omitted if null) left, `{wordCount} words` right.
  - Primary action: `data-testid="btn-generate"` (keep this id — the E2E and existing muscle memory rely on it), label `Tell it as {getFlavourTheme(selectedFlavour).name} →`, calls `confirmTranscript`. Disabled when `!transcript.trim()`.
  - Edit mode (after clicking Edit): the read-only block becomes a `<Textarea data-testid="transcript">` bound to `transcript`/`setTranscript`. Header label swaps to "EDITING". Actions become "Save changes" (exits edit mode) + "Discard" (reverts to the transcript value captured on entering edit mode, exits edit mode). The primary "Tell it as …" button stays visible and enabled.
  - Card header strip: title "CHECK THE TRANSCRIPT", right-aligned "step 2 of 3".
  - The held `PipelineStrip` is rendered by the **shell** (Task 6), not by ConfirmView — ConfirmView renders only the card.

- [ ] **Step 1: Write the failing test**

`apps/web/src/views/test/ConfirmView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmView } from '../ConfirmView.js'

const base = {
  transcript: 'we got lost on the trail', setTranscript: vi.fn(), confirmTranscript: vi.fn(),
  selectedFlavour: 'medieval', recordingLabel: '1:48 audio', wordCount: 6,
}

describe('ConfirmView', () => {
  it('shows the transcript read-only with the flavour-named primary action', () => {
    render(<ConfirmView {...base} />)
    expect(screen.getByText('we got lost on the trail')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript')).toBeNull()          // no textarea by default
    expect(screen.getByTestId('btn-generate')).toHaveTextContent(/Tell it as Medieval Chronicler/)
    expect(screen.getByText('6 words')).toBeInTheDocument()
    expect(screen.getByText('1:48 audio')).toBeInTheDocument()
  })

  it('reveals a textarea after clicking Edit', async () => {
    render(<ConfirmView {...base} />)
    await userEvent.click(screen.getByTestId('btn-edit-transcript'))
    expect(screen.getByTestId('transcript')).toBeInTheDocument()
    expect(screen.getByText('EDITING')).toBeInTheDocument()
  })

  it('starts the rewrite via the primary action', async () => {
    const confirmTranscript = vi.fn()
    render(<ConfirmView {...base} confirmTranscript={confirmTranscript} />)
    await userEvent.click(screen.getByTestId('btn-generate'))
    expect(confirmTranscript).toHaveBeenCalled()
  })

  it('omits the recording label when it is unknown (upload path)', () => {
    render(<ConfirmView {...base} recordingLabel={null} />)
    expect(screen.queryByText(/audio$/)).toBeNull()
    expect(screen.getByText('6 words')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- ConfirmView`
Expected: FAIL — file missing.

- [ ] **Step 3: Implement `ConfirmView.tsx`**

Build per the interface above. Keep it a single file, ~90 lines. Use `useState` for `editing` and a `useRef`/`useState` snapshot of the transcript for Discard. Values inline from the handoff's "Transcript confirm step" section (prompt copy, type sizes) — read that section for the exact strings and treat `epic-chronicler-transitions.html` step 03 as the visual target.

- [ ] **Step 4: Presenter — held stages + footer data**

In `useChroniclePresenter.ts`:
- When `stage === 'review'`, return `stages` as:
  ```ts
  [{ key: 'transcribe', status: 'done', pct: 100 },
   { key: 'rewrite', status: 'held', pct: 0 },
   { key: 'narrate', status: 'queued', pct: 0 }]
  ```
  (the existing `stages` computation only needs to branch on `stage === 'review'` before the processing logic).
- Expose `transcriptWordCount: transcript.trim() ? transcript.trim().split(/\s+/).length : 0`.
- Add a module-level helper `formatMSS(s: number)`: `` `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` ``.
- Add `recordingSeconds` state, `useState<number | null>(null)` — stays `null` this task (Task 10 captures it at record time).
- Expose `recordingLabel: recordingSeconds == null ? null : `${formatMSS(recordingSeconds)} audio``.

- [ ] **Step 5: Swap in App.tsx + fix the E2E**

`App.tsx`: `review` branch renders `<ConfirmView transcript={p.transcript} setTranscript={p.setTranscript} confirmTranscript={p.confirmTranscript} selectedFlavour={p.selectedFlavour ?? 'medieval'} recordingLabel={p.recordingLabel} wordCount={p.transcriptWordCount} />`. Remove the `ReviewStep` import.

`tests/web/full-journey.spec.ts`: after the transcript appears, the current spec asserts `getByTestId('transcript')` has a value and clicks `btn-generate`. Update to:
```ts
// transcript now shows read-only by default
await expect(page.getByText(/we got lost on the trail/i)).toBeVisible({ timeout: 10_000 })
await page.getByTestId('btn-generate').click()
```
Keep the rest (chronicle-text assertion, player) as-is.

- [ ] **Step 6: Delete ReviewStep**

```bash
git rm apps/web/src/views/ReviewStep.tsx apps/web/src/views/test/ReviewStep.test.tsx
```

- [ ] **Step 7: Run everything**

Run: `pnpm --filter web test` then (with `docker compose up redis -d` and mock AI) `pnpm test -- --project=web`
Expected: unit suite green; E2E full-journey green.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/src/views apps/web/src/App.tsx apps/web/src/presenters tests/web/full-journey.spec.ts
git commit -m "feat(web): ConfirmView gate — read-only default, Edit toggle, held pipeline strip"
```

---

## Task 9: ChronicleView — tab strip + custom player

**Files:**
- Modify: `apps/web/src/views/ChronicleView.tsx`
- Modify: `apps/web/src/views/test/ChronicleView.test.tsx`

**Interfaces:**
- Consumes: `PlayIcon`, `PauseIcon` from `@/lib/icons.js`; `getFlavourTheme`; `jobId` prop (added in Task 10 wiring, default it to `'—'` here so this task's tests pass standalone).
- Produces: no signature change beyond adding `jobId: string`. New internal `<audio ref>` driven by a custom play/pause button + a 44-bar waveform. Waveform bar heights from the handoff's deterministic function:
  ```ts
  const amp = 0.32 + 0.68 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37) + 0.25 * Math.sin(i * 2.1))
  const height = Math.max(4, Math.round(amp * 30))
  ```
  Bars left of the playhead use `--accent`, the rest `#3f424d`. Playhead position = `audio.currentTime / audio.duration`. Keep `data-testid="tts-player"` on the `<audio>` element (E2E depends on it) but it can be `hidden`/visually replaced by the custom bar. Keep `data-testid="chronicle-text"`.
- Tab strip: "transcript + chronicle" (active, `inset 0 -2px 0 0 var(--accent)` underline), "audio", "share" (inert `#9397ab` — no panels behind them this pass; they're visual only, mark with `aria-disabled`). Right-aligned meta `{selectedFlavour} · job {jobId}`.
- Word count in the chronicle meta (`2:04 · {wordCount} words`) — `wordCount` derived locally from `chronicleText`.
- **No title element** — the narrator-name kicker stays as the only heading (Global Constraint).
- **Entrance stagger (moved here from Task 7):** the four right-column blocks — narrator kicker+text container, first paragraph, payoff line, player bar — each get `data-stagger` set to its index (`"0"`..`"3"`), the `stagger-block` utility class (shipped by Task 7), and `style={{ ['--stagger-index' as any]: n }}`. This gives the handoff's "card settles first, then the text arrives" beat (0 / 80 / 160 / 240ms via `--stag-delay`). The `jobOutcome` early-return (`EmptyStateShell`) is NOT staggered — errors get no motion.

- [ ] **Step 1: Update the test**

Add to `apps/web/src/views/test/ChronicleView.test.tsx`:

```tsx
it('renders a custom play control and a 44-bar waveform', () => {
  const { container } = render(<ChronicleView
    chronicleText={'A legend.\n\nThe payoff.'} audioKey="tts-x.mp3" transcript="t"
    flavours={[{ key: 'medieval', name: 'Medieval Chronicler', description: 'x' }]}
    selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31"
  />)
  expect(screen.getByTestId('btn-playpause')).toBeInTheDocument()
  expect(container.querySelectorAll('[data-wavebar]')).toHaveLength(44)
  expect(screen.getByTestId('tts-player')).toBeInTheDocument()
})

it('shows a derived word count in the chronicle meta', () => {
  render(<ChronicleView chronicleText={'one two three four five'} audioKey={null} transcript="t"
    flavours={[]} selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31" />)
  expect(screen.getByText(/5 words/)).toBeInTheDocument()
})

it('assigns ascending stagger indices to the four right-column blocks', () => {
  const { container } = render(<ChronicleView
    chronicleText={'A legend.\n\nThe payoff.'} audioKey="tts-x.mp3" transcript="t"
    flavours={[{ key: 'medieval', name: 'Medieval Chronicler', description: 'x' }]}
    selectedFlavour="medieval" retellAs={() => {}} jobOutcome={null} restart={() => {}} jobId="8f31"
  />)
  const idx = [...container.querySelectorAll('[data-stagger]')].map((el) => Number((el as HTMLElement).dataset.stagger))
  expect(idx).toEqual([0, 1, 2, 3])
})

it('does not stagger the expired/failed empty state', () => {
  const { container } = render(<ChronicleView
    chronicleText={null} audioKey={null} transcript="t" flavours={[]}
    selectedFlavour="medieval" retellAs={() => {}} jobOutcome={'expired'} restart={() => {}} jobId="8f31"
  />)
  expect(container.querySelectorAll('[data-stagger]')).toHaveLength(0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- ChronicleView`
Expected: FAIL.

- [ ] **Step 3: Implement**

Rework the right column: kicker → body paragraphs (first `#9397ab`, second `padding-left:16px; border-left:2px solid var(--accent)`) → the custom player bar. Player bar: `<button data-testid="btn-playpause">` toggling `audioRef.current.play()/.pause()` and an `isPlaying` state (listen to `play`/`pause`/`timeupdate`/`loadedmetadata` events). Render 44 `<div data-wavebar style={{ height, background }}>`. Keep `<audio ref={audioRef} data-testid="tts-player" src={/api/v1/pipeline/audio/${audioKey}} className="hidden" />`. Tab strip above the two-column grid. The `jobOutcome` early-return path stays (`EmptyStateShell`).

Apply the entrance stagger: the four blocks (kicker+text container, first paragraph, payoff line, player bar) each get `data-stagger="0"`..`"3"`, `className="stagger-block ..."`, and `style={{ ['--stagger-index' as any]: n }}`. `stagger-block` / `stagger-in` are already in `index.css` from Task 7. Do NOT add stagger to the `EmptyStateShell` branch.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- ChronicleView`
Expected: PASS.

- [ ] **Step 5: Visual check** against `epic-chronicler-landing.html` (Chronicle view).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/ChronicleView.tsx apps/web/src/views/test/ChronicleView.test.tsx
git commit -m "feat(web): Chronicle tab strip + custom waveform player"
```

---

## Task 10: Presenter — jobId threading + recording duration

**Files:**
- Modify: `apps/web/src/presenters/useChroniclePresenter.ts`
- Modify: `apps/web/src/App.tsx` (pass `jobId` to `ChronicleView`)
- Modify: `apps/web/src/views/ChronicleView.tsx` (use real `jobId` in `EmptyStateShell` + meta)
- Modify: `apps/web/src/presenters/test/useChroniclePresenter.test.tsx`

**Interfaces:**
- Produces from the presenter: `jobId: string | null` (the `generateJobId`, falling back to `uploadJobId`), `recordingSeconds: number | null`, `recordingLabel: string | null`.
- `recordingSeconds` is set in `stopRecording`'s `recorder.onstop`: create an `Audio` element from the recorded `Blob` URL, read `.duration` on `loadedmetadata`, `Math.round` it, `setRecordingSeconds`. Revoke the object URL after. On the upload path leave it `null`.

- [ ] **Step 1: Write the failing test**

Add to the presenter test:

```tsx
it('exposes the generate job id once generation is queued', async () => {
  vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
  vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'gen-42', status: 'queued' }, error: undefined, response: new Response() } as never)
  const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
  await waitFor(() => expect(result.current.flavours).toEqual([]))
  act(() => result.current.setTranscript('a tale'))
  act(() => result.current.confirmTranscript())
  await waitFor(() => expect(result.current.jobId).toBe('gen-42'))
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- useChroniclePresenter`
Expected: FAIL — `result.current.jobId` undefined.

- [ ] **Step 3: Implement**

Presenter: add `jobId: generateJobId ?? uploadJobId ?? null` to the return. Add `recordingSeconds` state + the `onstop` duration capture. Add `recordingLabel: recordingSeconds == null ? null : `${formatMSS(recordingSeconds)} audio`` and a small `formatMSS(s: number)` helper (`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`).

`App.tsx`: `<ChronicleView … jobId={p.jobId ?? '—'} />`.

`ChronicleView.tsx`: replace the hardcoded `jobId="—"` in the `EmptyStateShell` call with the prop; use it in the tab-strip meta.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- useChroniclePresenter ChronicleView App`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/presenters apps/web/src/App.tsx apps/web/src/views/ChronicleView.tsx
git commit -m "feat(web): thread real jobId to Chronicle; capture recording duration"
```

---

## Task 11: Error-state polish — NoticeCard strip + EmptyStateShell icons

**Files:**
- Modify: `apps/web/src/views/NoticeCard.tsx`
- Modify: `apps/web/src/views/EmptyStateShell.tsx`
- Modify: `apps/web/src/views/test/NoticeCard.test.tsx`, `apps/web/src/views/test/EmptyStateShell.test.tsx`
- Modify: `apps/web/src/presenters/useChroniclePresenter.ts` (enrich `uploadNotice` with `fileName`/`value`/`limit` from the new `validateAudioFile` return; the shell already passes `uploadNotice` through — Task 6)
- Modify: `apps/web/src/App.tsx` (pass the three new `uploadNotice` fields to `NoticeCard` in the ring slot)
- Modify: `apps/web/src/models/validateAudioFile.ts` (return structured `fileName` + `value` + `limit` alongside `code`)
- Modify: `apps/web/src/models/test/validateAudioFile.test.ts`

**Interfaces:**
- `validateAudioFile` return becomes:
  ```ts
  type AudioValidation =
    | { ok: true }
    | { ok: false; code: 'too-large' | 'unsupported-format'; fileName: string; value: string; limit: string }
  ```
  `too-large`: `value` = `"68.4 MB"`, `limit` = `"limit 25 MB"`. `unsupported-format`: `value` = the bad ext, `limit` = `"webm · mp3 · m4a · wav · ogg"`.
- `NoticeCard` gains `fileName?: string; value?: string; limit?: string`; when present it renders the three-part strip (`fileName` in `#e9e9ed`, `value` in `--error-text`, `limit` right-aligned in `#9397ab`) instead of the single `detail` string. `detail` (machine code, e.g. `ERR_FILE_TOO_LARGE`) moves to a right-aligned mono line by the title.
- `EmptyStateShell`: swap `ClockIcon`/`WarningIcon` for `ClockCounterClockwiseIcon` / `WarningCircleIcon` from `@/lib/icons.js` (size 34). Add `data-error-control` to the error-variant buttons. No prop change (already takes `jobId`).

- [ ] **Step 1: Update tests**

`NoticeCard.test.tsx` — add:
```tsx
it('renders the rejected-file strip when file fields are supplied', () => {
  render(<NoticeCard title="That file is too large" body="…" detail="ERR_FILE_TOO_LARGE"
    fileName="night-out-full.m4a" value="68.4 MB" limit="limit 25 MB"
    onPrimary={() => {}} primaryLabel="Choose another file" onSecondary={() => {}} secondaryLabel="Record instead" />)
  expect(screen.getByText('night-out-full.m4a')).toBeInTheDocument()
  expect(screen.getByText('68.4 MB')).toBeInTheDocument()
  expect(screen.getByText('limit 25 MB')).toBeInTheDocument()
  expect(screen.getByText('ERR_FILE_TOO_LARGE')).toBeInTheDocument()
})
```
`EmptyStateShell.test.tsx` — keep existing assertions; add one that the SVG rendered is present (`container.querySelector('svg')` truthy) for each kind.
`validateAudioFile.test.ts` — update expectations to the new shape.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter web test -- NoticeCard EmptyStateShell validateAudioFile`
Expected: FAIL.

- [ ] **Step 3: Implement.** `validateAudioFile.ts` returns the new shape. In `useChroniclePresenter`, `tryUploadAudio` stores `fileName`/`value`/`limit` on `uploadValidationError` and the derived `uploadNotice` gains those three fields. `App.tsx` passes them to `NoticeCard` in the ring slot. `NoticeCard.tsx` renders the three-part strip when they're present, else the single `detail` line. `EmptyStateShell.tsx` swaps to the Phosphor glyphs.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views apps/web/src/models/validateAudioFile.ts apps/web/src/presenters
git commit -m "feat(web): rejected-file strip; Phosphor glyphs in EmptyStateShell"
```

---

## Task 12: Carousel — clickable dots + keyboard arrows

**Files:**
- Modify: `apps/web/src/views/NarratorCarousel.tsx`
- Modify: `apps/web/src/views/test/NarratorCarousel.test.tsx`

**Interfaces:** no signature change. The dots row becomes buttons (`data-testid="carousel-dot-{key}"`, `aria-label="Go to {name}"`) calling `selectFlavour(f.key)`. The carousel container (the `flex-1 overflow-hidden` track wrapper) gets `tabIndex={0}`, `role="group"`, `aria-label="Narrator carousel"`, and `onKeyDown` handling `ArrowLeft`→`prev()` / `ArrowRight`→`next()`.

- [ ] **Step 1: Add tests**

```tsx
it('selects a flavour when its dot is clicked', async () => {
  const selectFlavour = vi.fn()
  render(<NarratorCarousel flavours={F} selectedFlavour="medieval" selectFlavour={selectFlavour} />)
  await userEvent.click(screen.getByTestId('carousel-dot-nature'))
  expect(selectFlavour).toHaveBeenCalledWith('nature')
})

it('moves with the arrow keys', async () => {
  const selectFlavour = vi.fn()
  render(<NarratorCarousel flavours={F} selectedFlavour="medieval" selectFlavour={selectFlavour} />)
  const group = screen.getByRole('group', { name: /narrator carousel/i })
  group.focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(selectFlavour).toHaveBeenCalledWith('sports')   // F = [medieval, sports, nature, fantasy]
})
```
(Define `F` as the four-flavour array at the top of the test file.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter web test -- NarratorCarousel`
Expected: FAIL.

- [ ] **Step 3: Implement** the dot buttons and the keydown handler.

- [ ] **Step 4: Run to verify pass** + manual keyboard check in the browser (Tab to the carousel, arrow through, focus ring visible).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/NarratorCarousel.tsx apps/web/src/views/test/NarratorCarousel.test.tsx
git commit -m "feat(web): carousel clickable dots + keyboard arrows"
```

---

## Task 13: E2E — ring persistence + full-suite verification

**Files:**
- Modify: `tests/web/full-journey.spec.ts`

- [ ] **Step 1: Add the ring-identity assertion**

Extend the existing test (after Confirm is reached, before clicking `btn-generate`):

```ts
// the record ring is ONE element across the flow — capture it on landing, prove identity later
await page.goto('/')
const ringHandleLanding = await page.getByTestId('ring-wrapper').elementHandle()

await page.getByTestId('carousel-chip-medieval').click()
await page.getByTestId('audio-file').setInputFiles('tests/fixtures/sample.mp3')
await expect(page.getByText(/we got lost on the trail/i)).toBeVisible({ timeout: 10_000 })

const ringHandleConfirm = await page.getByTestId('ring-wrapper').elementHandle()
expect(await ringHandleLanding!.evaluate((a, b) => a === b, ringHandleConfirm)).toBe(true)

await page.getByTestId('btn-generate').click()
await expect(page.getByTestId('chronicle-text')).toHaveText(/Here follows the chronicle/, { timeout: 10_000 })

const ringHandleResult = await page.getByTestId('ring-wrapper').elementHandle()
expect(await ringHandleLanding!.evaluate((a, b) => a === b, ringHandleResult)).toBe(true)
```

- [ ] **Step 2: Run the web E2E**

Run: `docker compose up redis -d && pnpm test -- --project=web`
Expected: PASS. (`pnpm test` = `playwright test --grep-invert @integration`; the web project builds `apps/web` and runs against the mock AI server per `playwright.config.ts`.)

- [ ] **Step 3: Full unit suite + build + typecheck**

Run:
```bash
pnpm --filter web test
pnpm --filter web build
pnpm --filter web exec tsc --noEmit
```
Expected: all green.

- [ ] **Step 4: Full visual walkthrough**

`pnpm dev:all` + web dev server. Walk all four flavours through Landing → Confirm → Processing → Chronicle, and trigger each error state:
- mic denied (deny permission in the browser)
- invalid upload (drop a `.txt` renamed `.aiff`; drop a >25MB file)
- failed stage (point `OPENROUTER_BASE_URL` at a dead port to force a rewrite failure)
- expired job (poll a made-up job id — or just trust the unit coverage)
- generic failure
Compare each against `epic-chronicler-error-states.html` and `epic-chronicler-transitions.html`.

- [ ] **Step 5: Commit**

```bash
git add tests/web/full-journey.spec.ts
git commit -m "test(web): assert record-ring element identity across the flow"
```

---

## Self-Review

**Spec coverage:**

| Spec item | Task |
| --- | --- |
| Persistent ring / scene band / pipeline strip (motion arch B) | 3, 4, 5, 6 |
| `--accent-line` token | 1 |
| Error-aware focus ring | 1 (+ `data-error-control` applied in 4, 5, 11) |
| `--dur-*` single source + reduced-motion collapse | 1, 7 |
| Confirm view (gate-not-form, Edit toggle, held strip, step 2 of 3) | 8 |
| Confirm step unconditional (no skip) | 8 (no skip logic written — constraint honoured by omission) |
| Retell → redirect to Landing (unchanged) | none needed — `retellAs` already resets; Global Constraint records it |
| No chronicle title | 9 |
| word count derived client-side | 8 (confirm footer), 9 (chronicle meta) |
| recording duration client-side; no `detectedLanguages` | 10 |
| `jobId` threaded | 10 |
| Phosphor icons (6 glyphs) | 2, 5, 9, 11 |
| Mic-denied: icon swap + no animation | 5 |
| Invalid upload: rejected-file strip | 11 |
| Failed pipeline stage: failed/blocked rows + detail + per-stage retry | 4 (+ held in 4/8) |
| Expired / generic failure states | 11 (icons); logic already present via `EmptyStateShell` + presenter `jobOutcome` |
| Carousel drag/swipe (already shipped), keyboard arrows, clickable dots | 12 |
| Playwright ring-identity assertion | 13 |
| Forward-rises entrance | 7 |
| Errors get no motion | 5 (ring), 4 (strip), 11 (states) — none add transitions; verified in 13 Step 4 |

Gaps intentionally accepted (recorded in commit messages / Global Constraints): the "back falls" reverse transition is left as the same rise (Task 7); the "audio"/"share" chronicle tabs are visual-only with no panels (Task 9).

**Placeholder scan:** every code step carries real code or an exact file+line reference to move. Ring geometry px values in Task 6 Step 4 are explicitly flagged as "tune against the bundle" with the derivation shown — not a placeholder, a calibration step.

**Type consistency:** `PipelineStage`/`StageStatus` defined in Task 4 (`PipelineStrip.tsx`), imported by presenter + ProcessingView + shell thereafter. `RecordRing` prop set defined in Task 5, consumed by the shell in Task 6. `AudioValidation` shape change in Task 11 is consumed by the presenter + LandingView in the same task. `jobId` added to `ChronicleView` props in Task 9 (defaulted) and wired in Task 10.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-08-web-frontend-motion-rebuild.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
