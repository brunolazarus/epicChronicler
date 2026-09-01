# Web Styling Rebuild — Tailwind v4 + shadcn/ui

**Date:** 2026-08-31
**Status:** Design — awaiting review
**Scope:** `apps/web` styling layer + `docs/standards/frontend-architecture-standard.md`
**Predecessor:** `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` (the MVP rebuild that produced today's `apps/web`)

---

## 1. Problem

`apps/web` was rebuilt as a React + Vite MVP app in the frontend rebuild. Its architecture (Model / Presenter / View, typed API client, Suspense-first) is sound. Its **styling is not**:

- **~130 inline `style={{}}` objects** across 9 View files + `App.tsx`. No utility system, no shared scale, values (`#131424`, `48px`, `radius 14`) copy-pasted between components.
- **Not responsive.** Fixed pixel containers (`maxWidth: 1280`, hero scene `width: 900`, carousel glow `width: 1000`), a hero grid (`gridTemplateColumns: '1.15fr .85fr'`) that never collapses, a carousel track positioned by hardcoded arithmetic (`translateX(200 - activeIndex * 276)`), fixed `font-size: 52`. On a wide monitor the 1280 box floats in large dark margins; below ~900px it overflows and the carousel is clipped. This is the bug that triggered the work.
- **Runtime theming by prop threading.** `theme.ts` computes four per-flavour accent tokens via `color-mix()` and passes `accent` (a string) as a prop through `RecordRing`, `ProcessingView`, `NarratorCarousel`, `LandingView`. Every new styled component that touches the accent has to receive and forward it.
- **No accessibility affordances** the design system requires: no `:focus-visible` ring, no `prefers-reduced-motion` handling for the `recpulse` / `ringout` animations.

The design target is unchanged: the "Nocturne" system from the Claude Design handoff (`docs/standards/design_handoff_epic_chronicler/`) — dark grounds `#161826` / `#131424` / `#1b1d2c`, per-flavour OKLCH accents, Inter + JetBrains Mono, 14px card radius, per-flavour generative hero scenes.

## 2. Goals

1. Replace inline styles with **Tailwind v4** utilities across all Views.
2. Adopt **shadcn/ui** for the three primitives that genuinely recur (`Button`, `Textarea`, `Card`); keep everything bespoke that is bespoke.
3. Make the app **responsive** — usable from ~360px phone width to ultra-wide, following the handoff's own responsive notes.
4. Replace accent **prop threading** with a `data-flavour` + CSS-variable cascade.
5. Add the missing **`:focus-visible`** ring and **`prefers-reduced-motion`** guards.
6. Codify the above as a **Styling section** in the frontend architecture standard.

Visual output stays faithful to the Nocturne handoff. Where the current implementation has responsive/layout bugs, they are fixed in this pass (not filed separately). This is not a redesign — no new screens, no new visual language, no component API changes beyond removing the `accent` prop.

## 3. Non-goals

- No changes to Models, Presenter, `packages/api-client`, or `apps/api`.
- No new screens or flow changes. The four-stage flow (`landing → review → processing → result`) is untouched.
- **`packages/ui` is not created.** There is still one frontend app; shadcn components live in `apps/web/src/components/ui/`. Promotion to `packages/ui` happens on the second consumer, per the standard's promotion rule.
- No replacement of the generative scene layer with real illustration (the handoff flags this as a future swap; out of scope here).
- No carousel drag/keyboard rework beyond what responsiveness requires (touch swipe is in scope because mobile needs it; desktop drag and full keyboard arrow support are not).
- No dark/light theme toggle — the app is dark-only.

## 4. Approach

### 4.1 Tailwind v4, CSS-first

Add `tailwindcss@4` and `@tailwindcss/vite`. Register the plugin in `apps/web/vite.config.ts`. Replace `apps/web/src/index.css` contents with:

```css
@import "tailwindcss";

@theme {
  /* neutrals — the Nocturne grounds */
  --color-ground: #101120;
  --color-surface: #161826;
  --color-panel: #131424;
  --color-panel-raised: #1b1d2c;
  --color-border: #292b31;
  --color-border-muted: #3f424d;
  --color-text: #e9e9ed;
  --color-text-dim: #cfd3e5;
  --color-text-muted: #9397ab;
  --color-text-faint: #595d6c;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-card: 14px;
}

/* accent + error resolve to runtime CSS vars (4.2).
   `@theme inline` is required, not plain `@theme`: plain `@theme` declares
   --color-accent: var(--accent) once at :root, so the utility emits
   `background-color: var(--color-accent)` and the indirection resolves a single
   time — redefining --accent on [data-flavour="…"] never re-resolves it.
   `inline` makes Tailwind inline the token, so the utility emits
   `background-color: var(--accent)` and re-resolves per element. */
@theme inline {
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-accent-ghost: var(--accent-ghost);
  --color-error: var(--error);
  --color-error-soft: var(--error-soft);
  --color-error-ghost: var(--error-ghost);
  --color-error-line: var(--error-line);
  --color-error-text: var(--error-text);
}

@layer base {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: var(--color-ground); }
  body {
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-sans);
    min-height: 100%;
  }
  /* hand-written base rules reference the runtime var directly, not the
     --color-* alias, so they re-resolve per [data-flavour] like the utilities */
  a { color: var(--accent); }
  a:hover { color: color-mix(in srgb, var(--accent) 78%, white); }

  :where(a, button, [role="button"], input, textarea, select):focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

@utility animate-recpulse { animation: recpulse 1.6s ease-in-out infinite; }
@utility animate-ringout  { animation: ringout 2.8s ease-out infinite; }

@keyframes recpulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.82); } }
@keyframes ringout  { 0% { transform:scale(1); opacity:.5; } 100% { transform:scale(1.7); opacity:0; } }

@media (prefers-reduced-motion: reduce) {
  .animate-recpulse, .animate-ringout { animation: none; }
}
```

Token names above are the working set; exact final names are settled during implementation as the Views are converted, but the *categories* (ground/surface/panel/panel-raised/border/border-muted, text scale, accent set, error set) are fixed.

### 4.2 Per-flavour theming — `data-flavour` + CSS variables

Move the four accent tokens and the error palette out of `theme.ts` and into CSS:

```css
@layer base {
  :root {
    --error: oklch(0.734 0.155 25);
    --error-soft:  color-mix(in srgb, var(--error) 20%, transparent);
    --error-ghost: color-mix(in srgb, var(--error) 9%, transparent);
    --error-line:  color-mix(in srgb, var(--error) 34%, transparent);
    --error-text:  oklch(0.86 0.09 25);
    /* default accent = medieval, so components render before a flavour is chosen */
    --accent: oklch(0.734 0.125 289);
  }

  [data-flavour="medieval"] { --accent: oklch(0.734 0.125 289); }
  [data-flavour="sports"]   { --accent: oklch(0.734 0.135 52);  }
  [data-flavour="nature"]   { --accent: oklch(0.734 0.115 158); }
  [data-flavour="fantasy"]  { --accent: oklch(0.734 0.135 344); }

  [data-flavour] {
    --accent-soft:  color-mix(in srgb, var(--accent) 20%, transparent);
    --accent-ghost: color-mix(in srgb, var(--accent) 9%, transparent);
    --accent-line:  color-mix(in srgb, var(--accent) 34%, transparent);
  }
  :root { /* same three derived vars for the pre-selection default */
    --accent-soft:  color-mix(in srgb, var(--accent) 20%, transparent);
    --accent-ghost: color-mix(in srgb, var(--accent) 9%, transparent);
    --accent-line:  color-mix(in srgb, var(--accent) 34%, transparent);
  }
}
```

`App.tsx` wraps the flow in a single element carrying the attribute:

```tsx
<div data-flavour={selectedFlavour ?? "medieval"} className="min-h-screen bg-surface text-text">
  <StepBoundary …><Flow /></StepBoundary>
</div>
```

Consequences:
- The `accent` prop is **removed** from `RecordRing`, `ProcessingView`, `NarratorCarousel`, and any child that only used it for styling. Components use `border-accent`, `bg-accent-ghost`, `text-error`, `shadow-[0_0_44px_var(--color-accent-soft)]`, etc.
- `theme.ts` shrinks to non-visual metadata only: `key`, `name`, `short`, `desc`, `voice`, `art`, `sceneLabel`, `FLAVOUR_ORDER`, `getFlavourTheme`. The `mix()` helper, the `accent*` fields on `FlavourTheme`, and `errorPalette()` are **deleted**.
- The Presenter (`useChroniclePresenter`) still exposes `selectedFlavour` and `theme` metadata; it stops needing to pass `theme.accent` to Views for styling. `ProcessingView`'s `accent` param and `errorPalette` import go away.
- Browser support: `color-mix()` and `oklch()` are the existing baseline (already used in `theme.ts`); no regression. Static fallbacks are not added — same position as today.

### 4.3 Scene layer — inline geometry, responsively scaled

`scenes.ts` stays as-is: it computes shape geometry in a fixed 900×300 coordinate space, which is data, not design tokens. The handoff is explicit: "do not make the shapes responsive individually — scale the whole stage."

Changes are confined to the **stage container** in `LandingView`:
- The stage wrapper scales with a responsive transform / `clamp()`-based width rather than a fixed `900px` + `scale(1.4)`.
- The entire hero scene (scene stack + scrims + caption) is **hidden below the `md` breakpoint** via `hidden md:block`. Mobile shows the neutral panel ground behind the copy and ring, matching the handoff's "shrink the scene band."
- The individual shape `<div>`s keep `style={{}}` — this is the one sanctioned use of inline styles, and the standard will say so.

### 4.4 shadcn/ui — three primitives

Run `shadcn init` targeting `apps/web`, components at `apps/web/src/components/ui/`. Add exactly:

| Component | Replaces |
|---|---|
| `Button` | ReviewStep "Tell the story"; the `<div role="button">` retry actions in `ProcessingView` / `RecordRing` / `NoticeCard`; carousel prev/next arrows |
| `Textarea` | ReviewStep's raw `<textarea>` |
| `Card` | the repeated `1px border / radius-card / bg-panel` panel in `ProcessingView`, `ReviewStep`, `LandingView` "how it works", `NoticeCard`, `EmptyStateShell` |

shadcn's generated tokens (`--background`, `--foreground`, `--primary`, `--ring`, …) are mapped onto the Nocturne `@theme` values so the primitives inherit the dark ground and accent automatically. `Button` variants are trimmed to what is used (`outline` — the default, `ghost`, `error`); unused variants deleted per "no dead code."

Not added: `Dialog`, shadcn `Carousel`, `Tabs`, `Sonner`. `NarratorCarousel`, `RecordRing`, the progress bars, and the scene layer remain hand-built — they are too specific to the design to benefit from a generic primitive.

### 4.5 Responsive plan, per View

Mobile-first. Breakpoints are Tailwind defaults; the meaningful one is `md` (768px) for desktop layout, `sm` (640px) for nav.

| View | Changes |
|---|---|
| **LandingView** | Container `max-w-[1280px] mx-auto px-6 md:px-12`. Hero grid `grid-cols-1 md:grid-cols-[1.15fr_.85fr]` — ring/notice stacks **below** the copy on mobile. H1 `text-3xl md:text-[52px]` (fluid via `clamp()` acceptable). Header: full nav `md:flex`, logo-only with the links collapsed below `sm`. Scene stage `hidden md:block` + scaled (4.3). "How it works" card full-width, fluid padding. |
| **NarratorCarousel** | Track offset stops being `translateX(200 - i*276)` px arithmetic; becomes a `%`-based transform (`translateX(calc(50% - …))`) or a `scroll-snap-x` flex row. Cards `w-44 md:w-[258px]` (~176px mobile). Touch **swipe** via pointer events (threshold ~40px → prev/next). Arrows become `Button` (`variant="outline" size="icon"`). Glow blob width becomes `clamp()` / `%`. Dots unchanged. |
| **ReviewStep** | `max-w-[760px] mx-auto my-16 md:my-20 px-6 md:px-12`. Card + Textarea + Button primitives. |
| **ProcessingView** | Same container. `Card` primitive for the outer frame; header row wraps on narrow. Progress bars already `%`-based — keep. Retry block uses `Button`. |
| **ChronicleView** | Two-column layout `grid-cols-1 md:grid-cols-2` — collapses to **transcript then chronicle** stacked on mobile, per handoff. Audio player and "tell it again" pills wrap. |
| **NoticeCard / EmptyStateShell / RecordRing / StepBoundary** | `Card` where applicable; `max-w-*` + fluid width so they never exceed the viewport; `RecordRing`'s 200px ring gets a `clamp()` / `sm:` size step so it fits a 360px screen with padding. |

Every existing `data-testid` is preserved on the same semantic element. Where a `<div role="button">` becomes `<Button>`, the `data-testid` moves onto the `<Button>`.

### 4.6 Accessibility

- `:focus-visible` ring: `2px solid var(--accent)`, `2px` offset — defined once in the base layer (4.1), applies to all interactive elements. Elements currently rendered as `<div role="button">` that become `<Button>` get real keyboard focus for free; any that stay as `<div role="button">` get `tabIndex={0}` + `onKeyDown` Enter/Space, or are converted to `<button>`.
- `prefers-reduced-motion`: `recpulse` and `ringout` are disabled under the media query (4.1). The carousel track transition also respects it.

## 5. Sequencing

Coexistence over big-bang: inline styles and Tailwind classes work side by side, so Views convert one at a time and the test suite stays green throughout.

**Task 1 — Tailwind + shadcn setup.**
Add deps, wire `@tailwindcss/vite`, write the new `index.css` (`@theme` tokens, base layer, flavour CSS vars, keyframes, reduced-motion). `shadcn init` + add `Button`, `Textarea`, `Card`, map their tokens to Nocturne. No View changes. Gate: `pnpm --filter web build` passes, `pnpm --filter web test` passes, app renders visually unchanged.

**Task 2 — Shell + de-threading.**
`App.tsx` gets the `data-flavour` wrapper. Remove the `accent` string from the Presenter's View props and from `RecordRing` / `ProcessingView` / `NarratorCarousel` / `LandingView` signatures; those components read the accent from CSS instead. Shrink `theme.ts` (delete `mix`, `errorPalette`, `accent*` fields). Update the affected component tests. Gate: build + tests green; accent still visually correct on all four flavours.

**Tasks 3–10 — One View per task**, in this order (leaf-first, so parents compose already-converted children):
3. `RecordRing`
4. `NoticeCard`
5. `NarratorCarousel` (includes the track-math rewrite + swipe)
6. `ReviewStep`
7. `ProcessingView`
8. `EmptyStateShell` + `StepBoundary`
9. `ChronicleView`
10. `LandingView` (last — composes 3, 4, 5; includes the responsive hero grid + scene scaling)

Each task: convert that file's inline styles to Tailwind, apply its row from the 4.5 table, keep every `data-testid`, add focus/motion affordances, update that file's test. Gate per task: that View's test + the full suite pass; manual check at 375px / 768px / 1440px widths.

**Task 11 — Cleanup + docs.**
Delete any now-unused imports/helpers. Confirm `index.css` has no leftover hand-rolled rules that a utility now covers. Update `README.md` (project structure note that `apps/web` uses Tailwind + shadcn; commands unchanged). Add the Styling section to `docs/standards/frontend-architecture-standard.md`, per §6 below. Run the Playwright suite (`tests/web/full-journey.spec.ts`) and fix any selector drift. Gate: full unit suite + Playwright green.

## 6. Standard document change

Add a new section to `docs/standards/frontend-architecture-standard.md`, "**Styling**", placed after §3 (Components and roles). Content:

- **Utility-first with Tailwind.** No per-component `.css` / `.module.css` files. No CSS-in-JS. Styling is Tailwind utility classes in the View layer.
- **`style={{}}` is reserved for computed geometry** — values a component calculates at runtime (generative scene coordinates, a progress-bar width, a transform derived from an index). Design values (color, spacing, radius, type scale) are never inline.
- **Design tokens are CSS custom properties**, declared once in the Tailwind `@theme` and consumed through utilities. No hardcoded hex, px spacing, or font stacks in components.
- **Runtime theming** (dark/light, per-flavour, per-tenant) is a `data-*` attribute on a wrapper element driving a CSS-variable cascade — **not** a value threaded through component props. A component reacts to theme by using a token utility whose variable is redefined upstream.
- **shadcn/ui for primitives.** Generated into the consuming app (`apps/<app>/src/components/ui/`), tokens mapped to the project `@theme`. Unused variants are deleted. A primitive is promoted to `packages/ui` only when a *second* app consumes it — the same promotion rule as Model hooks (§2).
- **Accessibility is not optional:** a visible `:focus-visible` ring on every interactive element, and `prefers-reduced-motion` honoured by every non-essential animation.
- Fix the passing mention in §1 (`ui/ # Shared UI primitives (e.g. shadcn/ui …)`) to cross-reference this section.

## 7. Testing

- **Unit (Vitest + RTL):** existing per-component tests are updated as each View converts. They assert behaviour and `data-testid` presence, not class names, so most survive the conversion untouched. New assertions: `data-flavour` attribute is set on the wrapper; reduced-motion / focus-ring are not unit-tested (visual/integration concern).
- **E2E (Playwright, `tests/web/full-journey.spec.ts`):** must stay green. Run after Task 2 and after Task 11. Any selector that breaks is fixed by restoring the `data-testid`, not by loosening the test.
- **Manual responsive check** per View task at 375px, 768px, 1440px. Task 10 (Landing) additionally checked at 360px and ≥1920px (the wide-margin case that started this).
- No new test framework. No visual-regression tooling added in this pass.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Carousel track-math rewrite changes the selected-card centering subtly | Task 5 is isolated; compare against the handoff mock side by side; the `.45s cubic-bezier(.22,.8,.26,1)` transition spec is preserved exactly |
| shadcn token mapping fights the Nocturne dark ground (light defaults leak) | Task 1 gate includes a visual check; map `--background`/`--foreground`/`--card`/`--border`/`--ring` explicitly rather than relying on shadcn's defaults |
| `color-mix` in `[data-flavour]` derived vars not recomputing on flavour change | Derived vars are defined on the same `[data-flavour]` selector as `--accent`, so they recascade together; verified in Task 2 gate |
| Hidden scene `<md` is a visible regression to someone expecting it on tablet | Matches the handoff's explicit responsive note; `md` = 768px, tablets portrait get the neutral ground, landscape get the scene |
| Playwright selector drift discovered late | Run Playwright at Task 2, not only Task 11 |

## 9. Open questions

None blocking. Token names in §4.1 are provisional and finalised during Task 1; the categories are fixed.
