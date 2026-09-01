# Web Styling Rebuild (Tailwind v4 + shadcn/ui) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every inline `style={{}}` in `apps/web` with Tailwind v4 utilities and three shadcn/ui primitives, make the app responsive, and move per-flavour theming from prop threading to a `data-flavour` + CSS-variable cascade.

**Architecture:** Tailwind v4 CSS-first (`@theme` in `src/index.css`, `@tailwindcss/vite` plugin — no PostCSS, no `tailwind.config`). Nocturne design values become `--color-*` theme tokens; the per-flavour accent and the error palette become CSS custom properties resolved through a `data-flavour` attribute on a wrapper element. shadcn primitives (`Button`, `Textarea`, `Card`) are hand-written into `apps/web/src/components/ui/` (no CLI). Views convert one at a time, leaf-first; inline styles and utilities coexist until each View is done, so the test suite stays green throughout.

**Tech Stack:** React 18, Vite 5, Tailwind CSS v4, `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`, Vitest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-web-styling-tailwind-shadcn-design.md`

## Global Constraints

- **No changes to Models, Presenter logic, `packages/api-client`, or `apps/api`.** The Presenter's *return shape* changes only by removing accent-for-styling values; its behaviour does not.
- **`packages/ui` is NOT created.** shadcn components live in `apps/web/src/components/ui/`.
- **Every existing `data-testid` is preserved on the same semantic element.** The suite selects: `carousel-chip-<key>`, `audio-file`, `transcript`, `btn-generate`, `chronicle-text`, `tts-player`, `btn-record`, `retell-<key>`. Playwright (`tests/web/full-journey.spec.ts`) uses: `carousel-chip-medieval`, `audio-file`, `transcript`, `btn-generate`, `chronicle-text`, `tts-player`.
- **These visible strings are asserted by tests and must not change:** `Your browser blocked the microphone`, `Try again`, `Upload a file` (RecordRing.test).
- **Import style:** relative imports use `.js` extensions (repo ESM convention); the `@/` alias resolves to `apps/web/src/`, and alias imports also carry `.js` (e.g. `@/lib/utils.js`).
- **Dark-only.** No light theme, no theme toggle.
- **TypeScript ESM, no enums, `as const` objects** (repo coding style).
- **Nocturne values are fixed:** grounds `#101120` / `#161826` / `#131424` / `#1b1d2c`, borders `#292b31` / `#3f424d`, text `#e9e9ed` / `#cfd3e5` / `#b2b6ca` / `#9397ab` / `#595d6c`, near-black `#0a0b10`, card radius `14px`, fonts Inter + JetBrains Mono, accents in OKLCH (see Task 1 CSS), semantic error `oklch(0.734 0.155 25)` independent of flavour.
- **Breakpoints:** Tailwind defaults. `md` (768px) is the desktop-layout switch; `sm` (640px) is the nav switch.
- **Per-task gate:** `pnpm --filter web build` and `pnpm --filter web test` both pass. View tasks additionally: manual check at 375 / 768 / 1440 px.

---

## Token → utility reference (used by every task)

Defined in Task 1's `src/index.css`. Later tasks assume these class names exist.

| Utility | Value | Was (inline) |
|---|---|---|
| `bg-ground` | `#101120` | html bg |
| `bg-surface` | `#161826` | body bg, result frame |
| `bg-panel` | `#131424` | card bg |
| `bg-panel-raised` | `#1b1d2c` | card header bg |
| `bg-abyss` (+ `/55` `/62` `/50` opacities) | `#0a0b10` | landing bg, ring inner fills |
| `border-line` | `#292b31` | card borders |
| `border-line-muted` | `#3f424d` | chip / arrow borders |
| `text-fg` | `#e9e9ed` | primary text |
| `text-fg-dim` | `#cfd3e5` | hero body |
| `text-fg-soft` | `#b2b6ca` | secondary body |
| `text-fg-muted` | `#9397ab` | labels, meta |
| `text-fg-faint` | `#595d6c` | eyebrow labels |
| `text-accent` `bg-accent` `border-accent` | `var(--accent)` | per-flavour accent |
| `bg-accent-soft` `bg-accent-ghost` `border-accent-line` | derived `color-mix` of `--accent` | accentSoft/Ghost/Line |
| `text-error` `bg-error` `border-error` | `var(--error)` = `oklch(0.734 0.155 25)` | errorPalette().base |
| `text-error-fg` | `var(--error-text)` = `oklch(0.86 0.09 25)` | errorPalette().text |
| `bg-error-soft` `bg-error-ghost` `border-error-line` | derived | errorPalette().soft/ghost/line |
| `rounded-card` | `14px` | card radius |
| `font-mono` | JetBrains Mono stack | mono text |
| `animate-recpulse` / `animate-ringout` | keyframes, disabled under `prefers-reduced-motion` | inline `animation:` |

Values with no token (e.g. `letter-spacing: .13em`, `font-size: 52px`, one-off shadows) stay as Tailwind arbitrary values: `tracking-[.13em]`, `text-[52px]`, `shadow-[0_0_44px_var(--color-accent-soft)]`.

---

### Task 1: Tailwind v4 + shadcn primitives (no visual change)

**Files:**
- Modify: `apps/web/package.json` (dependencies)
- Modify: `apps/web/vite.config.ts` (plugin + alias)
- Modify: `apps/web/tsconfig.json` (path alias)
- Rewrite: `apps/web/src/index.css`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/textarea.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/test/button.test.tsx`

**Interfaces:**
- Produces:
  - `cn(...inputs: ClassValue[]): string` from `@/lib/utils.js`
  - `Button` — `React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & { variant?: 'default' | 'outline' | 'ghost'; size?: 'default' | 'sm' | 'icon'; asChild?: never }>`; every variant is a pill (`rounded-full`); `data-testid` and all native button props pass through.
  - `Textarea` — `React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>`
  - `Card` — `React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>`; renders `<div class="rounded-card border border-line bg-panel">` merged with incoming `className`.
  - CSS utilities from the token reference table above.
  - CSS: `[data-flavour="<key>"]` sets `--accent`; `:root` + `[data-flavour]` derive `--accent-soft/ghost/line`; `:root` sets the `--error*` set.

- [ ] **Step 1: Add dependencies to `apps/web/package.json`**

Add to `dependencies`:
```json
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
```
Add to `devDependencies`:
```json
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: completes; `apps/web/node_modules/tailwindcss` exists.

- [ ] **Step 3: Wire the Vite plugin and `@` alias**

Rewrite `apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Add the alias to `apps/web/tsconfig.json`**

Add inside `compilerOptions`:
```json
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
```

- [ ] **Step 5: Rewrite `apps/web/src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-ground: #101120;
  --color-surface: #161826;
  --color-panel: #131424;
  --color-panel-raised: #1b1d2c;
  --color-abyss: #0a0b10;

  --color-line: #292b31;
  --color-line-muted: #3f424d;

  --color-fg: #e9e9ed;
  --color-fg-dim: #cfd3e5;
  --color-fg-soft: #b2b6ca;
  --color-fg-muted: #9397ab;
  --color-fg-faint: #595d6c;

  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-accent-ghost: var(--accent-ghost);
  --color-accent-line: var(--accent-line);

  --color-error: var(--error);
  --color-error-fg: var(--error-text);
  --color-error-soft: var(--error-soft);
  --color-error-ghost: var(--error-ghost);
  --color-error-line: var(--error-line);

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-card: 14px;
}

@layer base {
  :root {
    --error: oklch(0.734 0.155 25);
    --error-text: oklch(0.86 0.09 25);
    --error-soft: color-mix(in srgb, var(--error) 20%, transparent);
    --error-ghost: color-mix(in srgb, var(--error) 9%, transparent);
    --error-line: color-mix(in srgb, var(--error) 34%, transparent);

    /* default accent = medieval, so components render before a flavour is picked */
    --accent: oklch(0.734 0.125 289);
    --accent-soft: color-mix(in srgb, var(--accent) 20%, transparent);
    --accent-ghost: color-mix(in srgb, var(--accent) 9%, transparent);
    --accent-line: color-mix(in srgb, var(--accent) 34%, transparent);
  }

  [data-flavour="medieval"] { --accent: oklch(0.734 0.125 289); }
  [data-flavour="sports"]   { --accent: oklch(0.734 0.135 52); }
  [data-flavour="nature"]   { --accent: oklch(0.734 0.115 158); }
  [data-flavour="fantasy"]  { --accent: oklch(0.734 0.135 344); }

  [data-flavour] {
    --accent-soft: color-mix(in srgb, var(--accent) 20%, transparent);
    --accent-ghost: color-mix(in srgb, var(--accent) 9%, transparent);
    --accent-line: color-mix(in srgb, var(--accent) 34%, transparent);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: var(--color-ground); }
  body {
    background: var(--color-surface);
    color: var(--color-fg);
    font-family: var(--font-sans);
    min-height: 100%;
  }
  a { color: var(--color-accent); }
  a:hover { color: color-mix(in srgb, var(--color-accent) 78%, white); }

  :where(a, button, [role="button"], input, textarea, select):focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@utility animate-recpulse { animation: recpulse 1.6s ease-in-out infinite; }
@utility animate-ringout  { animation: ringout 2.8s ease-out infinite; }

@keyframes recpulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.82); }
}
@keyframes ringout {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.7); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .animate-recpulse, .animate-ringout { animation: none !important; }
}
```

- [ ] **Step 6: Create `apps/web/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Create `apps/web/src/components/ui/button.tsx`**

```tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border border-accent bg-accent-ghost text-fg hover:bg-accent-soft',
        outline: 'border border-fg-soft bg-transparent text-fg hover:bg-white/5',
        ghost: 'text-fg-soft hover:text-fg hover:bg-white/5',
      },
      size: {
        default: 'h-auto px-[22px] py-[11px] text-[13.5px]',
        sm: 'px-[14px] py-[7px] text-xs',
        icon: 'h-9 w-9 p-0 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
```

- [ ] **Step 8: Create `apps/web/src/components/ui/textarea.tsx`**

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils.js'

export const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-line bg-surface p-3 font-mono text-[13px] text-fg outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
```

- [ ] **Step 9: Create `apps/web/src/components/ui/card.tsx`**

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils.js'

export const Card = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-card border border-line bg-panel', className)} {...props} />
  ),
)
Card.displayName = 'Card'
```

- [ ] **Step 10: Write the failing test `apps/web/src/components/ui/test/button.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button.js'

describe('Button', () => {
  it('renders children, forwards data-testid, and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button data-testid="x" onClick={onClick}>Go</Button>)
    const btn = screen.getByTestId('x')
    expect(btn).toHaveTextContent('Go')
    expect(btn.tagName).toBe('BUTTON')
    await userEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button data-testid="x" disabled onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByTestId('x'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 11: Run the button test to verify it fails**

Run: `pnpm --filter web test -- button`
Expected: FAIL — `Cannot find module '../button.js'` is already resolved by Step 7, so this should actually PASS. If Steps 7/6 are complete it passes here; if you are doing strict red-green, temporarily rename `button.tsx` to confirm the test detects its absence, then restore. Otherwise proceed.

- [ ] **Step 12: Run the full web suite**

Run: `pnpm --filter web test`
Expected: PASS — all pre-existing tests still green (no View changed yet), plus the new button test.

- [ ] **Step 13: Verify the build and a visual smoke check**

Run: `pnpm --filter web build`
Expected: PASS, `apps/web/dist/` produced.
Run: `pnpm --filter web dev`, open the app. Expected: **identical** to before this task — the CSS reset/keyframes/body styles are reproduced, no utility classes are applied to Views yet.

- [ ] **Step 14: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml apps/web/vite.config.ts apps/web/tsconfig.json apps/web/src/index.css apps/web/src/lib apps/web/src/components
git commit -m "feat(web): add Tailwind v4 + shadcn primitives (Button/Textarea/Card)"
```

---

### Task 2: `data-flavour` wrapper + remove accent/error from JS

Kills the `accent` string prop and the `errorPalette()` / `mix()` helpers. Colours now come from the CSS cascade. Inline `style={{}}` stays for now (converted per-View in Tasks 3–10) but every colour literal becomes a CSS variable, so the output is pixel-identical.

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/theme.ts`
- Modify: `apps/web/src/views/RecordRing.tsx`
- Modify: `apps/web/src/views/ProcessingView.tsx`
- Modify: `apps/web/src/views/NoticeCard.tsx`
- Modify: `apps/web/src/views/EmptyStateShell.tsx`
- Modify: `apps/web/src/views/LandingView.tsx`
- Modify: `apps/web/src/views/NarratorCarousel.tsx`
- Modify: `apps/web/src/views/ChronicleView.tsx`
- Modify: `apps/web/src/views/StepBoundary.tsx`
- Modify tests: `apps/web/src/views/test/RecordRing.test.tsx`, `apps/web/src/views/test/ProcessingView.test.tsx` (and any other View test that passes `accent=`)
- Modify: `apps/web/src/test/App.test.tsx` (add `data-flavour` assertion)

**Interfaces:**
- Consumes: `cn` and the CSS variables from Task 1.
- Produces:
  - `theme.ts` exports: `FlavourKey`, `FlavourTheme` (now `{ key, name, short, desc, voice, art, sceneLabel }` — **no `accent*` fields**), `FLAVOUR_THEMES`, `FLAVOUR_ORDER`, `getFlavourTheme`. **Removed:** `mix`, `errorPalette`, all `accent*` fields.
  - `RecordRing` props: `{ micError: boolean; isRecording: boolean; onStart; onStop; onUploadInstead; onRetryMic }` — **no `accent`**.
  - `ProcessingView` props: drop `accent`; keep `stages, transcriptionMs, flavourKey, voice, generateError, onRetry`.
  - `App` renders `<div data-flavour={selectedFlavour ?? 'medieval'} className="min-h-screen bg-surface text-fg">…</div>` around `StepBoundary`.

- [ ] **Step 1: Shrink `apps/web/src/theme.ts`**

```ts
export type FlavourKey = 'medieval' | 'sports' | 'nature' | 'fantasy'

export interface FlavourTheme {
  key: FlavourKey
  name: string
  short: string
  desc: string
  voice: string
  art: string
  sceneLabel: string
}

export const FLAVOUR_THEMES: Record<FlavourKey, FlavourTheme> = {
  medieval: {
    key: 'medieval', name: 'Medieval Chronicler', short: 'Medieval',
    desc: 'A solemn scribe recording events for posterity',
    voice: 'bm_george', art: 'portrait — the scribe',
    sceneLabel: 'the scriptorium — candle, ruled parchment, arched window',
  },
  sports: {
    key: 'sports', name: 'Sports Commentator', short: 'Sports',
    desc: 'An energetic play-by-play announcer who sees drama in everything',
    voice: 'am_adam', art: 'portrait — the commentator',
    sceneLabel: 'the stadium — floodlight rigs, crowd tiers, mown pitch',
  },
  nature: {
    key: 'nature', name: 'Nature Documentary', short: 'Nature',
    desc: 'A hushed, reverent narrator observing human behaviour in the wild',
    voice: 'bf_emma', art: 'still — the observer',
    sceneLabel: 'the jungle — canopy, vines, light shafts, undergrowth',
  },
  fantasy: {
    key: 'fantasy', name: 'Epic Fantasy Bard', short: 'Fantasy',
    desc: 'A legendary storyteller who turns every tale into legend',
    voice: 'af_bella', art: 'portrait — the bard',
    sceneLabel: 'the dungeon — stone courses, wall torches, arched doorway',
  },
}

export const FLAVOUR_ORDER: FlavourKey[] = ['medieval', 'sports', 'nature', 'fantasy']

export function getFlavourTheme(key: string): FlavourTheme {
  return FLAVOUR_THEMES[key as FlavourKey] ?? FLAVOUR_THEMES.medieval
}
```

- [ ] **Step 2: Add the `data-flavour` wrapper in `apps/web/src/App.tsx`**

`Flow()` already calls `useChroniclePresenter()` and has `selectedFlavour`. The `getFlavourTheme` import stays (still used for `theme.key`, `theme.voice`). Change `App`:
```tsx
export default function App() {
  return (
    <StepBoundary fallback={<div className="p-12 text-fg-muted">Loading…</div>}>
      <Flow />
    </StepBoundary>
  )
}
```
and wrap the **return of `Flow`** so the attribute tracks the live selection. Simplest: give `Flow` a single top-level wrapper. Replace the four `return (<XView .../>)` branches with one wrapper:
```tsx
  let screen: React.ReactNode
  if (stage === 'landing') screen = <LandingView … />
  else if (stage === 'review') screen = <ReviewStep … />
  else if (stage === 'processing') screen = <ProcessingView … />   {/* no accent prop */}
  else screen = <ChronicleView … />

  return (
    <div data-flavour={selectedFlavour ?? 'medieval'} className="min-h-screen bg-surface text-fg">
      {screen}
    </div>
  )
```
Remove `accent={theme.accent}` from the `ProcessingView` call. Keep `flavourKey={theme.key}` and `voice={theme.voice}`.

- [ ] **Step 3: `RecordRing.tsx` — drop `accent`, swap literals for vars**

Remove `accent` from the props type and signature. Replace `errorPalette()` usage: delete `const e = errorPalette()` and the import. Substitute every colour literal:
- `accent` → `'var(--accent)'`
- `e.base` → `'var(--error)'`, `e.soft` → `'var(--error-soft)'`, `e.ghost` → `'var(--error-ghost)'`, `e.line` → `'var(--error-line)'`, `e.text` → `'var(--error-text)'`
- `#e9e9ed` → `'var(--color-fg)'`, `#b2b6ca` → `'var(--color-fg-soft)'`
Leave structure and `style={{}}` intact. The `animation: micError ? 'none' : 'ringout 2.8s ...'` and `animation: 'recpulse 1.6s ...'` stay as inline strings for now.

- [ ] **Step 4: `ProcessingView.tsx` — drop `accent`, swap literals**

Remove `accent` from props type/signature. Delete `const e = errorPalette()` + import. Substitute:
- `accent` → `'var(--accent)'`
- `e.base/soft/ghost/line/text` → the matching `var(--error-*)` (text → `var(--error-text)`)
- `#9397ab` → `'var(--color-fg-muted)'`, `#e9e9ed` → `'var(--color-fg)'`, `#b2b6ca` → `'var(--color-fg-soft)'`, `#292b31` → `'var(--color-line)'`, `#131424` → `'var(--color-panel)'`, `#1b1d2c` → `'var(--color-panel-raised)'`

- [ ] **Step 5: `NoticeCard.tsx` — swap error literals**

Delete `const e = errorPalette()` + import. `WarningIcon` keeps its `color` prop but callers pass `'var(--error)'`. Substitute `e.base/soft/ghost/line/text` → `var(--error-*)`, `#131424`→`var(--color-panel)`, `#161826`→`var(--color-surface)`, `#292b31`→`var(--color-line)`, `#b2b6ca`→`var(--color-fg-soft)`.

- [ ] **Step 6: `EmptyStateShell.tsx` — swap error literals**

Delete `const e = errorPalette()` + import. Substitute the same way; the `isExpired ? '#3f424d' : e.line` style ternaries become `isExpired ? 'var(--color-line-muted)' : 'var(--error-line)'` etc. Neutral literals → their `var(--color-*)`.

- [ ] **Step 7: `LandingView.tsx` — remove `theme.accent`, use vars**

`getFlavourTheme` still imported (used for `theme.key` → `buildScene`, `theme.sceneLabel`). Replace `theme.accent` (header dot bg + boxShadow, eyebrow colour) with `'var(--accent)'`. No child gets an accent prop. `<RecordRing>` calls lose `accent={theme.accent}`.

- [ ] **Step 8: `NarratorCarousel.tsx` — per-card `data-flavour`**

`getFlavourTheme` import can be dropped (only `f.key` / `f.name` used now). For the accent-bloom blob and the dots row, wrap in the selected flavour: add `data-flavour={selectedFlavour ?? 'medieval'}` to the blob `<div>` and to the dots container `<div>`; their `background` uses `'var(--accent-soft)'` / `'var(--accent)'`.
For each card: add `data-flavour={f.key}` to the card `<div>` (alongside `data-testid={`carousel-chip-${f.key}`}`), then:
- `selected ? theme.accent : '#3f424d'` (border) → `selected ? 'var(--accent)' : 'var(--color-line-muted)'`
- `selected ? theme.accentGhost : 'transparent'` (bg) → `selected ? 'var(--accent-ghost)' : 'transparent'`
- `selected ? `0 0 44px ${theme.accentSoft}` : 'none'` (shadow) → `selected ? '0 0 44px var(--accent-soft)' : 'none'`
Neutral literals → vars. The active-dot `currentTheme?.accent ?? '#3f424d'` → `'var(--accent)'` (the dots container now carries `data-flavour`).

- [ ] **Step 9: `ChronicleView.tsx` — vars + per-pill `data-flavour`**

`getFlavourTheme` stays (used for `theme.name`, `t.short`). Replace `theme.accent` (narrator label colour) → `'var(--accent)'` (wrapper is under `App`'s `data-flavour = selectedFlavour`). For each retell pill: add `data-flavour={f.key}` alongside `data-testid={`retell-${f.key}`}` and change `on ? t.accent : '#3f424d'` → `on ? 'var(--accent)' : 'var(--color-line-muted)'`, `on ? t.accentGhost : 'transparent'` → `on ? 'var(--accent-ghost)' : 'transparent'`.

- [ ] **Step 10: `StepBoundary.tsx` — neutral literals to vars**

`ErrorFallback`'s `style={{ color: '#e9e9ed', … }}` → `style={{ color: 'var(--color-fg)' }}` (or just `className="text-fg font-sans"`).

- [ ] **Step 11: Update View tests that pass `accent=`**

`apps/web/src/views/test/RecordRing.test.tsx`: remove `accent="oklch(0.734 0.125 289)"` from both `render(<RecordRing … />)` calls.
`apps/web/src/views/test/ProcessingView.test.tsx`: remove the `accent` prop from its `render`. Check every file under `apps/web/src/views/test/` for a literal `accent=` and delete it: `grep -rl 'accent=' apps/web/src/views/test/`.

- [ ] **Step 12: Add the `data-flavour` assertion in `apps/web/src/test/App.test.tsx`**

After the walk reaches the chronicle, before the end of the test:
```tsx
    expect(document.querySelector('[data-flavour="medieval"]')).not.toBeNull()
```

- [ ] **Step 13: Run the full web suite**

Run: `pnpm --filter web test`
Expected: PASS. If a View test asserted an inline colour, fix the assertion to the `var(--…)` string (behavioural assertions should not touch colour — prefer deleting the colour assertion).

- [ ] **Step 14: Build + visual check on all four flavours**

Run: `pnpm --filter web build` — PASS.
Run: `pnpm --filter web dev`. Click each carousel chip; confirm accent colour on the ring, eyebrow, header dot, selected card, dots, and (on the result screen) the narrator label and retell pills matches the pre-task screenshots for medieval / sports / nature / fantasy.

- [ ] **Step 15: Commit**

```bash
git add apps/web/src
git commit -m "refactor(web): drive per-flavour accent from data-flavour + CSS vars, drop accent prop"
```

---

### Task 3: Convert `RecordRing` to Tailwind

**Files:**
- Rewrite: `apps/web/src/views/RecordRing.tsx`
- Test (unchanged behaviour): `apps/web/src/views/test/RecordRing.test.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button.js`, `cn`, CSS utilities.
- Produces: `RecordRing` — same props as after Task 2. `data-testid="btn-record"` stays on the outer clickable element. The strings `Your browser blocked the microphone` / `Try again` / `Upload a file` stay.

- [ ] **Step 1: Run the existing test to confirm the baseline**

Run: `pnpm --filter web test -- RecordRing`
Expected: PASS (from Task 2).

- [ ] **Step 2: Rewrite `apps/web/src/views/RecordRing.tsx`**

```tsx
import { Button } from '@/components/ui/button.js'

export function RecordRing({ micError, isRecording, onStart, onStop, onUploadInstead, onRetryMic }: {
  micError: boolean
  isRecording: boolean
  onStart: () => void
  onStop: () => void
  onUploadInstead: () => void
  onRetryMic: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        data-testid="btn-record"
        role="button"
        tabIndex={micError ? -1 : 0}
        onClick={micError ? undefined : isRecording ? onStop : onStart}
        onKeyDown={(e) => {
          if (micError) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(isRecording ? onStop : onStart)()
          }
        }}
        className={cnRing(micError)}
      >
        <div
          className="absolute -inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, ${micError ? 'var(--error-soft)' : 'var(--accent)'} 0%, transparent 62%)`,
          }}
        />
        <div
          className={
            micError
              ? 'absolute inset-0 rounded-full border border-dashed border-error-line'
              : 'absolute inset-0 rounded-full border border-accent animate-ringout'
          }
        />
        <div className={`absolute inset-[26px] rounded-full border ${micError ? 'border-error-line' : 'border-accent'}`} />
        <div className={`absolute inset-12 rounded-full bg-abyss/55 border ${micError ? 'border-error' : 'border-accent'}`} />
        <div className="relative flex flex-col items-center gap-2">
          {micError ? (
            <span className="text-[30px] text-error">⦸</span>
          ) : (
            <div className="h-[15px] w-[15px] rounded-full bg-accent animate-recpulse" />
          )}
          <span
            className={`text-[12.5px] font-medium uppercase tracking-[.08em] ${micError ? 'text-error-fg' : 'text-fg'}`}
          >
            {micError ? 'Mic blocked' : isRecording ? 'Stop' : 'Record'}
          </span>
        </div>
      </div>

      {micError && (
        <div className="w-[300px] max-w-full rounded-lg border border-error-line bg-abyss/60 px-4 py-[14px]">
          <div className="mb-1.5 text-[12.5px] font-medium text-error-fg">Your browser blocked the microphone</div>
          <p className="mb-3 text-xs text-fg-soft">
            Allow microphone access for this site in your browser settings, then try again.
          </p>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={onRetryMic} className="border-error bg-error-ghost text-error-fg">
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={onUploadInstead}>Upload a file</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function cnRing(micError: boolean) {
  return [
    'relative flex items-center justify-center',
    'h-[clamp(160px,44vw,200px)] w-[clamp(160px,44vw,200px)]',
    micError ? 'cursor-default' : 'cursor-pointer',
  ].join(' ')
}
```
(The `radial-gradient` on the glow keeps a tiny inline `style` — it interpolates a CSS var into a gradient, which no utility expresses. That is sanctioned computed-value use per the standard.)

- [ ] **Step 3: Run the test**

Run: `pnpm --filter web test -- RecordRing`
Expected: PASS — `getByText('Try again')` / `getByText('Upload a file')` resolve to the `<Button>`s; `getByTestId('btn-record')` still fires `onStart`.

- [ ] **Step 4: Responsive check**

`pnpm --filter web dev` → force `micError` (deny mic). At 375px the ring is ~165px and the notice card fits with padding; at 1440px the ring is 200px. No horizontal scroll.

- [ ] **Step 5: Run full suite + commit**

Run: `pnpm --filter web test` — PASS.
```bash
git add apps/web/src/views/RecordRing.tsx apps/web/src/views/test/RecordRing.test.tsx
git commit -m "refactor(web): RecordRing to Tailwind + responsive ring sizing"
```

---

### Task 4: Convert `NoticeCard` to Tailwind

**Files:**
- Rewrite: `apps/web/src/views/NoticeCard.tsx`
- Test: `apps/web/src/views/test/NoticeCard.test.tsx` (behaviour unchanged; adjust only if it asserted inline style)

**Interfaces:**
- Consumes: `Button`, `Card`.
- Produces: `NoticeCard` — same props (`title, body, detail, onPrimary, primaryLabel, onSecondary, secondaryLabel`).

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- NoticeCard` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/NoticeCard.tsx`**

```tsx
import { Button } from '@/components/ui/button.js'

function WarningIcon() {
  return (
    <svg
      width={18} height={18} viewBox="0 0 256 256" fill="none"
      stroke="var(--error)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round"
      className="block shrink-0"
    >
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill="var(--error)" stroke="none" />
    </svg>
  )
}

export function NoticeCard({ title, body, detail, onPrimary, primaryLabel, onSecondary, secondaryLabel }: {
  title: string
  body: string
  detail: string
  onPrimary: () => void
  primaryLabel: string
  onSecondary: () => void
  secondaryLabel: string
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-error-line bg-panel">
      <div className="h-0.5 bg-gradient-to-r from-error to-transparent" />
      <div className="flex items-start gap-[14px] px-5 py-4">
        <div className="mt-px flex shrink-0 [filter:drop-shadow(0_0_8px_var(--error-soft))]">
          <WarningIcon />
        </div>
        <div className="flex-1">
          <div className="mb-[7px] text-sm font-medium text-error-fg">{title}</div>
          <p className="mb-2.5 max-w-[620px] text-[13px] leading-[1.65] text-fg-soft">{body}</p>
          <div className="mb-[14px] flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-[9px] font-mono text-[11.5px] text-error-fg">
            {detail}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onPrimary} className="border-error bg-error-ghost text-error-fg">
              {primaryLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run test** — `pnpm --filter web test -- NoticeCard` → PASS.
- [ ] **Step 4: Full suite + commit**
```bash
git add apps/web/src/views/NoticeCard.tsx apps/web/src/views/test/NoticeCard.test.tsx
git commit -m "refactor(web): NoticeCard to Tailwind"
```

---

### Task 5: Convert `NarratorCarousel` to Tailwind + responsive + swipe

**Files:**
- Rewrite: `apps/web/src/views/NarratorCarousel.tsx`
- Test: `apps/web/src/views/test/NarratorCarousel.test.tsx`

**Interfaces:**
- Consumes: `Button`, CSS utilities.
- Produces: `NarratorCarousel` — same props (`flavours, selectedFlavour, selectFlavour`). `data-testid="carousel-chip-<key>"` stays on each card. Arrows keep `aria-label="Previous narrator"` / `"Next narrator"`.

**Design notes:**
- The hardcoded `translateX(${200 - activeIndex * 276}px)` becomes a percentage transform that centres the active card: track is `flex`, each item has a fixed responsive width, and the track translates by `calc(50% - (activeIndex + 0.5) * var(--card-step))` where `--card-step` = card width + gap. Set `--card-step` responsively (mobile `194px` = 176 + 18 gap; `md` `276px` = 258 + 18).
- Touch swipe: `onPointerDown`/`onPointerUp` on the viewport; if horizontal delta > 40px, call `prev`/`next`.
- Transition spec preserved exactly: `transition: transform .45s cubic-bezier(.22,.8,.26,1)`.

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- NarratorCarousel` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/NarratorCarousel.tsx`**

```tsx
import { useRef } from 'react'
import { Button } from '@/components/ui/button.js'

interface FlavourSummary { key: string; name: string; description: string }
const ART: Record<string, string> = {
  medieval: 'portrait — the scribe',
  sports: 'portrait — the commentator',
  nature: 'still — the observer',
  fantasy: 'portrait — the bard',
}

export function NarratorCarousel({ flavours, selectedFlavour, selectFlavour }: {
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
}) {
  const activeIndex = Math.max(0, flavours.findIndex((f) => f.key === selectedFlavour))
  const current = flavours[activeIndex]
  const prev = () => selectFlavour(flavours[(activeIndex - 1 + flavours.length) % flavours.length].key)
  const next = () => selectFlavour(flavours[(activeIndex + 1) % flavours.length].key)

  const downX = useRef<number | null>(null)
  const onPointerDown = (e: React.PointerEvent) => { downX.current = e.clientX }
  const onPointerUp = (e: React.PointerEvent) => {
    if (downX.current === null) return
    const dx = e.clientX - downX.current
    downX.current = null
    if (dx > 40) prev()
    else if (dx < -40) next()
  }

  return (
    <div className="relative overflow-hidden pt-[34px] pb-11">
      <div
        data-flavour={selectedFlavour ?? 'medieval'}
        className="pointer-events-none absolute -bottom-60 left-1/2 h-[500px] w-[min(1000px,140vw)] -translate-x-1/2 rounded-full transition-[background] duration-500"
        style={{ background: 'radial-gradient(ellipse at center, var(--accent-soft) 0%, transparent 66%)' }}
      />
      <div className="relative px-6 md:px-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">Narrator</div>
          <div className="text-xs text-fg-soft">{current?.name ?? ''}</div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" aria-label="Previous narrator" onClick={prev} className="shrink-0 border-line-muted text-fg-soft">‹</Button>

          <div
            className="flex-1 overflow-hidden py-2.5"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <div
              className="flex gap-[18px] [--card-step:194px] md:[--card-step:276px] motion-reduce:transition-none"
              style={{
                transform: `translateX(calc(50% - (${activeIndex} + 0.5) * var(--card-step)))`,
                transition: 'transform .45s cubic-bezier(.22,.8,.26,1)',
              }}
            >
              {flavours.map((f) => {
                const selected = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`carousel-chip-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectFlavour(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFlavour(f.key) } }}
                    className={[
                      'w-44 md:w-[258px] shrink-0 cursor-pointer rounded-xl p-5',
                      'transition-all duration-[450ms] ease-[cubic-bezier(.22,.8,.26,1)] motion-reduce:transition-none',
                      selected
                        ? 'scale-100 opacity-100 border border-accent bg-accent-ghost shadow-[0_0_44px_var(--accent-soft)]'
                        : 'scale-90 opacity-50 border border-line-muted bg-transparent',
                    ].join(' ')}
                  >
                    <div className="mb-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-line-muted [background-image:repeating-linear-gradient(45deg,rgba(233,233,237,.05)_0_5px,transparent_5px_10px)]">
                      <span className="font-mono text-[9px] tracking-[.06em] text-fg-muted">{ART[f.key] ?? ''}</span>
                    </div>
                    <div className={`mb-[7px] text-base font-medium leading-tight ${selected ? 'text-fg' : 'text-fg-muted'}`}>{f.name}</div>
                    <div className="min-h-[35px] text-xs leading-[1.45] text-fg-muted">{f.description}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <Button variant="outline" size="icon" aria-label="Next narrator" onClick={next} className="shrink-0 border-line-muted text-fg-soft">›</Button>
        </div>

        <div data-flavour={selectedFlavour ?? 'medieval'} className="mt-5 flex justify-center gap-1.5">
          {flavours.map((f, i) => (
            <div
              key={f.key}
              className={`h-1.5 rounded-full transition-all duration-[350ms] motion-reduce:transition-none ${i === activeIndex ? 'w-[22px] bg-accent' : 'w-1.5 bg-line-muted'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```
(`ART` is inlined here rather than re-deriving from `theme.ts` — `getFlavourTheme(f.key).art` still works if you prefer the import; either is fine. If you keep the import, drop the local `ART`.)

- [ ] **Step 3: Update `apps/web/src/views/test/NarratorCarousel.test.tsx` if it asserts the track transform**

If a test reads the inline `transform` string, update the expected value to the new `translateX(calc(50% - (…)))` form, or (preferred) replace it with a behavioural assertion: clicking `carousel-chip-sports` calls `selectFlavour('sports')`; the arrows call it with the wrapped neighbour. Keep any `data-testid` assertions.

- [ ] **Step 4: Run test** — `pnpm --filter web test -- NarratorCarousel` → PASS.

- [ ] **Step 5: Responsive + swipe check**

`pnpm --filter web dev`. At 375px: cards ~176px, active card centred, no page scroll. Drag left/right on the track → moves one card. At 1440px: cards 258px, same behaviour. Arrows have a visible focus ring on Tab.

- [ ] **Step 6: Full suite + commit**
```bash
git add apps/web/src/views/NarratorCarousel.tsx apps/web/src/views/test/NarratorCarousel.test.tsx
git commit -m "refactor(web): NarratorCarousel to Tailwind, %-based track, touch swipe"
```

---

### Task 6: Convert `ReviewStep` to Tailwind

**Files:**
- Rewrite: `apps/web/src/views/ReviewStep.tsx`
- Test: `apps/web/src/views/test/ReviewStep.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Textarea`, `Button`.
- Produces: `ReviewStep` — same props (`transcript, setTranscript, confirmTranscript`). `data-testid="transcript"` on the `<Textarea>`, `data-testid="btn-generate"` on the `<Button>`.

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- ReviewStep` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/ReviewStep.tsx`**

```tsx
import { Card } from '@/components/ui/card.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Button } from '@/components/ui/button.js'

export function ReviewStep({ transcript, setTranscript, confirmTranscript }: {
  transcript: string
  setTranscript: (text: string) => void
  confirmTranscript: () => void
}) {
  return (
    <div className="mx-auto my-16 max-w-[760px] px-6 md:my-20 md:px-12">
      <Card className="px-[26px] py-7">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
        <Textarea
          data-testid="transcript"
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <Button
          data-testid="btn-generate"
          variant="outline"
          onClick={confirmTranscript}
          disabled={!transcript.trim()}
          className="mt-4"
        >
          Tell the story
        </Button>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Run test** — `pnpm --filter web test -- ReviewStep` → PASS (`toHaveValue`, `disabled` when empty, `btn-generate` click all still work).
- [ ] **Step 4: Full suite + commit**
```bash
git add apps/web/src/views/ReviewStep.tsx apps/web/src/views/test/ReviewStep.test.tsx
git commit -m "refactor(web): ReviewStep to Tailwind + shadcn primitives"
```

---

### Task 7: Convert `ProcessingView` to Tailwind

**Files:**
- Rewrite: `apps/web/src/views/ProcessingView.tsx`
- Test: `apps/web/src/views/test/ProcessingView.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Button`. Keeps exporting `PipelineStage` interface unchanged.
- Produces: `ProcessingView` — props (post-Task-2): `{ stages, transcriptionMs, flavourKey, voice, generateError, onRetry }`.

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- ProcessingView` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/ProcessingView.tsx`**

```tsx
import { Button } from '@/components/ui/button.js'

type StageKey = 'transcribe' | 'rewrite' | 'narrate'
type StageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked'

export interface PipelineStage {
  key: StageKey
  status: StageStatus
  pct: number
}

const STAGE_LABEL: Record<StageKey, string> = {
  transcribe: 'transcribe · groq whisper v3',
  rewrite: 'rewrite · claude sonnet',
  narrate: 'narrate · kokoro 82m',
}
const STAGE_ERROR_TITLE: Record<StageKey, string> = {
  transcribe: 'Transcription failed',
  rewrite: 'The narrator couldn’t finish this one',
  narrate: 'Narration didn’t come through',
}
const STAGE_RETRY_LABEL: Record<StageKey, string> = {
  transcribe: 'Retry transcription',
  rewrite: 'Retry rewrite',
  narrate: 'Retry narration',
}

export function ProcessingView({ stages, transcriptionMs, flavourKey, voice, generateError, onRetry }: {
  stages: PipelineStage[]
  transcriptionMs: number | null
  flavourKey: string
  voice: string
  generateError: string | null
  onRetry: () => void
}) {
  const hasFailure = stages.some((s) => s.status === 'failed')

  return (
    <div className="mx-auto my-16 max-w-[760px] px-6 md:my-20 md:px-12">
      <div className="overflow-hidden rounded-card border border-line shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel-raised px-[22px] py-3.5">
          <span className="font-mono text-[12.5px] font-medium uppercase tracking-[.1em]">TELLING YOUR STORY</span>
          <div className={`flex items-center gap-[7px] font-mono text-[11px] ${hasFailure ? 'text-error-fg' : 'text-fg-muted'}`}>
            <div
              className={`h-1.5 w-1.5 rounded-full ${hasFailure ? 'bg-error' : 'bg-accent animate-recpulse'}`}
              style={{ boxShadow: `0 0 10px ${hasFailure ? 'var(--error)' : 'var(--accent)'}` }}
            />
            {hasFailure ? 'failed' : 'working'}
          </div>
        </div>

        <div className="bg-panel px-[26px] pb-[30px] pt-7">
          <div className="flex flex-col gap-[18px] font-mono text-xs leading-[1.5]">
            {stages.map((stage) => {
              const statusColor =
                stage.status === 'failed' ? 'text-error-fg'
                : stage.status === 'done' || stage.status === 'active' ? 'text-accent'
                : 'text-fg-muted'
              const statusText =
                stage.status === 'done' ? (stage.key === 'transcribe' ? `done ${transcriptionMs}ms` : 'done')
                : stage.status === 'active' ? `${stage.pct}%`
                : stage.status === 'queued' ? 'queued'
                : stage.status === 'failed' ? `failed at ${stage.pct}%`
                : 'blocked'
              const fillVar =
                stage.status === 'done' || stage.status === 'active' ? 'var(--accent)'
                : stage.status === 'failed' ? 'var(--error)'
                : null

              return (
                <div key={stage.key}>
                  <div className="flex justify-between">
                    <span>{STAGE_LABEL[stage.key]}</span>
                    <span className={statusColor}>{statusText}</span>
                  </div>
                  <div className="mt-[7px] h-0.5 overflow-hidden rounded-[1px] bg-line">
                    {fillVar && (
                      <div
                        className="h-full rounded-[1px]"
                        style={{ width: `${stage.pct}%`, background: fillVar, boxShadow: `0 0 10px ${fillVar}` }}
                      />
                    )}
                  </div>
                  {stage.status === 'failed' && (
                    <div className="mt-3 rounded-r-lg border border-error-line border-l-2 border-l-error bg-error-ghost px-[15px] py-[13px]">
                      <div className="mb-1.5 text-[12.5px] font-medium text-error-fg [font-family:var(--font-sans)]">
                        {STAGE_ERROR_TITLE[stage.key]}
                      </div>
                      <p className="mb-3 text-xs leading-[1.6] text-fg-soft [font-family:var(--font-sans)]">{generateError}</p>
                      <Button size="sm" onClick={onRetry} className="border-error bg-error-ghost text-error-fg [font-family:var(--font-sans)]">
                        {STAGE_RETRY_LABEL[stage.key]}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-[26px] border-t border-line pt-5 font-mono text-[11.5px] leading-[1.9] text-fg-muted">
            <div>&gt; upload accepted</div>
            <div>&gt; flavour {flavourKey} → voice {voice}</div>
            <div>&gt; raw audio discarded ✓</div>
            {stages.filter((s) => s.status === 'failed').map((s) => (
              <div key={s.key} className="text-error-fg">&gt; {s.key} failed</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `apps/web/src/views/test/ProcessingView.test.tsx`** — remove any inline-style assertions; keep behavioural ones (failure row renders `STAGE_ERROR_TITLE`, retry button calls `onRetry`, `generateError` text shows).
- [ ] **Step 4: Run test** — `pnpm --filter web test -- ProcessingView` → PASS.
- [ ] **Step 5: Responsive check** — at 375px the header row wraps, card fits with `px-6`, progress bars fill correctly.
- [ ] **Step 6: Full suite + commit**
```bash
git add apps/web/src/views/ProcessingView.tsx apps/web/src/views/test/ProcessingView.test.tsx
git commit -m "refactor(web): ProcessingView to Tailwind"
```

---

### Task 8: Convert `EmptyStateShell` + `StepBoundary` to Tailwind

**Files:**
- Rewrite: `apps/web/src/views/EmptyStateShell.tsx`
- Rewrite: `apps/web/src/views/StepBoundary.tsx`
- Tests: `apps/web/src/views/test/EmptyStateShell.test.tsx`, `apps/web/src/views/test/StepBoundary.test.tsx`

**Interfaces:**
- Consumes: `Button`.
- Produces: `EmptyStateShell` — same props (`kind: 'expired' | 'generic'`, `jobId`, `onPrimary`). `StepBoundary` — same props (`fallback`, `children`).

- [ ] **Step 1: Baseline tests** — `pnpm --filter web test -- EmptyStateShell StepBoundary` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/StepBoundary.tsx`**

```tsx
import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }: { error: Error }) {
  return <div className="text-fg">✗ {error.message}</div>
}

export function StepBoundary({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 3: Rewrite `apps/web/src/views/EmptyStateShell.tsx`**

```tsx
import { Button } from '@/components/ui/button.js'

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke="currentColor"
      strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={128} cy={128} r={96} />
      <path d="M128,72v56h48" />
    </svg>
  )
}
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke="currentColor"
      strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill="currentColor" stroke="none" />
    </svg>
  )
}

export function EmptyStateShell({ kind, jobId, onPrimary }: {
  kind: 'expired' | 'generic'
  jobId: string
  onPrimary: () => void
}) {
  const isExpired = kind === 'expired'
  const title = isExpired ? 'This session has ended' : 'Something went wrong'
  const body = isExpired
    ? 'Chronicler keeps nothing after you leave, so this chronicle is gone. Nothing was stored, and nothing was shared.'
    : "We couldn't finish telling your story. This one is on us — trying again usually works."
  const detail = isExpired ? `job ${jobId} · expired` : `job ${jobId} · error`
  const ctaLabel = isExpired ? 'Start a new chronicle' : 'Try again'
  const markColor = isExpired ? 'text-fg-muted' : 'text-error'

  return (
    <div className="mx-auto my-16 w-full max-w-[560px] overflow-hidden rounded-card border border-line bg-surface shadow-[0_16px_40px_rgba(0,0,0,.45)]">
      <div className="flex gap-6 border-b border-line bg-panel-raised px-6 font-mono text-[11.5px]">
        <div className="py-3.5 text-fg-faint">transcript + chronicle</div>
        <div className="py-3.5 text-fg-faint">audio</div>
        <div className="py-3.5 text-fg-faint">share</div>
        <div className={`ml-auto py-3.5 ${isExpired ? 'text-fg-muted' : 'text-error-fg'}`}>{detail}</div>
      </div>
      <div className="flex flex-col items-center px-6 py-12 text-center md:px-10">
        <div className="relative mb-[26px] flex h-[88px] w-[88px] items-center justify-center">
          <div
            className="absolute -inset-3.5 rounded-full"
            style={{ background: `radial-gradient(circle, ${isExpired ? 'rgba(233,233,237,.06)' : 'var(--error-soft)'} 0%, transparent 62%)` }}
          />
          <div className={`absolute inset-0 rounded-full border border-dashed ${isExpired ? 'border-line-muted' : 'border-error-line'}`} />
          <div className="absolute inset-5 rounded-full bg-abyss/50" />
          <div className={`relative flex ${markColor}`}>
            {isExpired ? <ClockIcon /> : <WarningIcon />}
          </div>
        </div>
        <h2 className="mb-3 text-2xl font-medium leading-tight tracking-[-.02em] text-fg">{title}</h2>
        <p className="mb-2 max-w-[400px] text-sm leading-[1.7] text-fg-soft">{body}</p>
        <p className="mb-[26px] font-mono text-[11.5px] leading-[1.6] text-fg-muted">{detail}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            variant={isExpired ? 'outline' : 'default'}
            onClick={onPrimary}
            className={isExpired ? 'border-fg-soft' : 'border-error bg-error-ghost text-error-fg'}
          >
            {ctaLabel}
          </Button>
          {!isExpired && (
            <Button variant="ghost" onClick={onPrimary}>Back to start</Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update the tests** if they asserted inline colours; keep title/body/CTA text and `onPrimary` wiring assertions.
- [ ] **Step 5: Run tests** — `pnpm --filter web test -- EmptyStateShell StepBoundary` → PASS.
- [ ] **Step 6: Full suite + commit**
```bash
git add apps/web/src/views/EmptyStateShell.tsx apps/web/src/views/StepBoundary.tsx apps/web/src/views/test/EmptyStateShell.test.tsx apps/web/src/views/test/StepBoundary.test.tsx
git commit -m "refactor(web): EmptyStateShell + StepBoundary to Tailwind"
```

---

### Task 9: Convert `ChronicleView` to Tailwind + responsive two-column collapse

**Files:**
- Rewrite: `apps/web/src/views/ChronicleView.tsx`
- Test: `apps/web/src/views/test/ChronicleView.test.tsx`

**Interfaces:**
- Consumes: `EmptyStateShell`, `getFlavourTheme`.
- Produces: `ChronicleView` — same props. `data-testid="chronicle-text"` on the chronicle body, `data-testid="tts-player"` on `<audio>`, `data-testid="retell-<key>"` on each pill.

**Design note:** desktop `md:grid-cols-[320px_1fr]`; below `md` it stacks — transcript first, then chronicle — per the handoff. Transcript panel border switches from right-border to bottom-border when stacked.

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- ChronicleView` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/ChronicleView.tsx`**

```tsx
import { EmptyStateShell } from './EmptyStateShell.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary { key: string; name: string; description: string }

export function ChronicleView({ chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart }: {
  chronicleText: string | null
  audioKey: string | null
  transcript: string
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  retellAs: (key: string) => void
  jobOutcome: 'expired' | 'failed' | null
  restart: () => void
}) {
  if (jobOutcome) {
    return <EmptyStateShell kind={jobOutcome === 'expired' ? 'expired' : 'generic'} jobId="—" onPrimary={restart} />
  }

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')

  return (
    <div className="mx-auto my-[60px] max-w-[1080px] px-6 md:px-12">
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="border-b border-line bg-panel p-6 md:border-b-0 md:border-r">
            <div className="mb-[18px] font-mono text-[10.5px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
            <div className="whitespace-pre-wrap font-mono text-xs leading-[1.7] text-fg-muted">{transcript}</div>
          </div>
          <div className="px-6 py-7 md:px-[34px]">
            <div className="mb-[11px] font-mono text-[10.5px] uppercase tracking-[.16em] text-accent">{theme.name}</div>
            <div data-testid="chronicle-text" className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg">
              {chronicleText ?? 'Your chronicle will appear here…'}
            </div>
            {audioKey && (
              <audio data-testid="tts-player" controls src={`/api/v1/pipeline/audio/${audioKey}`} className="mt-5 w-full" />
            )}
            <div className="mt-[26px] flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11.5px] text-fg-muted">Tell it again as</span>
              {flavours.map((f) => {
                const t = getFlavourTheme(f.key)
                const on = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`retell-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => retellAs(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retellAs(f.key) } }}
                    className={[
                      'cursor-pointer rounded-full px-[13px] py-[7px] text-xs',
                      on ? 'border border-accent bg-accent-ghost text-fg' : 'border border-line-muted bg-transparent text-fg-muted',
                    ].join(' ')}
                  >
                    {t.short}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run test** — `pnpm --filter web test -- ChronicleView` → PASS (`chronicle-text` text, `tts-player` src, `retell-<key>` click → `retellAs`).
- [ ] **Step 4: Responsive check** — below 768px: transcript stacks above the chronicle, audio player full-width, pills wrap. At 1440px: two columns.
- [ ] **Step 5: Full suite + commit**
```bash
git add apps/web/src/views/ChronicleView.tsx apps/web/src/views/test/ChronicleView.test.tsx
git commit -m "refactor(web): ChronicleView to Tailwind + responsive column collapse"
```

---

### Task 10: Convert `LandingView` to Tailwind + responsive hero + scaled scene

**Files:**
- Rewrite: `apps/web/src/views/LandingView.tsx`
- Test: `apps/web/src/views/test/LandingView.test.tsx`

**Interfaces:**
- Consumes: `RecordRing`, `NarratorCarousel`, `NoticeCard` (all converted), `Card`, `buildScene`, `getFlavourTheme`.
- Produces: `LandingView` — same props. `data-testid="audio-file"` on the hidden `<input>`. All copy strings unchanged (`SAMPLE_CHRONICLE`, headline, etc.).

**Design notes:**
- Page container: `mx-auto max-w-[1280px] px-6 md:px-12`.
- Header: logo always visible; the three nav links `hidden sm:flex`.
- Hero grid: `grid-cols-1 md:grid-cols-[1.15fr_.85fr] md:items-center`; on mobile the ring/notice column comes **after** the copy (source order already is copy-then-ring, so no `order` needed).
- Scene stage: `hidden md:block` wrapper; inside, the 900×300 stage keeps its absolute shape `<div>`s (from `buildScene`) with inline `style` — that is sanctioned computed geometry — but the stage wrapper scales via `origin-top-left scale-[.75] lg:scale-100` (or a `clamp()` width) rather than a fixed `scale(1.4)`. Keep the two scrim gradients as `<div>` overlays with inline `style` (gradients don't map to utilities).
- H1: `text-[32px] md:text-[52px]` with the existing `leading-[1.04] tracking-[-.03em] [text-wrap:balance] max-w-[560px]` and `[text-shadow:0_2px_26px_rgba(0,0,0,.85)]`.
- The `<span role="button">` "upload a file" becomes a real `<button>` for keyboard access (still inline text style via classes).

- [ ] **Step 1: Baseline test** — `pnpm --filter web test -- LandingView` → PASS.

- [ ] **Step 2: Rewrite `apps/web/src/views/LandingView.tsx`**

Keep all the non-visual logic verbatim (`startRecording`, `stopRecording`, `openFilePicker`, the `notice` computation, `showNotice`). Only the returned JSX changes. Full file:

```tsx
import { useRef, useState } from 'react'
import { getFlavourTheme } from '../theme.js'
import { buildScene } from '../scenes.js'
import { RecordRing } from './RecordRing.js'
import { NarratorCarousel } from './NarratorCarousel.js'
import { NoticeCard } from './NoticeCard.js'

const MCP_URL = 'https://epicchronicler-production.up.railway.app/mcp'
const GITHUB_URL = 'https://github.com/brunolazarus/epicChronicler'

const SAMPLE_CHRONICLE = `Here follows the chronicle of the Siege of the Flatpack Throne, as testified before this scribe by Marco and Júlia.

On a Saturday eve, the two companions undertook a quest of no small peril: the assembly of a bookshelf delivered in a box of cardboard, its instructions rendered in a tongue neither could decipher. Marco, ever bold, seized the Allen key as a knight seizes his sword and declared the battle begun.

Three hours did the siege endure. Twice was a shelf mounted backward and twice undone. Júlia, keeper of patience, discovered at the eleventh hour that an entire bag of fasteners had been overlooked — a revelation that nearly ended the fellowship there and then. Yet triumph came at last: the throne stood upright, bearing its full weight of books without complaint, and the companions toasted their victory with cold pizza, as is tradition among those who have suffered together.

Let it be remembered: no furniture was harmed beyond repair, and the friendship, like the bookshelf, held.`

interface FlavourSummary { key: string; name: string; description: string }
interface UploadValidationError { code: 'too-large' | 'unsupported-format'; detail: string }

export function LandingView({
  flavours, selectedFlavour, selectFlavour,
  micError, setMicError, clearMicError,
  tryUploadAudio, uploadValidationError, uploadStatus, uploadError,
}: {
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
  micError: boolean
  setMicError: (blocked: boolean) => void
  clearMicError: () => void
  tryUploadAudio: (file: File) => void
  uploadValidationError: UploadValidationError | null
  uploadStatus: 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'
  uploadError: string | null
}) {
  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')
  const scene = buildScene(theme.key)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadNoticeDismissed, setUploadNoticeDismissed] = useState(false)

  async function startRecording() {
    setUploadNoticeDismissed(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const ext = mimeType.split('/')[1].split(';')[0]
        const blob = new Blob(chunksRef.current, { type: mimeType })
        tryUploadAudio(new File([blob], `recording.${ext}`, { type: mimeType }))
        setIsRecording(false)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setMicError(true)
    }
  }
  function stopRecording() { mediaRecorderRef.current?.stop() }
  function openFilePicker() {
    setUploadNoticeDismissed(false)
    fileInputRef.current?.click()
  }

  const notice = uploadValidationError
    ? uploadValidationError.code === 'too-large'
      ? { title: 'That file is too large', body: 'Chronicler takes recordings up to 25 MB — around 25 minutes of speech. Trim the file, or record directly in the browser instead.', detail: uploadValidationError.detail }
      : { title: "That format isn't supported", body: 'Chronicler reads webm, mp3, m4a, wav and ogg. Convert the file, or record directly in the browser instead.', detail: uploadValidationError.detail }
    : uploadStatus === 'error'
      ? { title: "That recording couldn't be transcribed", body: 'Something went wrong turning your recording into text. Try uploading it again, or record a new one.', detail: uploadError ?? 'unknown error' }
      : null
  const showNotice = !micError && !!notice && !uploadNoticeDismissed

  return (
    <div className="min-h-screen bg-abyss">
      <input
        ref={fileInputRef}
        type="file"
        data-testid="audio-file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          setUploadNoticeDismissed(false)
          if (file) tryUploadAudio(file)
        }}
      />

      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="h-[9px] w-[9px] rounded-[2px] bg-accent shadow-[0_0_12px_var(--accent)]" />
          <span className="text-[13px] font-medium uppercase tracking-[.13em] text-fg">Chronicler</span>
        </div>
        <nav className="hidden items-center gap-6 sm:flex">
          <a href="#how-it-works" className="text-[12.5px] text-fg-muted no-underline">How it works</a>
          <a href={MCP_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">MCP server</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-fg-muted no-underline">GitHub</a>
        </nav>
      </header>

      <div className="relative mx-auto max-w-[1280px] overflow-hidden md:h-[420px]">
        {/* scene — desktop only, whole stage scaled */}
        <div className="hidden md:block">
          <div className="pointer-events-none absolute left-1/2 top-[30%] h-[300px] w-[900px] origin-[50%_30%] -translate-x-1/2 -translate-y-[30%] scale-[1.15] lg:scale-[1.4]">
            {scene.map((s, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: s.l, top: s.t, width: s.w, height: s.h,
                  background: s.bg, borderRadius: s.r, boxShadow: s.sh,
                  transform: s.tf, opacity: s.o, filter: s.fl,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,11,16,.88) 0%, rgba(10,11,16,.6) 46%, transparent 72%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(22,24,38,.85) 100%)' }} />
        </div>

        <div className="relative grid grid-cols-1 items-center gap-10 px-6 py-14 md:h-full md:grid-cols-[1.15fr_.85fr] md:px-12 md:py-0">
          <div>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[.16em] text-accent">No login · nothing kept</div>
            <h1 className="m-0 max-w-[560px] text-[32px] font-medium leading-[1.04] tracking-[-.03em] text-fg [text-shadow:0_2px_26px_rgba(0,0,0,.85)] [text-wrap:balance] md:text-[52px]">
              Every night out is a legend waiting for a narrator.
            </h1>
            <p className="mt-5 max-w-[420px] text-base leading-[1.6] text-fg-dim">
              Talk for a minute. Slide below to choose who tells it back. English or Portuguese in — an English legend out, read aloud.
            </p>
            <p className="mt-3.5 text-[13.5px] text-fg-soft">
              or{' '}
              <button
                type="button"
                onClick={openFilePicker}
                className="cursor-pointer bg-transparent p-0 text-fg underline underline-offset-[3px]"
              >
                upload a file
              </button>
            </p>
          </div>

          <div className="flex justify-center">
            {micError ? (
              <RecordRing micError isRecording={isRecording} onStart={startRecording} onStop={stopRecording} onUploadInstead={openFilePicker} onRetryMic={clearMicError} />
            ) : showNotice && notice ? (
              <NoticeCard
                title={notice.title} body={notice.body} detail={notice.detail}
                primaryLabel="Choose another file" onPrimary={openFilePicker}
                secondaryLabel="Record instead" onSecondary={() => setUploadNoticeDismissed(true)}
              />
            ) : (
              <RecordRing micError={false} isRecording={isRecording} onStart={startRecording} onStop={stopRecording} onUploadInstead={openFilePicker} onRetryMic={clearMicError} />
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3.5 right-6 hidden text-right font-mono text-[10px] tracking-[.08em] text-fg/50 md:right-12 md:block">
          {theme.sceneLabel}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <NarratorCarousel flavours={flavours} selectedFlavour={selectedFlavour} selectFlavour={selectFlavour} />
      </div>

      <div id="how-it-works" className="mx-auto mb-[60px] box-border max-w-[1280px] rounded-card border border-line bg-panel p-7">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">A story, told</div>
        <div className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg-dim">{SAMPLE_CHRONICLE}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `apps/web/src/views/test/LandingView.test.tsx`** — remove inline-style assertions; keep: `audio-file` upload wiring, headline text present, `carousel-chip-*` reachable, `upload a file` click calls the file picker path. If the test asserted the scene renders, note the scene is now `hidden md:block` — jsdom has no layout so the elements still exist in the DOM; `display:none` via class doesn't remove them. If it asserted a specific count of scene shapes, that still holds.

- [ ] **Step 4: Run test** — `pnpm --filter web test -- LandingView` → PASS.

- [ ] **Step 5: Responsive check (the bug that started this)**

`pnpm --filter web dev`:
- **360px / 375px:** single column, headline `32px`, ring below copy, no scene, no horizontal scroll, carousel swipeable, "how it works" card full-width.
- **768px:** two-column hero appears, scene appears scaled `1.15`.
- **1440px / 1920px:** content capped at 1280 and **centred** (this was the wide-margin complaint — confirm it looks intentional, scene scaled `1.4`).

- [ ] **Step 6: Full suite + commit**
```bash
git add apps/web/src/views/LandingView.tsx apps/web/src/views/test/LandingView.test.tsx
git commit -m "refactor(web): LandingView to Tailwind, responsive hero, scaled scene"
```

---

### Task 11: Cleanup, Playwright, docs, standard

**Files:**
- Modify: `apps/web/src/index.css` (only if dead rules remain)
- Modify: `README.md`
- Modify: `docs/standards/frontend-architecture-standard.md`
- Verify: `tests/web/full-journey.spec.ts` (change only if a selector broke)
- Modify: `docs/superpowers/plans/2026-08-02-web-frontend-rebuild.md` isn't touched; `docs/SDD.md` / `docs/architecture.md` unaffected (no topology change).

- [ ] **Step 1: Dead-code sweep**

Run: `grep -rn "errorPalette\|accentSoft\|accentGhost\|accentLine\|from '../theme'" apps/web/src`
Expected: no `errorPalette` / `accent*` hits. `getFlavourTheme` imports remain only in `App.tsx`, `LandingView.tsx`, `NarratorCarousel.tsx` (if kept), `ChronicleView.tsx`.
Run: `grep -rn "style={{" apps/web/src/views`
Expected: only the sanctioned computed-geometry cases — `scenes` shape divs and scrims in `LandingView`, radial-gradient glows in `RecordRing` / `EmptyStateShell` / `NarratorCarousel`, per-stage `width`/`boxShadow` in `ProcessingView`. No design-token literals (`#xxxxxx`, `padding: NN`, `fontFamily`).

- [ ] **Step 2: Confirm `index.css` has no leftover hand-rolled rules** a utility now covers (e.g. an `a` rule duplicated by a component). The base layer from Task 1 is the intended floor — leave it.

- [ ] **Step 3: Run the unit suite once more**

Run: `pnpm --filter web test`
Expected: PASS (all View tests + button test + App walk).

- [ ] **Step 4: Run Playwright**

Run: `pnpm build && pnpm test` (root — `playwright test --grep-invert @integration`).
Expected: `tests/web/full-journey.spec.ts` PASS. The selectors it uses (`carousel-chip-medieval`, `audio-file`, `transcript`, `btn-generate`, `chronicle-text`, `tts-player`) are all preserved. If any fails, restore the missing `data-testid` on the same element — do not loosen the test.

- [ ] **Step 5: Update `README.md`**

In the project-structure / stack section, note that `apps/web` styles with **Tailwind v4 + shadcn/ui** (primitives in `apps/web/src/components/ui/`), per-flavour theming via a `data-flavour` CSS-variable cascade. Commands are unchanged. Keep it to 2–3 lines; match the file's existing tone.

- [ ] **Step 6: Add the "Styling" section to `docs/standards/frontend-architecture-standard.md`**

Insert a new `## ` section immediately after §3 ("Components and roles"), renumbering the following sections (§4 Data flow → §5, etc.) OR appending as a lettered subsection if renumbering is disruptive — match whatever the file's current numbering tolerates. Content:

```markdown
## 4. Styling

- **Utility-first with Tailwind.** No per-component `.css` / `.module.css` files, no CSS-in-JS. Styling is Tailwind utility classes in the View layer. Tailwind v4's CSS-first config (`@theme` in one entry stylesheet) is the endorsed setup — no `tailwind.config.js`.
- **`style={{}}` is reserved for computed geometry** — values a component calculates at runtime (generative scene coordinates, a progress-bar width, a gradient that interpolates a token). Design values — colour, spacing, radius, type scale — are never inline.
- **Design tokens are CSS custom properties**, declared once in the Tailwind `@theme` and consumed through utilities. No hardcoded hex, px spacing, or font stacks in components.
- **Runtime theming** (dark/light, per-flavour, per-tenant) is a `data-*` attribute on a wrapper element driving a CSS-variable cascade — **not** a value threaded through component props. A component reacts to theme by using a token utility whose variable is redefined upstream; to show a *sibling's* theme (e.g. a picker listing every option), put the `data-*` attribute on that element's own subtree.
- **shadcn/ui for primitives.** Generated (or hand-written to match) into the consuming app at `apps/<app>/src/components/ui/`, with shadcn's tokens mapped to the project `@theme`. Unused variants are deleted. A primitive is promoted to `packages/ui` only when a *second* app consumes it — the same promotion rule as Model hooks (§2).
- **Accessibility is not optional:** a visible `:focus-visible` ring on every interactive element, and `prefers-reduced-motion` honoured by every non-essential animation.
```

Then fix the §1 passing mention: change `ui/          # Shared UI primitives (e.g. shadcn/ui for web, NativeWind for mobile)` to add `— see §4 Styling`.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/standards/frontend-architecture-standard.md tests/web/full-journey.spec.ts apps/web/src/index.css
git commit -m "docs(web): document Tailwind + shadcn styling standard; verify e2e"
```

- [ ] **Step 8: Final verification**

Run: `pnpm --filter web build` — PASS.
Run: `pnpm --filter web test` — PASS.
Run: `pnpm test` (root Playwright) — PASS.
Manual: all four flavours correct at 375 / 768 / 1440 px on Landing, Review, Processing, Chronicle, and the mic-blocked / bad-file / stage-failure / expired states.

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| §4.1 Tailwind v4 CSS-first, `@theme` tokens, base layer, keyframes, reduced-motion | Task 1 |
| §4.2 `data-flavour` + CSS-var theming, drop `accent` prop, shrink `theme.ts`, delete `errorPalette`/`mix` | Task 2 |
| §4.3 Scene stays inline geometry, stage scaled, hidden `<md` | Task 10 |
| §4.4 shadcn Button / Textarea / Card, mapped tokens, trimmed variants | Task 1 (create), Tasks 3–10 (adopt) |
| §4.5 Responsive per View | RecordRing→T3, Carousel→T5, ReviewStep→T6, ProcessingView→T7, ChronicleView→T9, LandingView→T10 |
| §4.6 `:focus-visible` ring, `prefers-reduced-motion` | Task 1 (global CSS), Tasks 3/5/9 (keyboard handlers on `role=button`) |
| §5 Sequencing (setup → de-thread → per-View → cleanup) | Tasks 1–11 |
| §6 Standard doc "Styling" section + fix §1 mention | Task 11 Step 6 |
| §7 Tests updated per View, Playwright green after de-thread and at end | Each View task; Task 2 Step 13; Task 11 Step 4 |
| §7 `data-flavour` asserted | Task 2 Step 12 |

No gaps.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every code step has full source. Test steps have real assertions. The one soft spot — Task 1 Step 11's red-green note — is deliberately explicit about the two ways to run it.

**Type consistency:**
- `Button` prop type (`ButtonProps`, `variant`/`size` unions) defined Task 1 Step 7, used Tasks 3–10 with only those variant/size values.
- `RecordRing` props: `accent` removed in Task 2 Step 3 interface block; Task 3's rewrite and the LandingView calls in Task 10 both omit it. Consistent.
- `ProcessingView` props: `accent` removed Task 2 Step 4; Task 7 rewrite and App.tsx call (Task 2 Step 2) both omit it. `PipelineStage` interface unchanged and still exported.
- `theme.ts` `FlavourTheme` shape (Task 2 Step 1) has no `accent*`; every later consumer reads only `key`/`name`/`short`/`voice`/`sceneLabel`.
- `cn` signature identical everywhere. `Card`/`Textarea` are plain `div`/`textarea` forwardRefs — no custom props to drift.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-31-web-styling-tailwind-shadcn.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
