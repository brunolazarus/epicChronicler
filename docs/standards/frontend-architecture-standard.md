# Frontend/Monorepo Architecture Standard

A reusable pattern for structuring a product monorepo with a typed, contract-first API and a layered (Model/Presenter/View) frontend across web and mobile. Not tied to any one project — names below are illustrative (`ExampleResource`, `apps/api`, etc.); swap in real domain nouns when applying this.

This document merges two prior variations of the same underlying pattern into one crystallized standard, with the reconciliation decisions called out explicitly where the sources disagreed.

---

## 1. Monorepo layout

```
apps/
  api/       # Backend: Zod-validated routes, one module per resource
  web/       # React + Vite — MVP pattern, web-specific Presenters/Views
  mobile/    # React Native (Expo) — same pattern, mobile-specific Presenters/Views
             # (fine for this to be scaffolded-but-empty until the web app has proven the pattern)

packages/
  api-client/  # Generated TypeScript types + typed fetch client — THE shared interface artifact
  core/        # Shared MVP "Model" layer — TanStack Query hooks, calls packages/api-client only
  ui/          # Shared UI primitives (e.g. shadcn/ui for web, NativeWind for mobile) — see §4 Styling
```

Stack endorsements this standard is built around: **React**, **TanStack Query**, **Turborepo**, **Zod**. These aren't "or equivalent" placeholders, they're the actual choices, one monorepo (Turborepo), not separate repos per app. The payoff is the shared `api-client` and `core` packages — splitting the repo loses that for no benefit at this scale.

---

## 2. Core principles

- **Contract-first, via code, not a hand-maintained spec.** The backend's Zod schemas/route definitions generate the OpenAPI spec; `packages/api-client`'s types and fetch client are generated from that spec. The spec is a build artifact, not a source of truth someone edits by hand.
- **MVP layering, strictly one-directional.** View → Presenter → Model. Views never call Models directly except for simple leaf components avoiding prop drilling; orchestrator-level components always go through a Presenter.
- **Composition over configuration, in the View layer.** Views are built by composing small, single-purpose components together (children/slots), not by growing one component's prop list to cover every variant. If a component's props are turning into a small config language (`variant`, `showX`, `hideY`, `mode`), that's the signal to split it into composed pieces instead. This is a core reuse strategy, not a nice-to-have, prefer reaching for an existing small component and composing around it over adding a new prop to an existing one.
- **Compound components are the mechanism for stateful multi-part UI**, not just a naming convention for split-up JSX. When a component has multiple internal parts that share state or coordinate behavior (a card with an icon, body, and an optional detail strip; a menu with a trigger and items), the parent owns the shared state and exposes it to its parts via context, and the parts are exposed as its static properties: `<ExampleCard><ExampleCard.Icon /><ExampleCard.Body>…</ExampleCard.Body><ExampleCard.Actions>…</ExampleCard.Actions></ExampleCard>`. The tell that a component needs this instead of more optional props: props that are only ever passed together, or a boolean/`undefined` triplet (`fileName`/`value`/`limit`-shaped) that exists purely to toggle a chunk of markup on or off. Reach for compound components before reaching for another optional prop.
- **Promotion, not preemption.** A Model hook starts local to the app/feature that needs it. It only gets promoted to `packages/core` when a *second* app or feature genuinely needs the same resource. Don't centralize speculatively.
- **Coexistence over big-bang migration.** When introducing a new pattern (a new auth model, a new API layer) alongside an existing one, let both run simultaneously and retire the old one piece by piece. Don't block the new pattern on migrating everything at once.
- **Suspense-first, not manual loading/error branching.** Loading and error states are handled structurally (Suspense boundaries, Error boundaries), not via `isLoading`/`isError` checks sprinkled through component bodies.

---

## 3. Components and roles

| Package/App | Role |
|---|---|
| `apps/api` | Zod-validated route handlers (one set per resource module), backed by a business-logic layer that's unchanged by this pattern. Zod schemas double as request validation and the OpenAPI source. A shared error-envelope schema is referenced by every endpoint's failure responses, so every error the frontend receives has the same shape. |
| `packages/api-client` | Generated TypeScript types + a typed fetch client. This is the literal shared interface between backend and every frontend, generated, not written by hand, and it's the one artifact both `apps/web` and `apps/mobile` depend on to talk to the backend. |
| `packages/core` | Shared **Model** hooks (TanStack Query), calling `packages/api-client` exclusively, never a database or BaaS client directly. Holds hooks for resources genuinely shared across apps. **Not** the exclusive home for all Model hooks, see the promotion principle above. |
| `packages/ui` | Shared, presentational-only UI primitives. No data-fetching, no business logic. |
| `apps/web`, `apps/mobile` | Each owns its own **Presenter** (`use*Presenter`) and **View** (render-only) layers per the MVP pattern. Views favor composing small components over configuring large ones. Each app may also define **local** Model hooks for app-specific resources that don't need cross-app sharing. |

---

## 4. Styling

- **Utility-first with Tailwind.** No per-component `.css` / `.module.css` files, no CSS-in-JS. Styling is Tailwind utility classes in the View layer. Tailwind v4's CSS-first config (`@theme` in one entry stylesheet) is the endorsed setup — no `tailwind.config.js`.
- **`style={{}}` is reserved for computed geometry** — values a component calculates at runtime (generative scene coordinates, a progress-bar width, a gradient that interpolates a token). Design values — colour, spacing, radius, type scale — are never inline.
- **Design tokens are CSS custom properties**, declared once in the Tailwind `@theme` and consumed through utilities. No hardcoded hex, px spacing, or font stacks in components.
- **Runtime theming** (dark/light, per-flavour, per-tenant) is a `data-*` attribute on a wrapper element driving a CSS-variable cascade — **not** a value threaded through component props. A component reacts to theme by using a token utility whose variable is redefined upstream; to show a *sibling's* theme (e.g. a picker listing every option), put the `data-*` attribute on that element's own subtree.
  In Tailwind v4 the token indirection (`--color-accent: var(--accent)`) **must** be declared in `@theme inline`, not plain `@theme`. Plain `@theme` declares `--color-accent` once at `:root`, so utilities emit `background-color: var(--color-accent)` and the indirection resolves a single time — redefining `--accent` downstream never re-resolves it, and only the rules that reference `var(--accent)` directly recolour. `@theme inline` inlines the token so utilities emit `background-color: var(--accent)` and re-resolve per element. Hand-written base-layer rules (link colour, the focus ring) must reference the runtime variable directly for the same reason.
- **shadcn/ui for primitives.** Generated (or hand-written to match) into the consuming app at `apps/<app>/src/components/ui/`, with shadcn's tokens mapped to the project `@theme`. Unused variants are deleted. A primitive is promoted to `packages/ui` only when a *second* app consumes it — the same promotion rule as Model hooks (§2).
- **Accessibility is not optional:** a visible `:focus-visible` ring on every interactive element, and `prefers-reduced-motion` honoured by every non-essential animation.

---

## 5. Data flow

```
View
  → Presenter (use*Presenter hook — the only layer allowed to hold orchestration logic)
  → Model (packages/core, or local to the app — a thin data-fetching hook)
  → packages/api-client (generated, typed fetch — carries the auth token)
  → apps/api (Zod-validated route handler)
  → business logic layer (unchanged by this pattern)
  → database / BaaS client (server-side only)
```

**Reconciliation decision:** one of the two source patterns this standard merges had Model hooks in `packages/core` holding a direct BaaS client context (e.g. a Supabase client) alongside the API-backed hooks. The other had Model hooks call the generated API client exclusively, with the BaaS client living only inside `apps/api`. This standard adopts the latter as the rule, **with one named exception**: a thin, session-only auth client (holding the login session and issuing the bearer token) may live client-side in `packages/core`, since session/token management is what most BaaS auth SDKs are actually good at. Every other resource, all real domain data, goes through `packages/api-client`. The backend is the only thing that talks to the database.

---

## 6. Error and loading handling

- Models use suspense-style query hooks (e.g. TanStack Query v5's `useSuspenseQuery`), not manual `isLoading`/`isError` branches in component bodies.
- Loading state: wrap Views in a `<Suspense fallback={...}>` at the feature-section level, not per-component. One meaningful loading boundary per section of a screen, not one per query.
- Error state: errors thrown by suspense queries propagate to the nearest `ErrorBoundary`, one per major feature section. This is the default path for the vast majority of errors, and it requires no manual plumbing through Presenters.
- Presenters remain the escape hatch for errors that need custom handling instead of the default boundary, most commonly a 401 triggering a redirect to a login screen, via the query library's own per-query error handling. This is the exception path, not the default.

**Named, deliberate trade-off:** early in a build, it's reasonable for `ErrorBoundary` fallbacks to render the backend's error-envelope `message` field fairly directly, rather than a fully sanitized, genericized message. A real error beats a polished-but-vague "something went wrong" while the product is still being actively built and errors are still diagnostic signal. This is explicitly **not** the final UX, track it as a known temporary decision so it doesn't quietly become permanent by default.

---

## 7. Testing philosophy

- **Contract drift is the primary risk this pattern is designed against**, not runtime bugs in any one layer. The enforcement point is a CI job that regenerates `packages/api-client` from the live backend and diffs it against what's committed; any undeclared change to the backend's real response shape fails the build.
- **Schema validation is inherent to the stack choice, not an added task.** Zod validates every request and response against its schema as part of normal request handling, a route that returns something violating its own declared schema fails in dev/test for free, no separate contract-testing tool required for that layer.
- **Existing backend test patterns carry over unchanged** when this pattern is introduced into an already-tested codebase. Don't invent a new backend testing approach alongside the new frontend architecture, migrate the underlying logic behind the new schema-validated routes, and the existing tests keep proving it works.
- **Frontend testability is a property of the MVP boundaries themselves, not a new tooling decision.** Models are thin data-fetching wrappers, Presenters are pure transformation functions, Views are render-only. Each is independently testable *because* the interfaces between them are clean, this is true regardless of which test runner ends up being used, and picking that runner is a separate, smaller decision.

---

## When this standard doesn't apply

- A genuinely single-surface app (one frontend, no mobile counterpart planned) doesn't need the monorepo/shared-package structure, apply the MVP layering and Suspense-first error handling within a single app instead.
- A backend stack that can't validate request/response shape with Zod (or an equivalent schema-first validator) loses the "schema validation is free" property in §7, decide explicitly whether a separate contract-testing layer is worth adding to compensate.
