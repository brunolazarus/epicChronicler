# Web Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-page web demo (`apps/api/src/static/index.html`) as a proper React + Vite app (`apps/web`) using an MVP (Model/Presenter/View) architecture, with a generated typed API client (`packages/api-client`), implementing the Claude Design visual/UX handoff (Landing / Processing / Chronicle views, the "Nocturne" design system, per-flavour CSS scenes, and the five designed error/edge states) instead of today's plain styling.

**Architecture:** `apps/web` is a Vite-built React SPA served as static assets from the existing `apps/api` Hono process (same Railway service, no new deployment target). Data-fetching lives in local Model hooks (TanStack Query), orchestration lives in one Presenter hook driving a four-stage flow (`landing → review → processing → result`), Views are render-only and composed together. `packages/api-client` is generated from `apps/api`'s existing OpenAPI spec and is the only new shared package — per the "promotion, not preemption" principle, `packages/core` and `packages/ui` are *not* created in this pass since there is only one frontend app.

**Tech Stack:** React 18, Vite 5, TanStack Query v5, `openapi-typescript` + `openapi-fetch`, `react-error-boundary`, Vitest + React Testing Library, Playwright (existing suite, updated).

**Spec:** `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` (see its 2026-08-27 addendum) and the design handoff at `docs/standards/design_handoff_epic_chronicler/` (README + the two bundled HTML mocks: `epic-chronicler-landing.html`, `epic-chronicler-error-states.html`).

## Global Constraints

- No new Railway service, no new deployment target — the built app is served by the existing `apps/api` Hono process, same as today's static file.
- No auth/accounts work — there is no login, no bearer token, nothing in this plan requires one.
- `packages/core` and `packages/ui` are not created in this pass.
- The 5 existing API endpoints (`/api/v1/pipeline/upload`, `/jobs/:id`, `/generate`, `/audio/:key`, `/flavours`) are consumed as-is — no backend route or logic changes. Two designed states are implemented with client-side simplifications instead of new backend surface: unsupported-format validation runs client-side before upload; a failed pipeline stage retries the whole `/generate` call rather than resuming a single stage (see spec addendum).
- Every interactive element the existing Playwright suite selects on gets a `data-testid` attribute.
- Visual output must match the Claude Design handoff (Nocturne system: dark grounds `#161826`/`#131424`/`#1b1d2c`, per-flavour OKLCH accents, Inter + JetBrains Mono, 14px card radius) — this is a visual/UX rebuild on top of the architecture migration, not a like-for-like restyle of today's plain page.
- Flavour is selected on the Landing carousel *before* recording, not after the transcript exists — `selectedFlavour` lives in Presenter state independent of step order, so this is a UI sequencing change, not a structural one.
- A transcript-review step (`review` stage) is inserted between successful transcription and the paid `/generate` call, even though the handoff has no screen for it — removing the existing review-before-spend gate is a product regression, not a simplification (see spec addendum).
- "Tell it again as X" pills and the "Start a new chronicle" action reset the flow back to `landing` — they do not call `/generate` again with the old transcript. No true regeneration is built in this pass.
- Errors use a fixed semantic red (`oklch(0.734 0.155 25)`), independent of the flavour accent, matching the error-states bundle. No invented error codes (`ERR_REWRITE_UPSTREAM` etc.) — real `job.failedReason` strings are shown instead.

---

### Task 1: Scaffold `apps/web` (Vite + React + TypeScript)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`

**Interfaces:**
- Produces: a `web` pnpm workspace package (picked up automatically by the existing `apps/*` glob in `pnpm-workspace.yaml`), `pnpm --filter web dev` runs a Vite dev server, `pnpm --filter web build` produces `apps/web/dist/`.

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.59.0",
    "react-error-boundary": "^4.1.0",
    "@chronicler/api-client": "workspace:*"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

- [ ] **Step 2: Write `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Note: this uses `"moduleResolution": "bundler"`, not the `NodeNext` used by `apps/api`/`packages/core`. That's expected — `apps/web` is bundled by Vite for the browser, not run directly by Node.

- [ ] **Step 3: Write `apps/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

The dev-server proxy forwards `/api/*` calls to `apps/api` (started separately via `pnpm dev` at the root) so `apps/web`'s dev server can be run standalone on its own port while still hitting the real backend.

- [ ] **Step 4: Write `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <title>Chronicler — Every night out is a legend waiting for a narrator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Fonts load from Google Fonts directly (`<link>` tags), not the embedded base64 woff2 the design bundle ships for offline viewing — that embedding exists only so the handoff mock opens standalone in a browser.

- [ ] **Step 5: Write `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.js'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 6: Write a placeholder `apps/web/src/App.tsx`**

```tsx
export default function App() {
  return (
    <div>
      <h1>Chronicler</h1>
    </div>
  )
}
```

This gets fully built out in Task 20 — for now it just proves the scaffold renders.

- [ ] **Step 7: Write `apps/web/src/index.css` — global resets and keyframes only**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  background: #101120;
}

body {
  margin: 0;
  background: #161826;
  color: #e9e9ed;
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100%;
}

a {
  color: #b5abfc;
}

a:hover {
  color: #d2cefd;
}

@keyframes recpulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.82);
  }
}

@keyframes ringout {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}
```

Component-specific styling lives inline (as `style={{...}}` objects sourced from `theme.ts`, Task 9) throughout this plan, matching how the design handoff itself is authored — only resets, fonts and the two shared animation keyframes are global. This replaces the old plain-theme stylesheet entirely; nothing from `apps/api/src/static/index.html`'s CSS is ported, since none of its classes (`.card`, `.flavour`, `.record-btn`, etc.) survive the visual rebuild.

- [ ] **Step 8: Install dependencies and verify the dev server**

Run: `pnpm install`
Run: `pnpm --filter web dev`

Expected: Vite prints a local dev URL (e.g. `http://localhost:5173`); opening it shows an "H1: Chronicler" heading on the `#161826` dark background.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Vite + React app with Nocturne base styles"
```

---

### Task 2: `packages/api-client` — generated typed client

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/client.ts`
- Generate: `packages/api-client/src/types.gen.ts` (via `openapi-typescript`, not hand-written)

**Interfaces:**
- Produces: `import { client } from '@chronicler/api-client'` — an `openapi-fetch` client instance typed against `apps/api`'s live OpenAPI spec, exposing `client.GET(path, options)` / `client.POST(path, options)` with full request/response types inferred from the path string.

- [ ] **Step 1: Write `packages/api-client/package.json`**

```json
{
  "name": "@chronicler/api-client",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js"
    }
  },
  "scripts": {
    "generate": "openapi-typescript http://localhost:3000/openapi.json -o src/types.gen.ts",
    "build": "tsup src/client.ts --format esm --dts --out-dir dist",
    "check-drift": "openapi-typescript http://localhost:3000/openapi.json -o /tmp/types.gen.check.ts && diff src/types.gen.ts /tmp/types.gen.check.ts"
  },
  "dependencies": {
    "openapi-fetch": "^0.13.0"
  },
  "devDependencies": {
    "openapi-typescript": "^7.4.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Write `packages/api-client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`

- [ ] **Step 4: Start `apps/api` so its OpenAPI spec is servable**

Run (separate terminal, leave running): `pnpm dev`
Expected: log line `✅ Chronicler API running on http://localhost:3000`

- [ ] **Step 5: Generate `types.gen.ts` from the live spec**

Run: `pnpm --filter @chronicler/api-client generate`

Expected: `packages/api-client/src/types.gen.ts` is created, exporting a `paths` interface (and `components`) describing all 5 pipeline routes.

- [ ] **Step 6: Write `packages/api-client/src/client.ts`**

```ts
import createClient from 'openapi-fetch'
import type { paths } from './types.gen.js'

export const client = createClient<paths>({ baseUrl: '' })
```

An empty `baseUrl` means every call resolves relative to whatever origin `apps/web` is served from — same-origin in both dev (via the Vite proxy from Task 1) and production (same Hono process), so no CORS handling is ever needed.

- [ ] **Step 7: Build the package and verify it type-checks**

Run: `pnpm --filter @chronicler/api-client build`

Expected: `packages/api-client/dist/client.js` and `client.d.ts` are produced with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/api-client
git commit -m "feat(api-client): generate typed client from apps/api's OpenAPI spec"
```

---

### Task 3: Vitest + React Testing Library harness

**Files:**
- Create: `apps/web/src/test-setup.ts`
- Create: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `apps/web/src/App.tsx` (Task 1's placeholder)
- Produces: a working `pnpm --filter web test` command other tasks' tests will run under.

- [ ] **Step 1: Write `apps/web/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Write the failing test — `apps/web/src/App.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.js'

describe('App', () => {
  it('renders the Chronicler heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Chronicler' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it currently passes (harness smoke test)**

Run: `pnpm --filter web test`
Expected: PASS — 1 test passed. (Harness-verification step; every subsequent task follows a real red→green cycle.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/test-setup.ts apps/web/src/App.test.tsx apps/web/vite.config.ts apps/web/package.json
git commit -m "test(web): add Vitest + React Testing Library harness"
```

---

### Task 4: `StepBoundary` — shared Suspense + ErrorBoundary wrapper

**Files:**
- Create: `apps/web/src/views/StepBoundary.tsx`
- Test: `apps/web/src/views/StepBoundary.test.tsx`

**Interfaces:**
- Produces: `<StepBoundary fallback={<Spinner/>}>{children}</StepBoundary>` — wraps the `useFlavours` suspense query in `LandingView` (Task 15). Errors thrown by a child are caught here and rendered as the raw error message.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepBoundary } from './StepBoundary.js'

function Boom(): never {
  throw new Error('boom detail')
}

describe('StepBoundary', () => {
  it('renders children when there is no error', () => {
    render(<StepBoundary fallback={<p>loading</p>}>{<p>content</p>}</StepBoundary>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders the raw error message when a child throws', () => {
    render(
      <StepBoundary fallback={<p>loading</p>}>
        <Boom />
      </StepBoundary>,
    )
    expect(screen.getByText('boom detail')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './StepBoundary.js'`

- [ ] **Step 3: Write `apps/web/src/views/StepBoundary.tsx`**

```tsx
import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }: { error: Error }) {
  return <div style={{ color: '#e9e9ed', fontFamily: 'Inter, sans-serif' }}>✗ {error.message}</div>
}

export function StepBoundary({
  fallback,
  children,
}: {
  fallback: ReactNode
  children: ReactNode
}) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/StepBoundary.tsx apps/web/src/views/StepBoundary.test.tsx
git commit -m "feat(web): add StepBoundary (Suspense + ErrorBoundary)"
```

---

### Task 5: Model hooks — `useFlavours`, `useUploadAudio`, `useJobPoll`, `useGenerateChronicle`

**Files:**
- Create: `apps/web/src/models/useFlavours.ts`
- Create: `apps/web/src/models/useJobPoll.ts`
- Create: `apps/web/src/models/useUploadAudio.ts`
- Create: `apps/web/src/models/useGenerateChronicle.ts`
- Test: `apps/web/src/models/useFlavours.test.tsx`
- Test: `apps/web/src/models/useJobPoll.test.tsx`
- Test: `apps/web/src/models/useUploadAudio.test.tsx`
- Test: `apps/web/src/models/useGenerateChronicle.test.tsx`

**Interfaces:**
- Consumes: `client` from `@chronicler/api-client` (Task 2)
- Produces:
  - `useFlavours(): UseSuspenseQueryResult<Flavour[]>` where `Flavour = { key: string; name: string; description: string }`
  - `useJobPoll(jobId: string | null): UseQueryResult<JobStatus>` where `JobStatus = { status: string; progress: number; result: unknown; error: string | null }`
  - `useUploadAudio(): UseMutationResult<{ jobId: string }, Error, File>`
  - `useGenerateChronicle(): UseMutationResult<{ jobId: string }, Error, { transcripts: { speaker: string; text: string }[]; flavour: string }>`

Note on suspense vs. regular queries: `useFlavours` has no "not ready to ask yet" state, so it's a clean `useSuspenseQuery`. `/upload` and `/generate` are actions with side effects, so they're `useMutation`. `useJobPoll` can't run before a `jobId` exists, so it's a regular `useQuery` with `enabled: jobId !== null`.

- [ ] **Step 1: Write the failing test for `useFlavours`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { client } from '@chronicler/api-client'
import { useFlavours } from './useFlavours.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <Suspense fallback="loading">{children}</Suspense>
    </QueryClientProvider>
  )
}

describe('useFlavours', () => {
  it('returns the flavour list from the API', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useFlavours(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual([
      { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
    ])
    expect(client.GET).toHaveBeenCalledWith('/api/v1/pipeline/flavours')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './useFlavours.js'`

- [ ] **Step 3: Write `apps/web/src/models/useFlavours.ts`**

```ts
import { useSuspenseQuery } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface Flavour {
  key: string
  name: string
  description: string
}

export function useFlavours() {
  return useSuspenseQuery({
    queryKey: ['flavours'],
    queryFn: async () => {
      const { data, error } = await client.GET('/api/v1/pipeline/flavours')
      if (error) throw new Error('Failed to load flavours')
      return data as Flavour[]
    },
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Write the failing test for `useJobPoll`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useJobPoll } from './useJobPoll.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useJobPoll', () => {
  it('does not fetch when jobId is null', () => {
    renderHook(() => useJobPoll(null), { wrapper })
    expect(client.GET).not.toHaveBeenCalled()
  })

  it('fetches job status when jobId is set', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { status: 'completed', progress: 100, result: { transcript: 'hi' }, error: null },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useJobPoll('job-1'), { wrapper })

    await waitFor(() => expect(result.current.data?.status).toBe('completed'))
    expect(client.GET).toHaveBeenCalledWith('/api/v1/pipeline/jobs/{id}', {
      params: { path: { id: 'job-1' } },
    })
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './useJobPoll.js'`

- [ ] **Step 7: Write `apps/web/src/models/useJobPoll.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface JobStatus {
  status: string
  progress: number
  result: unknown
  error: string | null
}

export function useJobPoll(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await client.GET('/api/v1/pipeline/jobs/{id}', {
        params: { path: { id: jobId! } },
      })
      if (error) throw new Error('Failed to poll job')
      return data as JobStatus
    },
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 600
    },
  })
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 9: Write the failing test for `useUploadAudio`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useUploadAudio } from './useUploadAudio.js'

vi.mock('@chronicler/api-client', () => ({
  client: { POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useUploadAudio', () => {
  it('posts the file and resolves with a jobId', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { jobId: 'job-1', status: 'queued' },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useUploadAudio(), { wrapper })
    const file = new File(['audio-bytes'], 'recording.webm', { type: 'audio/webm' })

    result.current.mutate(file)

    await waitFor(() => expect(result.current.data).toEqual({ jobId: 'job-1' }))
    expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/upload', {
      body: { audio: file },
      bodySerializer: expect.any(Function),
    })
  })
})
```

- [ ] **Step 10: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './useUploadAudio.js'`

- [ ] **Step 11: Write `apps/web/src/models/useUploadAudio.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export function useUploadAudio() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('audio', file)
      const { data, error } = await client.POST('/api/v1/pipeline/upload', {
        body: { audio: file } as never,
        bodySerializer: () => form,
      })
      if (error) throw new Error('Failed to upload audio')
      return { jobId: (data as { jobId: string }).jobId }
    },
  })
}
```

- [ ] **Step 12: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 13: Write the failing test for `useGenerateChronicle`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useGenerateChronicle } from './useGenerateChronicle.js'

vi.mock('@chronicler/api-client', () => ({
  client: { POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useGenerateChronicle', () => {
  it('posts transcripts + flavour and resolves with a jobId', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { jobId: 'job-2', status: 'queued' },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useGenerateChronicle(), { wrapper })

    result.current.mutate({
      transcripts: [{ speaker: 'Narrator', text: 'a story' }],
      flavour: 'medieval',
    })

    await waitFor(() => expect(result.current.data).toEqual({ jobId: 'job-2' }))
    expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/generate', {
      body: {
        transcripts: [{ speaker: 'Narrator', text: 'a story' }],
        flavour: 'medieval',
      },
    })
  })
})
```

- [ ] **Step 14: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './useGenerateChronicle.js'`

- [ ] **Step 15: Write `apps/web/src/models/useGenerateChronicle.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface Transcript {
  speaker: string
  text: string
}

export function useGenerateChronicle() {
  return useMutation({
    mutationFn: async (input: { transcripts: Transcript[]; flavour: string }) => {
      const { data, error } = await client.POST('/api/v1/pipeline/generate', {
        body: input,
      })
      if (error) throw new Error('Failed to generate chronicle')
      return { jobId: (data as { jobId: string }).jobId }
    },
  })
}
```

- [ ] **Step 16: Run full test suite to verify everything passes**

Run: `pnpm --filter web test`
Expected: PASS — all Model tests green.

- [ ] **Step 17: Commit**

```bash
git add apps/web/src/models
git commit -m "feat(web): add Model hooks (flavours, upload, job polling, generate)"
```

---

### Task 6: Presenter — `useChroniclePresenter` (baseline)

**Files:**
- Create: `apps/web/src/presenters/useChroniclePresenter.ts`
- Test: `apps/web/src/presenters/useChroniclePresenter.test.tsx`

**Interfaces:**
- Consumes: `useFlavours`, `useUploadAudio`, `useJobPoll`, `useGenerateChronicle` (Task 5)
- Produces the baseline shape below. **Task 10 extends this same file** with the stage machine, mic/upload-validation errors, and pipeline-stage derivation once those dependencies (Tasks 7–9) exist — this task establishes the core data flow first.
```ts
interface ChroniclePresenterBaseline {
  flavours: Flavour[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
  transcript: string
  setTranscript: (text: string) => void
  uploadStatus: 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'
  uploadAudio: (file: File) => void
  uploadError: string | null
  canGenerate: boolean
  generate: () => void
  generateStatus: 'idle' | 'generating' | 'done' | 'error'
  chronicleText: string | null
  audioKey: string | null
  generateError: string | null
}
```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { client } from '@chronicler/api-client'
import { useChroniclePresenter } from './useChroniclePresenter.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <Suspense fallback="loading">{children}</Suspense>
    </QueryClientProvider>
  )
}

describe('useChroniclePresenter', () => {
  it('loads flavours and lets you select one', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })

    await waitFor(() => expect(result.current.flavours.length).toBe(1))
    expect(result.current.selectedFlavour).toBeNull()

    act(() => result.current.selectFlavour('medieval'))
    expect(result.current.selectedFlavour).toBe('medieval')
  })

  it('canGenerate is true only once transcript and flavour both exist', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
    await waitFor(() => expect(result.current.flavours.length).toBe(1))

    expect(result.current.canGenerate).toBe(false)

    act(() => result.current.setTranscript('a story'))
    expect(result.current.canGenerate).toBe(false)

    act(() => result.current.selectFlavour('medieval'))
    expect(result.current.canGenerate).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './useChroniclePresenter.js'`

- [ ] **Step 3: Write `apps/web/src/presenters/useChroniclePresenter.ts`**

```ts
import { useState, useMemo } from 'react'
import { useFlavours } from '../models/useFlavours.js'
import { useUploadAudio } from '../models/useUploadAudio.js'
import { useJobPoll } from '../models/useJobPoll.js'
import { useGenerateChronicle } from '../models/useGenerateChronicle.js'

export function useChroniclePresenter() {
  const { data: flavours } = useFlavours()

  const [selectedFlavour, setSelectedFlavour] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')

  const uploadMutation = useUploadAudio()
  const [uploadJobId, setUploadJobId] = useState<string | null>(null)
  const uploadPoll = useJobPoll(uploadJobId)

  const generateMutation = useGenerateChronicle()
  const [generateJobId, setGenerateJobId] = useState<string | null>(null)
  const generatePoll = useJobPoll(generateJobId)

  const uploadStatus = useMemo(() => {
    if (uploadMutation.isError || uploadPoll.data?.status === 'failed') return 'error' as const
    if (!uploadJobId) return uploadMutation.isPending ? ('uploading' as const) : ('idle' as const)
    if (uploadPoll.data?.status === 'completed') return 'done' as const
    return 'transcribing' as const
  }, [uploadMutation.isError, uploadMutation.isPending, uploadJobId, uploadPoll.data])

  const [seededJobId, setSeededJobId] = useState<string | null>(null)
  if (
    uploadPoll.data?.status === 'completed' &&
    uploadJobId !== seededJobId &&
    typeof (uploadPoll.data.result as { transcript?: string })?.transcript === 'string'
  ) {
    setTranscript((uploadPoll.data.result as { transcript: string }).transcript)
    setSeededJobId(uploadJobId)
  }

  function uploadAudio(file: File) {
    uploadMutation.mutate(file, {
      onSuccess: ({ jobId }) => setUploadJobId(jobId),
    })
  }

  const generateStatus = useMemo(() => {
    if (generateMutation.isError || generatePoll.data?.status === 'failed') return 'error' as const
    if (!generateJobId) return generateMutation.isPending ? ('generating' as const) : ('idle' as const)
    if (generatePoll.data?.status === 'completed') return 'done' as const
    return 'generating' as const
  }, [generateMutation.isError, generateMutation.isPending, generateJobId, generatePoll.data])

  function generate() {
    if (!selectedFlavour || !transcript.trim()) return
    generateMutation.mutate(
      { transcripts: [{ speaker: 'Narrator', text: transcript.trim() }], flavour: selectedFlavour },
      { onSuccess: ({ jobId }) => setGenerateJobId(jobId) },
    )
  }

  const generateResult = generatePoll.data?.result as
    | { text?: string; audioKey?: string }
    | undefined

  return {
    flavours,
    selectedFlavour,
    selectFlavour: setSelectedFlavour,
    transcript,
    setTranscript,
    uploadStatus,
    uploadAudio,
    uploadError: uploadPoll.data?.error ?? null,
    canGenerate: transcript.trim().length > 0 && selectedFlavour !== null,
    generate,
    generateStatus,
    chronicleText: generateResult?.text ?? null,
    audioKey: generateResult?.audioKey ?? null,
    generateError: generatePoll.data?.error ?? null,
  }
}
```

Note: the chronicle-queue job result's text field is named `text`, not `chronicle` (see `packages/core/src/queue-types.ts`'s `ChronicleJobResult`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/presenters
git commit -m "feat(web): add useChroniclePresenter baseline (flavours, upload, generate)"
```

---

### Task 7: `validateAudioFile` + expired-job detection

**Files:**
- Create: `apps/web/src/models/validateAudioFile.ts`
- Test: `apps/web/src/models/validateAudioFile.test.ts`
- Modify: `apps/web/src/models/useJobPoll.ts`
- Test: `apps/web/src/models/useJobPoll.test.tsx` (add one case)

**Interfaces:**
- Produces: `validateAudioFile(file: File): { ok: true } | { ok: false; code: 'too-large' | 'unsupported-format'; detail: string }` — checked client-side before `uploadAudio` fires, so the "unsupported format" notice never needs a backend change (see spec addendum).
- Produces: `useJobPoll` now throws `JobExpiredError` (exported) instead of a generic `Error` when the API returns 404, so callers can distinguish "expired" from "failed".

- [ ] **Step 1: Write the failing test for `validateAudioFile`**

```ts
import { describe, it, expect } from 'vitest'
import { validateAudioFile } from './validateAudioFile.js'

describe('validateAudioFile', () => {
  it('rejects files over 25MB', () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' })
    expect(validateAudioFile(file)).toEqual({
      ok: false,
      code: 'too-large',
      detail: expect.stringContaining('25'),
    })
  })

  it('rejects unsupported formats', () => {
    const file = new File(['bytes'], 'voice.aiff', { type: 'audio/aiff' })
    expect(validateAudioFile(file)).toEqual({ ok: false, code: 'unsupported-format', detail: 'aiff' })
  })

  it('accepts a supported format under the size limit', () => {
    const file = new File(['bytes'], 'recording.webm', { type: 'audio/webm' })
    expect(validateAudioFile(file)).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `apps/web/src/models/validateAudioFile.ts`**

```ts
const MAX_BYTES = 25 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['webm', 'mp3', 'm4a', 'wav', 'ogg']

export type AudioValidation = { ok: true } | { ok: false; code: 'too-large' | 'unsupported-format'; detail: string }

export function validateAudioFile(file: File): AudioValidation {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (file.size > MAX_BYTES) {
    return { ok: false, code: 'too-large', detail: `${(file.size / 1024 / 1024).toFixed(1)} MB — limit 25 MB` }
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return { ok: false, code: 'unsupported-format', detail: ext }
  }
  return { ok: true }
}
```

Run: `pnpm --filter web test` — Expected: PASS.

- [ ] **Step 3: Write the failing test for expired-job detection**

Add to `apps/web/src/models/useJobPoll.test.tsx`:

```tsx
it('throws JobExpiredError on a 404 response', async () => {
  vi.mocked(client.GET).mockResolvedValue({
    data: undefined,
    error: { error: 'Job not found' },
    response: new Response(null, { status: 404 }),
  } as never)

  const { result } = renderHook(() => useJobPoll('gone'), { wrapper })

  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error).toBeInstanceOf(JobExpiredError)
})
```

Add the `JobExpiredError` import to the test file: `import { useJobPoll, JobExpiredError } from './useJobPoll.js'`.

- [ ] **Step 4: Run to verify it fails, then modify `apps/web/src/models/useJobPoll.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'

export interface JobStatus {
  status: string
  progress: number
  result: unknown
  error: string | null
}

export class JobExpiredError extends Error {}

export function useJobPoll(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error, response } = await client.GET('/api/v1/pipeline/jobs/{id}', {
        params: { path: { id: jobId! } },
      })
      if (error) {
        if (response.status === 404) throw new JobExpiredError('Job not found')
        throw new Error('Failed to poll job')
      }
      return data as JobStatus
    },
    enabled: jobId !== null,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 600
    },
  })
}
```

`retry: false` is added because a 404 is a permanent state (the job is gone, retrying won't bring it back) — without it, TanStack Query's default retries would delay surfacing the expired state.

- [ ] **Step 5: Run full suite, then commit**

Run: `pnpm --filter web test` — Expected: PASS.

```bash
git add apps/web/src/models/validateAudioFile.ts apps/web/src/models/validateAudioFile.test.ts apps/web/src/models/useJobPoll.ts apps/web/src/models/useJobPoll.test.tsx
git commit -m "feat(web): add client-side audio validation and expired-job detection"
```

---

### Task 8: Design tokens and per-flavour scenes

**Files:**
- Create: `apps/web/src/theme.ts`
- Create: `apps/web/src/scenes.ts`
- Test: `apps/web/src/scenes.test.ts`

**Interfaces:**
- Produces: `FLAVOUR_THEMES: Record<FlavourKey, FlavourTheme>` (accent colors + scene label + narrator art caption + voice id), `getFlavourTheme(key: string): FlavourTheme` (defaults to `medieval` for an unrecognized key — the one API-boundary spot this needs defending), `errorPalette(base?): ErrorPalette`.
- Produces: `buildScene(key: FlavourKey): Shape[]` — the per-flavour CSS scene geometry, ported verbatim from `docs/standards/design_handoff_epic_chronicler/epic-chronicler-landing.html`'s embedded `scene(key)` method (dungeon/fantasy, jungle/nature, scriptorium/medieval, stadium/sports).

Exact accent/scene-label/art values are reproduced below from the handoff source directly (not re-derived) — see that file if a value ever needs re-checking.

- [ ] **Step 1: Write `apps/web/src/theme.ts`**

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
  accent: string
  accentSoft: string
  accentGhost: string
  accentLine: string
}

function mix(accent: string) {
  return {
    accent,
    accentSoft: `color-mix(in srgb, ${accent} 20%, transparent)`,
    accentGhost: `color-mix(in srgb, ${accent} 9%, transparent)`,
    accentLine: `color-mix(in srgb, ${accent} 34%, transparent)`,
  }
}

export const FLAVOUR_THEMES: Record<FlavourKey, FlavourTheme> = {
  medieval: {
    key: 'medieval', name: 'Medieval Chronicler', short: 'Medieval',
    desc: 'A solemn scribe recording events for posterity',
    voice: 'bm_george', art: 'portrait — the scribe',
    sceneLabel: 'the scriptorium — candle, ruled parchment, arched window',
    ...mix('oklch(0.734 0.125 289)'),
  },
  sports: {
    key: 'sports', name: 'Sports Commentator', short: 'Sports',
    desc: 'An energetic play-by-play announcer who sees drama in everything',
    voice: 'am_adam', art: 'portrait — the commentator',
    sceneLabel: 'the stadium — floodlight rigs, crowd tiers, mown pitch',
    ...mix('oklch(0.734 0.135 52)'),
  },
  nature: {
    key: 'nature', name: 'Nature Documentary', short: 'Nature',
    desc: 'A hushed, reverent narrator observing human behaviour in the wild',
    voice: 'bf_emma', art: 'still — the observer',
    sceneLabel: 'the jungle — canopy, vines, light shafts, undergrowth',
    ...mix('oklch(0.734 0.115 158)'),
  },
  fantasy: {
    key: 'fantasy', name: 'Epic Fantasy Bard', short: 'Fantasy',
    desc: 'A legendary storyteller who turns every tale into legend',
    voice: 'af_bella', art: 'portrait — the bard',
    sceneLabel: 'the dungeon — stone courses, wall torches, arched doorway',
    ...mix('oklch(0.734 0.135 344)'),
  },
}

export const FLAVOUR_ORDER: FlavourKey[] = ['medieval', 'sports', 'nature', 'fantasy']

export function getFlavourTheme(key: string): FlavourTheme {
  return FLAVOUR_THEMES[key as FlavourKey] ?? FLAVOUR_THEMES.medieval
}

export function errorPalette(base = 'oklch(0.734 0.155 25)') {
  return {
    base,
    soft: `color-mix(in srgb, ${base} 20%, transparent)`,
    ghost: `color-mix(in srgb, ${base} 9%, transparent)`,
    line: `color-mix(in srgb, ${base} 34%, transparent)`,
    text: 'oklch(0.86 0.09 25)',
  }
}
```

Note: the handoff's per-flavour `title`/`body1`/`body2` fields (used in its Chronicle-view mockup) are deliberately **not** ported — they were placeholder narrative text standing in for a real LLM response. Production renders `presenter.chronicleText` from the API instead.

- [ ] **Step 2: Write the failing test for `buildScene`**

```ts
import { describe, it, expect } from 'vitest'
import { buildScene } from './scenes.js'

describe('buildScene', () => {
  it('returns a non-empty shape list for every flavour', () => {
    for (const key of ['medieval', 'sports', 'nature', 'fantasy'] as const) {
      const shapes = buildScene(key)
      expect(shapes.length).toBeGreaterThan(5)
    }
  })
})
```

- [ ] **Step 3: Run to verify it fails, then write `apps/web/src/scenes.ts`**

Port `scene(key)` from `docs/standards/design_handoff_epic_chronicler/epic-chronicler-landing.html`'s embedded template script verbatim, typed:

```ts
import type { FlavourKey } from './theme.js'

export interface Shape {
  l: string; t: string; w: string; h: string
  bg: string; r: string; sh: string; tf: string; o: string; fl: string
}

const DEFAULT_SHAPE: Shape = { l: '0px', t: '0px', w: '10px', h: '10px', bg: 'transparent', r: '0', sh: 'none', tf: 'none', o: '1', fl: 'none' }

export function buildScene(key: FlavourKey): Shape[] {
  const S: Shape[] = []
  const sh = (o: Partial<Shape>) => S.push({ ...DEFAULT_SHAPE, ...o })

  if (key === 'fantasy') {
    const shades = ['#1e2029', '#23252f', '#191b23', '#212330']
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 10; col++) {
        sh({ l: (col * 100 - (row % 2 ? 50 : 0)) + 'px', t: (row * 48) + 'px', w: '96px', h: '44px', bg: shades[(row + col) % 4], r: '2px', sh: 'inset 0 -2px 4px rgba(0,0,0,.55)' })
      }
    }
    sh({ l: '552px', t: '46px', w: '192px', h: '254px', bg: '#0b0c11', r: '96px 96px 4px 4px', sh: 'inset 0 0 70px rgba(0,0,0,.95), 0 0 30px rgba(0,0,0,.7)' })
    sh({ l: '564px', t: '58px', w: '168px', h: '242px', bg: 'none', r: '84px 84px 3px 3px', sh: 'inset 0 0 0 1px rgba(233,233,237,.07)' })
    ;([[468, 140], [790, 128]] as const).forEach(([x, g]) => {
      sh({ l: (x - g / 2 + 5) + 'px', t: (100 - g / 2) + 'px', w: g + 'px', h: g + 'px', bg: 'radial-gradient(circle, rgba(255,168,74,.36), transparent 66%)', r: '50%' })
      sh({ l: x + 'px', t: '96px', w: '10px', h: '30px', bg: '#15161d', r: '2px' })
      sh({ l: (x - 3) + 'px', t: '72px', w: '16px', h: '28px', bg: 'radial-gradient(ellipse at 50% 70%, #ffd79a, #ff9a3c 55%, transparent 72%)', r: '50% 50% 40% 40%' })
    })
    sh({ l: '0px', t: '252px', w: '900px', h: '48px', bg: 'linear-gradient(180deg, #14151c, #0d0e13)' })
    for (let i = 0; i < 7; i++) sh({ l: (i * 130 - 40) + 'px', t: '252px', w: '1px', h: '48px', bg: 'rgba(0,0,0,.7)', tf: 'skewX(' + ((i - 3) * 7) + 'deg)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(60% 60% at 50% 40%, transparent 20%, rgba(0,0,0,.72))' })
  }

  if (key === 'nature') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #0c1712 0%, #0a1310 55%, #070f0c 100%)' })
    ;([[80, 210, 34], [300, 250, 26], [500, 190, 40], [790, 230, 30]] as const).forEach(([x, y, w]) => {
      sh({ l: x + 'px', t: '0px', w: '6px', h: y + 'px', bg: 'rgba(32,78,54,.95)', r: '3px' })
      for (let i = 1; i <= 3; i++) {
        const ly = y * i / 4
        sh({ l: (x - w / 2) + 'px', t: ly + 'px', w: (w + 18) + 'px', h: '22px', bg: '#1c4630', r: '50%', tf: 'rotate(' + (i % 2 ? -20 : 16) + 'deg)' })
        sh({ l: (x - w / 2 + 8) + 'px', t: (ly + 12) + 'px', w: (w + 4) + 'px', h: '18px', bg: '#153a28', r: '50%', tf: 'rotate(' + (i % 2 ? 22 : -14) + 'deg)' })
      }
    })
    for (let i = 0; i < 16; i++) {
      const w = 90 + (i * 37) % 120, x = (i * 121) % 880 - 30, t = -12 + (i % 4) * 18
      sh({ l: x + 'px', t: t + 'px', w: w + 'px', h: (w * 0.62) + 'px', bg: i % 3 === 0 ? '#1c4630' : '#153a28', r: '50%', fl: i % 3 === 0 ? 'blur(3px)' : 'none' })
    }
    ;([[120, 26], [420, 34], [690, 22]] as const).forEach(([x, w]) => {
      sh({ l: x + 'px', t: '0px', w: w + 'px', h: '300px', bg: 'linear-gradient(180deg, rgba(214,255,226,.20), transparent 78%)', tf: 'skewX(-14deg)', fl: 'blur(2px)' })
    })
    for (let i = 0; i < 10; i++) {
      const w = 70 + (i * 53) % 110
      sh({ l: ((i * 97) % 880 - 20) + 'px', t: (250 - (i % 3) * 12) + 'px', w: w + 'px', h: (w * 0.5) + 'px', bg: '#143524', r: '50%', fl: i % 2 ? 'blur(2px)' : 'none' })
    }
    sh({ l: '0px', t: '196px', w: '900px', h: '104px', bg: 'linear-gradient(180deg, transparent, rgba(150,210,180,.10) 60%, rgba(120,190,160,.14))', fl: 'blur(6px)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(70% 65% at 46% 44%, transparent 22%, rgba(0,0,0,.6))' })
  }

  if (key === 'medieval') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #201b22 0%, #171420 60%, #120f18 100%)' })
    for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) sh({ l: (col * 118 - (row % 2 ? 59 : 0)) + 'px', t: (row * 64) + 'px', w: '114px', h: '60px', bg: row % 2 ? '#232029' : '#262230', r: '2px', o: '.5', sh: 'inset 0 -2px 5px rgba(0,0,0,.5)' })
    sh({ l: '556px', t: '-46px', w: '184px', h: '250px', bg: '#0e0c14', r: '92px 92px 4px 4px', sh: 'inset 0 0 50px rgba(0,0,0,.9)' })
    sh({ l: '570px', t: '-34px', w: '156px', h: '236px', bg: 'linear-gradient(180deg, rgba(255,226,170,.18), transparent 70%)', r: '78px 78px 3px 3px' })
    sh({ l: '0px', t: '246px', w: '900px', h: '54px', bg: 'linear-gradient(180deg, rgba(240,228,200,.16), rgba(240,228,200,.06))', sh: '0 -12px 30px rgba(0,0,0,.55)' })
    for (let i = 0; i < 4; i++) sh({ l: '40px', t: (258 + i * 12) + 'px', w: '760px', h: '1px', bg: 'rgba(60,44,24,.28)' })
    sh({ l: '392px', t: '30px', w: '200px', h: '200px', bg: 'radial-gradient(circle, rgba(255,196,116,.34), transparent 66%)', r: '50%' })
    sh({ l: '484px', t: '156px', w: '16px', h: '92px', bg: 'linear-gradient(180deg, #e6dcc4, #b9ac90)', r: '3px' })
    sh({ l: '474px', t: '240px', w: '36px', h: '11px', bg: '#8d8069', r: '50%' })
    sh({ l: '485px', t: '130px', w: '14px', h: '30px', bg: 'radial-gradient(ellipse at 50% 72%, #fff3d0, #ffb545 52%, transparent 74%)', r: '50% 50% 42% 42%' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(66% 62% at 30% 46%, transparent 18%, rgba(0,0,0,.74))' })
  }

  if (key === 'sports') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #16171f 0%, #131420 62%, #0f1018 100%)' })
    for (let row = 0; row < 5; row++) for (let col = 0; col < 30; col++) sh({ l: (col * 30 + (row % 2 ? 14 : 0)) + 'px', t: (66 + row * 17) + 'px', w: '9px', h: '9px', bg: ['#3a3d4c', '#4b4557', '#343747', '#565064'][(row + col) % 4], r: '50%', o: '.85' })
    sh({ l: '0px', t: '58px', w: '900px', h: '100px', bg: 'linear-gradient(180deg, rgba(0,0,0,.5), transparent)' })
    ;([452, 748] as const).forEach((x) => {
      sh({ l: (x + 26) + 'px', t: '24px', w: '5px', h: '46px', bg: '#2b2e3a' })
      sh({ l: x + 'px', t: '6px', w: '58px', h: '22px', bg: '#1c1e28', r: '3px', sh: '0 0 26px rgba(255,248,230,.35)' })
      for (let i = 0; i < 6; i++) sh({ l: (x + 4 + (i % 3) * 18) + 'px', t: (10 + Math.floor(i / 3) * 8) + 'px', w: '14px', h: '6px', bg: '#fff8e2', r: '1px', sh: '0 0 12px rgba(255,248,226,.9)' })
      sh({ l: (x - 22) + 'px', t: '28px', w: '124px', h: '230px', bg: 'linear-gradient(180deg, rgba(255,250,235,.13), transparent 74%)', tf: 'perspective(300px) rotateX(6deg)', fl: 'blur(5px)' })
    })
    for (let i = 0; i < 9; i++) sh({ l: (i * 100) + 'px', t: '214px', w: '100px', h: '86px', bg: i % 2 ? '#1d3324' : '#14241a' })
    sh({ l: '40px', t: '214px', w: '760px', h: '3px', bg: 'linear-gradient(90deg, transparent, rgba(233,233,237,.5) 12%, rgba(233,233,237,.5) 88%, transparent)' })
    sh({ l: '40px', t: '288px', w: '760px', h: '2px', bg: 'linear-gradient(90deg, transparent, rgba(233,233,237,.26) 14%, rgba(233,233,237,.26) 86%, transparent)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(72% 70% at 50% 34%, transparent 26%, rgba(0,0,0,.66))' })
  }

  return S
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm --filter web test` — Expected: PASS.

```bash
git add apps/web/src/theme.ts apps/web/src/scenes.ts apps/web/src/scenes.test.ts
git commit -m "feat(web): add Nocturne design tokens and per-flavour scene geometry"
```

---

### Task 9: Extend `useChroniclePresenter` — stage machine, mic error, pipeline stages, restart

**Files:**
- Modify: `apps/web/src/presenters/useChroniclePresenter.ts`
- Modify: `apps/web/src/presenters/useChroniclePresenter.test.tsx`

**Interfaces (added to the Task 6 baseline):**
```ts
type Stage = 'landing' | 'review' | 'processing' | 'result'
type PipelineStageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked'
interface PipelineStage { key: 'transcribe' | 'rewrite' | 'narrate'; status: PipelineStageStatus; pct: number }
type JobOutcome = 'expired' | 'failed' | null

// added to the object useChroniclePresenter() returns:
stage: Stage
micError: boolean
setMicError: (blocked: boolean) => void
clearMicError: () => void
uploadValidationError: { code: 'too-large' | 'unsupported-format'; detail: string } | null
tryUploadAudio: (file: File) => void   // validates via validateAudioFile, then calls uploadAudio
confirmTranscript: () => void          // review -> processing, calls generate()
stages: PipelineStage[]
retryGenerate: () => void              // re-runs the whole /generate call
jobOutcome: JobOutcome
restart: () => void                    // -> landing, clears selectedFlavour
retellAs: (key: string) => void        // -> landing, pre-selects key
```

`uploadStatus`/`uploadError` no longer surface upload failures for View rendering — the Landing view (Task 12/13) reads `uploadValidationError` for client-side rejections and the raw `uploadError` string for server-side ones (both rendered via the same `NoticeCard`).

- [ ] **Step 1: Write the failing tests (append to `useChroniclePresenter.test.tsx`)**

```tsx
it('starts on the landing stage and moves to review once transcription completes', async () => {
  vi.mocked(client.GET).mockImplementation(async (path: string) => {
    if (path === '/api/v1/pipeline/flavours') {
      return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
    }
    return { data: { status: 'completed', progress: 100, result: { transcript: 'a tale' }, error: null }, error: undefined, response: new Response() } as never
  })
  vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'up-1', status: 'queued' }, error: undefined, response: new Response() } as never)

  const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
  await waitFor(() => expect(result.current.flavours.length).toBe(1))
  expect(result.current.stage).toBe('landing')

  act(() => result.current.tryUploadAudio(new File(['x'], 'a.webm', { type: 'audio/webm' })))
  await waitFor(() => expect(result.current.stage).toBe('review'))
  expect(result.current.transcript).toBe('a tale')
})

it('rejects an invalid file without calling the upload API', async () => {
  vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
  const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
  await waitFor(() => expect(result.current.flavours).toEqual([]))

  act(() => result.current.tryUploadAudio(new File(['x'], 'voice.aiff', { type: 'audio/aiff' })))

  expect(result.current.uploadValidationError).toEqual({ code: 'unsupported-format', detail: 'aiff' })
  expect(client.POST).not.toHaveBeenCalled()
})

it('derives pipeline stages from generate progress, and restart resets to landing', async () => {
  vi.mocked(client.GET).mockResolvedValue({ data: [], error: undefined, response: new Response() } as never)
  const { result } = renderHook(() => useChroniclePresenter(), { wrapper })
  await waitFor(() => expect(result.current.flavours).toEqual([]))

  act(() => result.current.selectFlavour('medieval'))
  act(() => result.current.setTranscript('a tale'))
  expect(result.current.stages[0]).toMatchObject({ key: 'transcribe', status: 'done' })

  act(() => result.current.restart())
  expect(result.current.stage).toBe('landing')
  expect(result.current.selectedFlavour).toBeNull()

  act(() => result.current.retellAs('sports'))
  expect(result.current.stage).toBe('landing')
  expect(result.current.selectedFlavour).toBe('sports')
})
```

- [ ] **Step 2: Run to verify the new assertions fail**

Run: `pnpm --filter web test`
Expected: FAIL — `stage`, `tryUploadAudio`, `uploadValidationError`, `stages`, `restart`, `retellAs` are undefined.

- [ ] **Step 3: Rewrite `apps/web/src/presenters/useChroniclePresenter.ts`**

```ts
import { useState, useMemo } from 'react'
import { useFlavours } from '../models/useFlavours.js'
import { useUploadAudio } from '../models/useUploadAudio.js'
import { useJobPoll, JobExpiredError } from '../models/useJobPoll.js'
import { useGenerateChronicle } from '../models/useGenerateChronicle.js'
import { validateAudioFile } from '../models/validateAudioFile.js'

type Stage = 'landing' | 'review' | 'processing' | 'result'
type PipelineStageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked'
interface PipelineStage { key: 'transcribe' | 'rewrite' | 'narrate'; status: PipelineStageStatus; pct: number }

export function useChroniclePresenter() {
  const { data: flavours } = useFlavours()

  const [stage, setStage] = useState<Stage>('landing')
  const [selectedFlavour, setSelectedFlavour] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [micError, setMicError] = useState(false)
  const [uploadValidationError, setUploadValidationError] = useState<
    { code: 'too-large' | 'unsupported-format'; detail: string } | null
  >(null)

  const uploadMutation = useUploadAudio()
  const [uploadJobId, setUploadJobId] = useState<string | null>(null)
  const uploadPoll = useJobPoll(uploadJobId)

  const generateMutation = useGenerateChronicle()
  const [generateJobId, setGenerateJobId] = useState<string | null>(null)
  const generatePoll = useJobPoll(generateJobId)

  const uploadStatus = useMemo(() => {
    if (uploadMutation.isError || uploadPoll.data?.status === 'failed') return 'error' as const
    if (!uploadJobId) return uploadMutation.isPending ? ('uploading' as const) : ('idle' as const)
    if (uploadPoll.data?.status === 'completed') return 'done' as const
    return 'transcribing' as const
  }, [uploadMutation.isError, uploadMutation.isPending, uploadJobId, uploadPoll.data])

  const [seededJobId, setSeededJobId] = useState<string | null>(null)
  if (
    uploadPoll.data?.status === 'completed' &&
    uploadJobId !== seededJobId &&
    typeof (uploadPoll.data.result as { transcript?: string })?.transcript === 'string'
  ) {
    setTranscript((uploadPoll.data.result as { transcript: string }).transcript)
    setSeededJobId(uploadJobId)
    setStage('review')
  }

  function tryUploadAudio(file: File) {
    const check = validateAudioFile(file)
    if (!check.ok) {
      setUploadValidationError({ code: check.code, detail: check.detail })
      return
    }
    setUploadValidationError(null)
    uploadMutation.mutate(file, { onSuccess: ({ jobId }) => setUploadJobId(jobId) })
  }

  function confirmTranscript() {
    if (!selectedFlavour || !transcript.trim()) return
    setStage('processing')
    generateMutation.mutate(
      { transcripts: [{ speaker: 'Narrator', text: transcript.trim() }], flavour: selectedFlavour },
      { onSuccess: ({ jobId }) => setGenerateJobId(jobId) },
    )
  }

  function retryGenerate() {
    confirmTranscript()
  }

  const transcriptionMs = (uploadPoll.data?.result as { transcriptionMs?: number } | undefined)?.transcriptionMs ?? null
  const generateProgress = generatePoll.data?.progress ?? 0
  const generateFailed = generatePoll.data?.status === 'failed'
  const rewriteDone = generateProgress >= 60 || generatePoll.data?.status === 'completed'
  const rewriteFailed = generateFailed && generateProgress < 60
  const narrateFailed = generateFailed && generateProgress >= 60

  const stages: PipelineStage[] = [
    { key: 'transcribe', status: 'done', pct: 100 },
    {
      key: 'rewrite',
      status: rewriteFailed ? 'failed' : rewriteDone ? 'done' : 'active',
      pct: rewriteFailed ? generateProgress : rewriteDone ? 100 : generateProgress,
    },
    {
      key: 'narrate',
      status: narrateFailed ? 'failed' : generatePoll.data?.status === 'completed' ? 'done' : rewriteFailed ? 'blocked' : rewriteDone ? 'active' : 'queued',
      pct: narrateFailed ? generateProgress : generatePoll.data?.status === 'completed' ? 100 : 0,
    },
  ]

  const jobOutcome: 'expired' | 'failed' | null =
    generatePoll.error instanceof JobExpiredError
      ? 'expired'
      : generatePoll.isError
        ? 'failed'
        : null

  if (jobOutcome && stage !== 'result') setStage('result')
  if (generatePoll.data?.status === 'completed' && stage !== 'result') setStage('result')

  function resetToLanding() {
    setStage('landing')
    setTranscript('')
    setUploadJobId(null)
    setSeededJobId(null)
    setGenerateJobId(null)
    setUploadValidationError(null)
    setMicError(false)
  }

  function restart() {
    resetToLanding()
    setSelectedFlavour(null)
  }

  function retellAs(key: string) {
    resetToLanding()
    setSelectedFlavour(key)
  }

  const generateResult = generatePoll.data?.result as { text?: string; audioKey?: string } | undefined

  return {
    flavours,
    selectedFlavour,
    selectFlavour: setSelectedFlavour,
    transcript,
    setTranscript,
    stage,
    micError,
    setMicError,
    clearMicError: () => setMicError(false),
    uploadStatus,
    uploadAudio: tryUploadAudio,
    tryUploadAudio,
    uploadValidationError,
    uploadError: uploadPoll.data?.error ?? null,
    confirmTranscript,
    canGenerate: transcript.trim().length > 0 && selectedFlavour !== null,
    generate: confirmTranscript,
    stages,
    retryGenerate,
    transcriptionMs,
    generateStatus: generateFailed ? ('error' as const) : generatePoll.data?.status === 'completed' ? ('done' as const) : generateJobId ? ('generating' as const) : ('idle' as const),
    chronicleText: generateResult?.text ?? null,
    audioKey: generateResult?.audioKey ?? null,
    generateError: generatePoll.data?.error ?? null,
    jobOutcome,
    restart,
    retellAs,
  }
}
```

- [ ] **Step 4: Run to verify all tests pass, then commit**

Run: `pnpm --filter web test` — Expected: PASS.

```bash
git add apps/web/src/presenters
git commit -m "feat(web): extend presenter with stage machine, validation, pipeline stages, restart"
```

---

### Task 10: Landing view components — `RecordRing`, `NarratorCarousel`, `NoticeCard`

**Files:**
- Create: `apps/web/src/views/RecordRing.tsx`, `RecordRing.test.tsx`
- Create: `apps/web/src/views/NarratorCarousel.tsx`, `NarratorCarousel.test.tsx`
- Create: `apps/web/src/views/NoticeCard.tsx`, `NoticeCard.test.tsx`

**Interfaces:**
- `<RecordRing accent={string} micError={boolean} isRecording={boolean} onStart={() => void} onStop={() => void} onUploadInstead={() => void} onRetryMic={() => void} />` — `data-testid="btn-record"`. Idle/recording ring per `docs/standards/design_handoff_epic_chronicler/epic-chronicler-landing.html`; mic-denied ring per the error-states bundle's state 1 (dashed ring, `microphone-slash` glyph, "MIC BLOCKED" label, notice card with Try again / Upload a file).
- `<NarratorCarousel flavours={{key,name,description}[]} selectedFlavour={string|null} selectFlavour={(key:string)=>void} />` — chips + prev/next + dots, styled via `getFlavourTheme`. `data-testid="carousel-chip-{key}"`.
- `<NoticeCard title={string} body={string} detail={string} onPrimary={() => void} primaryLabel={string} onSecondary={() => void} secondaryLabel={string} />` — the shared invalid-upload / transcription-failed pattern (error-states bundle state 2: 2px top accent-gradient cap in the error hue, warning-circle glyph, mono detail line, two actions).

- [ ] **Step 1: Write the three failing tests**

```tsx
// RecordRing.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordRing } from './RecordRing.js'

describe('RecordRing', () => {
  it('calls onStart when clicked while idle', async () => {
    const onStart = vi.fn()
    render(<RecordRing accent="oklch(0.734 0.125 289)" micError={false} isRecording={false} onStart={onStart} onStop={vi.fn()} onUploadInstead={vi.fn()} onRetryMic={vi.fn()} />)
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStart).toHaveBeenCalled()
  })

  it('shows the mic-blocked notice and wires Try again / Upload a file when micError is true', async () => {
    const onRetryMic = vi.fn()
    const onUploadInstead = vi.fn()
    render(<RecordRing accent="oklch(0.734 0.125 289)" micError={true} isRecording={false} onStart={vi.fn()} onStop={vi.fn()} onUploadInstead={onUploadInstead} onRetryMic={onRetryMic} />)
    expect(screen.getByText('Your browser blocked the microphone')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Try again'))
    expect(onRetryMic).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Upload a file'))
    expect(onUploadInstead).toHaveBeenCalled()
  })
})
```

```tsx
// NarratorCarousel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NarratorCarousel } from './NarratorCarousel.js'

const flavours = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
]

describe('NarratorCarousel', () => {
  it('selects a flavour by clicking its chip', async () => {
    const selectFlavour = vi.fn()
    render(<NarratorCarousel flavours={flavours} selectedFlavour={null} selectFlavour={selectFlavour} />)
    await userEvent.click(screen.getByTestId('carousel-chip-sports'))
    expect(selectFlavour).toHaveBeenCalledWith('sports')
  })
})
```

```tsx
// NoticeCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoticeCard } from './NoticeCard.js'

describe('NoticeCard', () => {
  it('renders copy and wires both actions', async () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    render(
      <NoticeCard title="That file is too large" body="Limit 25 MB." detail="68.4 MB · limit 25 MB"
        primaryLabel="Choose another file" onPrimary={onPrimary}
        secondaryLabel="Record instead" onSecondary={onSecondary} />,
    )
    expect(screen.getByText('That file is too large')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Choose another file'))
    expect(onPrimary).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Record instead'))
    expect(onSecondary).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify all three fail**

Run: `pnpm --filter web test` — Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the three components**

Build each against the exact values already recorded in `docs/standards/design_handoff_epic_chronicler/README.md` ("The record ring", "Carousel band" sections) and the error-states bundle's states 1 and 2 — grounds `#161826`/`#131424`, borders `#292b31`/`#3f424d`, text `#e9e9ed`/`#9397ab`/`#595d6c`, `errorPalette()` from `theme.ts` for the error variant. Skeleton (fill in from those sources):

```tsx
// RecordRing.tsx
import { errorPalette } from '../theme.js'

export function RecordRing({ accent, micError, isRecording, onStart, onStop, onUploadInstead, onRetryMic }: {
  accent: string; micError: boolean; isRecording: boolean
  onStart: () => void; onStop: () => void; onUploadInstead: () => void; onRetryMic: () => void
}) {
  const e = errorPalette()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div
        data-testid="btn-record"
        role="button"
        onClick={micError ? undefined : isRecording ? onStop : onStart}
        style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: micError ? 'default' : 'pointer' }}
      >
        <div style={{ position: 'absolute', inset: -26, borderRadius: '50%', background: `radial-gradient(circle, ${micError ? e.soft : accent} 0%, transparent 62%)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: micError ? `1px dashed ${e.line}` : `1px solid ${accent}`, animation: micError ? 'none' : 'ringout 2.8s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', border: `1px solid ${micError ? e.line : accent}` }} />
        <div style={{ position: 'absolute', inset: 48, borderRadius: '50%', border: `1px solid ${micError ? e.base : accent}`, background: 'rgba(10,11,16,.55)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {micError ? (
            <span style={{ color: e.base, fontSize: 30 }}>⦸</span>
          ) : (
            <div style={{ width: 15, height: 15, borderRadius: '50%', background: accent, animation: 'recpulse 1.6s ease-in-out infinite' }} />
          )}
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '12.5px', letterSpacing: '.08em', textTransform: 'uppercase', color: micError ? e.text : '#e9e9ed' }}>
            {micError ? 'Mic blocked' : isRecording ? 'Stop' : 'Record'}
          </span>
        </div>
      </div>
      {micError && (
        <div style={{ width: 300, padding: '14px 16px', border: `1px solid ${e.line}`, borderRadius: 8, background: 'rgba(10,11,16,.62)' }}>
          <div style={{ color: e.text, fontWeight: 500, fontSize: '12.5px', marginBottom: 6 }}>Your browser blocked the microphone</div>
          <p style={{ color: '#b2b6ca', fontSize: 12, margin: '0 0 12px' }}>Allow microphone access for this site in your browser settings, then try again.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '7px 14px', border: `1px solid ${e.base}`, borderRadius: 999, cursor: 'pointer', color: e.text, background: e.ghost }} onClick={onRetryMic}>Try again</div>
            <div style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', color: '#b2b6ca' }} onClick={onUploadInstead}>Upload a file</div>
          </div>
        </div>
      )}
    </div>
  )
}
```

`NarratorCarousel.tsx` renders `flavours.map((f) => <chip using getFlavourTheme(f.key) for colors, data-testid={\`carousel-chip-${f.key}\`}, onClick={() => selectFlavour(f.key)}>` per the "Carousel band" spec (chips, prev/next arrows advancing the same array by ±1 with wraparound, dots) — arrows/dots are presentational sugar over the same `selectFlavour` call, not separate state.

`NoticeCard.tsx` is a single reusable component: props `title`, `body`, `detail`, `primaryLabel`/`onPrimary`, `secondaryLabel`/`onSecondary`, rendering the 2px top accent-gradient cap, warning-circle glyph, mono detail line, and two actions exactly as documented in the error-states bundle's "Invalid upload" section — used for both invalid-upload and transcription-failed (different copy, same component).

- [ ] **Step 4: Run to verify all three pass, then commit**

Run: `pnpm --filter web test` — Expected: PASS.

```bash
git add apps/web/src/views/RecordRing.tsx apps/web/src/views/RecordRing.test.tsx apps/web/src/views/NarratorCarousel.tsx apps/web/src/views/NarratorCarousel.test.tsx apps/web/src/views/NoticeCard.tsx apps/web/src/views/NoticeCard.test.tsx
git commit -m "feat(web): add RecordRing, NarratorCarousel, NoticeCard views"
```

---

### Task 11: `LandingView`

**Files:**
- Create: `apps/web/src/views/LandingView.tsx`, `LandingView.test.tsx`
- Delete (superseded, never built as separate files): the old plan's `SampleChronicleCard.tsx`, `McpCallout.tsx`, `RecordStep.tsx`, `FlavourStep.tsx` — their content is absorbed here.

**Interfaces:**
- Consumes: `selectedFlavour`, `selectFlavour`, `flavours`, `micError`, `setMicError`, `clearMicError`, `tryUploadAudio`, `uploadValidationError`, `uploadStatus`, `uploadError` (Presenter, Task 9); `getFlavourTheme`, `buildScene` (Task 8); `RecordRing`, `NarratorCarousel`, `NoticeCard` (Task 10).
- Produces: the full Landing screen — header (brand + real `MCP server`/`GitHub` links + `How it works` anchor), scene hero (headline, Portuguese-input line already in the hero body copy per the handoff, record ring, hidden file `<input data-testid="audio-file">` triggered by the "upload a file" text), narrator carousel, and a "How it works" panel below it carrying the original sample-chronicle example (kept verbatim from `apps/api/src/static/index.html`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingView } from './LandingView.js'

const flavours = [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }]

function baseProps() {
  return {
    flavours, selectedFlavour: null, selectFlavour: vi.fn(),
    micError: false, setMicError: vi.fn(), clearMicError: vi.fn(),
    tryUploadAudio: vi.fn(), uploadValidationError: null,
    uploadStatus: 'idle' as const, uploadError: null,
  }
}

describe('LandingView', () => {
  it('shows the sample chronicle and links to the MCP server', () => {
    render(<LandingView {...baseProps()} />)
    expect(screen.getByText(/Siege of the Flatpack Throne/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MCP server' })).toHaveAttribute('href', 'https://epicchronicler-production.up.railway.app/mcp')
  })

  it('uploads a file selected via the hidden input', async () => {
    const tryUploadAudio = vi.fn()
    render(<LandingView {...baseProps()} tryUploadAudio={tryUploadAudio} />)
    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(screen.getByTestId('audio-file'), file)
    expect(tryUploadAudio).toHaveBeenCalledWith(file)
  })

  it('shows a NoticeCard when uploadValidationError is set', () => {
    render(<LandingView {...baseProps()} uploadValidationError={{ code: 'too-large', detail: '68.4 MB — limit 25 MB' }} />)
    expect(screen.getByText('That file is too large')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `apps/web/src/views/LandingView.tsx`**

Compose `Header` (brand mark + nav — `MCP server` → `https://epicchronicler-production.up.railway.app/mcp`, `GitHub` → `https://github.com/brunolazarus/epicChronicler`, `How it works` → `<a href="#how-it-works">`), the scene band (absolutely-positioned `buildScene(selectedFlavour ?? 'medieval')` shapes behind the two scrim gradients, per the handoff's exact hero markup — headline, body copy incl. the Portuguese-language line, `RecordRing` or `NoticeCard` depending on `micError`/`uploadValidationError`/`uploadStatus==='error'`), `NarratorCarousel`, and a `#how-it-works` panel (`background:#131424;border:1px solid #292b31;border-radius:14px;padding:28px`) containing the original sample chronicle text verbatim from `apps/api/src/static/index.html` lines 255–261. `onUploadInstead`/the hero's "upload a file" text both trigger a hidden `<input type="file" data-testid="audio-file" accept="audio/*" onChange={(e) => e.target.files?.[0] && tryUploadAudio(e.target.files[0])} />`.

- [ ] **Step 3: Run to verify it passes, then commit**

Run: `pnpm --filter web test` — Expected: PASS.

```bash
git add apps/web/src/views/LandingView.tsx apps/web/src/views/LandingView.test.tsx
git commit -m "feat(web): add LandingView composing header, scene hero, and carousel"
```

---

### Task 12: `ReviewStep` (new — not in the handoff, preserves the pre-spend review gate)

**Files:**
- Create: `apps/web/src/views/ReviewStep.tsx`, `ReviewStep.test.tsx`

**Interfaces:**
- Consumes: `transcript: string`, `setTranscript: (text: string) => void`, `confirmTranscript: () => void` (Presenter).
- Produces: `data-testid="transcript"` textarea, `data-testid="btn-generate"` button labelled "Tell the story".

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewStep } from './ReviewStep.js'

describe('ReviewStep', () => {
  it('edits the transcript and confirms', async () => {
    const setTranscript = vi.fn()
    const confirmTranscript = vi.fn()
    render(<ReviewStep transcript="a tale" setTranscript={setTranscript} confirmTranscript={confirmTranscript} />)
    expect(screen.getByTestId('transcript')).toHaveValue('a tale')
    await userEvent.type(screen.getByTestId('transcript'), '!')
    expect(setTranscript).toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('btn-generate'))
    expect(confirmTranscript).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `apps/web/src/views/ReviewStep.tsx`**

```tsx
export function ReviewStep({ transcript, setTranscript, confirmTranscript }: {
  transcript: string; setTranscript: (text: string) => void; confirmTranscript: () => void
}) {
  return (
    <div style={{ maxWidth: 760, margin: '80px auto', padding: '0 48px' }}>
      <div style={{ border: '1px solid #292b31', borderRadius: 14, padding: '28px 26px', background: '#131424' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#595d6c', marginBottom: 16 }}>
          What you said
        </div>
        <textarea
          data-testid="transcript"
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{ width: '100%', background: '#161826', border: '1px solid #292b31', borderRadius: 8, color: '#e9e9ed', padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
        />
        <button
          data-testid="btn-generate"
          onClick={confirmTranscript}
          disabled={!transcript.trim()}
          style={{ marginTop: 16, padding: '11px 22px', border: '1px solid #b2b6ca', borderRadius: 999, background: 'transparent', color: '#e9e9ed', cursor: 'pointer' }}
        >
          Tell the story
        </button>
      </div>
    </div>
  )
}
```

This screen has no design-handoff counterpart (see spec addendum) — plain and functional is correct here, not a gap to fill later.

- [ ] **Step 3: Run to verify it passes, then commit**

```bash
git add apps/web/src/views/ReviewStep.tsx apps/web/src/views/ReviewStep.test.tsx
git commit -m "feat(web): add ReviewStep (pre-spend transcript review, not in the handoff)"
```

---

### Task 13: `ProcessingView` and `EmptyStateShell`

**Files:**
- Create: `apps/web/src/views/ProcessingView.tsx`, `ProcessingView.test.tsx`
- Create: `apps/web/src/views/EmptyStateShell.tsx`, `EmptyStateShell.test.tsx`

**Interfaces:**
- `<ProcessingView stages={PipelineStage[]} accent={string} transcriptionMs={number|null} flavourKey={string} voice={string} generateError={string|null} onRetry={() => void} />` — three-row card per the handoff's Processing view + the error-states bundle's "Failed pipeline stage" (row states: done/active/queued/failed/blocked; failed row shows the real `generateError` string, not an invented code; retry re-runs the whole call per the spec addendum).
- `<EmptyStateShell kind={'expired'|'generic'} jobId={string} onPrimary={() => void} />` — the two empty-state shells from the error-states bundle (neutral clock icon + "Start a new chronicle" for expired; error-hue warning icon + "Try again" + "Back to start" for generic).

- [ ] **Step 1: Write the failing tests**

```tsx
// ProcessingView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessingView } from './ProcessingView.js'

describe('ProcessingView', () => {
  it('shows a retry action and the real error message when rewrite fails', async () => {
    const onRetry = vi.fn()
    render(
      <ProcessingView
        stages={[{ key: 'transcribe', status: 'done', pct: 100 }, { key: 'rewrite', status: 'failed', pct: 40 }, { key: 'narrate', status: 'blocked', pct: 0 }]}
        accent="oklch(0.734 0.125 289)" transcriptionMs={1800} flavourKey="medieval" voice="bm_george"
        generateError="upstream 529" onRetry={onRetry}
      />,
    )
    expect(screen.getByText('upstream 529')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Retry rewrite'))
    expect(onRetry).toHaveBeenCalled()
  })
})
```

```tsx
// EmptyStateShell.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyStateShell } from './EmptyStateShell.js'

describe('EmptyStateShell', () => {
  it('shows neutral "session ended" copy for an expired job', () => {
    render(<EmptyStateShell kind="expired" jobId="8f31" onPrimary={vi.fn()} />)
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
  })

  it('calls onPrimary for the generic-failure retry action', async () => {
    const onPrimary = vi.fn()
    render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={onPrimary} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onPrimary).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify both fail, then implement**

Build `ProcessingView` per the handoff's Processing markup (header strip "TELLING YOUR STORY" + pulsing status dot, three stage rows each with a label/status line and a 2px track) plus the error-states bundle's row-failure treatment (`errorPalette()` for the failed row's fill/label, indented detail block with `Retry {stage}` copy — label is `Retry rewrite`/`Retry narration` per `stage.key`, never an invented error code, `generateError` shown verbatim). Rows after a failed one read "blocked", not "queued". Build `EmptyStateShell` per the bundle's two shell variants (`kind==='expired'`: neutral ring/clock icon, "This session has ended", "Start a new chronicle"; `kind==='generic'`: error-hue ring/warning icon, "Something went wrong", "Try again" + "Back to start"), both echoing `jobId` in a mono detail line.

- [ ] **Step 3: Run to verify both pass, then commit**

```bash
git add apps/web/src/views/ProcessingView.tsx apps/web/src/views/ProcessingView.test.tsx apps/web/src/views/EmptyStateShell.tsx apps/web/src/views/EmptyStateShell.test.tsx
git commit -m "feat(web): add ProcessingView (per-stage failure) and EmptyStateShell"
```

---

### Task 14: `ChronicleView`

**Files:**
- Create: `apps/web/src/views/ChronicleView.tsx`, `ChronicleView.test.tsx`

**Interfaces:**
- Consumes: `chronicleText: string|null`, `audioKey: string|null`, `transcript: string`, `flavours`, `selectedFlavour`, `retellAs: (key:string)=>void`, `jobOutcome`, `restart` (Presenter); `EmptyStateShell` (Task 13).
- Produces: `data-testid="chronicle-text"`, `data-testid="tts-player"` (`<audio src="/api/v1/pipeline/audio/{audioKey}">`), retell pills (`data-testid="retell-{key}"`) that call `retellAs(key)` — **not** `/generate`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChronicleView } from './ChronicleView.js'

const flavours = [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }, { key: 'sports', name: 'Sports Commentator', description: 'A commentator' }]

describe('ChronicleView', () => {
  it('shows the chronicle, plays audio, and retell redirects instead of regenerating', async () => {
    const retellAs = vi.fn()
    render(
      <ChronicleView chronicleText="Here follows the chronicle..." audioKey="tts-1.mp3" transcript="a tale"
        flavours={flavours} selectedFlavour="medieval" retellAs={retellAs} jobOutcome={null} restart={vi.fn()} />,
    )
    expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...')
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')

    await userEvent.click(screen.getByTestId('retell-sports'))
    expect(retellAs).toHaveBeenCalledWith('sports')
  })

  it('renders EmptyStateShell for an expired job instead of the two-column layout', () => {
    render(
      <ChronicleView chronicleText={null} audioKey={null} transcript="" flavours={flavours}
        selectedFlavour="medieval" retellAs={vi.fn()} jobOutcome="expired" restart={vi.fn()} />,
    )
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
    expect(screen.queryByTestId('chronicle-text')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails, then write `apps/web/src/views/ChronicleView.tsx`**

```tsx
import { EmptyStateShell } from './EmptyStateShell.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary { key: string; name: string; description: string }

export function ChronicleView({ chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart }: {
  chronicleText: string | null; audioKey: string | null; transcript: string
  flavours: FlavourSummary[]; selectedFlavour: string | null
  retellAs: (key: string) => void; jobOutcome: 'expired' | 'failed' | null; restart: () => void
}) {
  if (jobOutcome) return <EmptyStateShell kind={jobOutcome} jobId="—" onPrimary={restart} />

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')

  return (
    <div style={{ maxWidth: 1080, margin: '60px auto', padding: '0 48px' }}>
      <div style={{ border: '1px solid #292b31', borderRadius: 14, overflow: 'hidden', background: '#161826' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr' }}>
          <div style={{ padding: 24, borderRight: '1px solid #292b31', background: '#131424' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#595d6c', marginBottom: 18 }}>
              What you said
            </div>
            <div style={{ color: '#9397ab', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{transcript}</div>
          </div>
          <div style={{ padding: '28px 34px' }}>
            <div style={{ color: theme.accent, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 11 }}>{theme.name}</div>
            <div data-testid="chronicle-text" style={{ color: '#e9e9ed', fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {chronicleText ?? 'Your chronicle will appear here…'}
            </div>
            {audioKey && <audio data-testid="tts-player" controls src={`/api/v1/pipeline/audio/${audioKey}`} style={{ width: '100%', marginTop: 20 }} />}
            <div style={{ marginTop: 26, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#9397ab', fontSize: 11.5, marginRight: 4 }}>Tell it again as</span>
              {flavours.map((f) => {
                const t = getFlavourTheme(f.key)
                const on = f.key === selectedFlavour
                return (
                  <div key={f.key} data-testid={`retell-${f.key}`} onClick={() => retellAs(f.key)}
                    style={{ padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? t.accent : '#3f424d'}`, background: on ? t.accentGhost : 'transparent', color: on ? '#e9e9ed' : '#9397ab', fontSize: 12 }}>
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

Retell pills call `retellAs(key)`, which the Presenter (Task 9) wires to reset and return to Landing with that flavour pre-selected — not a new `/generate` call. `jobOutcome !== null` swaps the whole two-column layout for `EmptyStateShell`, matching the bundle's "both reuse the Chronicle card shell" note. The waveform/play-pause/download-MP3/tabs/playback-rate chrome from the handoff's player bar is a further-fidelity pass, not required for this plan's functional scope — the native `<audio controls>` element already gives play/pause/seek/duration for free; do not gate this task's commit on building a custom waveform.

- [ ] **Step 3: Run to verify it passes, then commit**

```bash
git add apps/web/src/views/ChronicleView.tsx apps/web/src/views/ChronicleView.test.tsx
git commit -m "feat(web): add ChronicleView (transcript/chronicle panels, retell-as-restart, expired/generic shells)"
```

---

### Task 15: Compose `App.tsx`

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `useChroniclePresenter` (Task 9), `StepBoundary` (Task 4), `LandingView` (Task 11), `ReviewStep` (Task 12), `ProcessingView`/`EmptyStateShell` (Task 13), `ChronicleView` (Task 14).
- Produces: the complete page, switching on `presenter.stage`.

- [ ] **Step 1: Write the failing integration test**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from './App.js'

vi.mock('@chronicler/api-client', () => ({ client: { GET: vi.fn(), POST: vi.fn() } }))
afterEach(() => vi.resetAllMocks())

function renderApp() {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}><App /></QueryClientProvider>)
}

describe('App', () => {
  it('walks flavour-first through to a rendered chronicle', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'completed', progress: 100, result: { transcript: 'a wild tale', text: 'Here follows the chronicle...', audioKey: 'tts-1.mp3', transcriptionMs: 1800 }, error: null }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'job-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    renderApp()
    await waitFor(() => expect(screen.getByTestId('carousel-chip-medieval')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('carousel-chip-medieval'))
    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(screen.getByTestId('audio-file'), file)

    await waitFor(() => expect(screen.getByTestId('transcript')).toHaveValue('a wild tale'))
    await userEvent.click(screen.getByTestId('btn-generate'))

    await waitFor(() => expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...'))
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `App` doesn't yet render any of the new stage-specific Views.

- [ ] **Step 3: Write the full `apps/web/src/App.tsx`**

```tsx
import { StepBoundary } from './views/StepBoundary.js'
import { LandingView } from './views/LandingView.js'
import { ReviewStep } from './views/ReviewStep.js'
import { ProcessingView } from './views/ProcessingView.js'
import { ChronicleView } from './views/ChronicleView.js'
import { useChroniclePresenter } from './presenters/useChroniclePresenter.js'
import { getFlavourTheme } from './theme.js'

function Flow() {
  const p = useChroniclePresenter()
  const theme = getFlavourTheme(p.selectedFlavour ?? 'medieval')

  if (p.stage === 'landing') {
    return (
      <LandingView
        flavours={p.flavours} selectedFlavour={p.selectedFlavour} selectFlavour={p.selectFlavour}
        micError={p.micError} setMicError={p.setMicError} clearMicError={p.clearMicError}
        tryUploadAudio={p.tryUploadAudio} uploadValidationError={p.uploadValidationError}
        uploadStatus={p.uploadStatus} uploadError={p.uploadError}
      />
    )
  }
  if (p.stage === 'review') {
    return <ReviewStep transcript={p.transcript} setTranscript={p.setTranscript} confirmTranscript={p.confirmTranscript} />
  }
  if (p.stage === 'processing') {
    return (
      <ProcessingView
        stages={p.stages} accent={theme.accent} transcriptionMs={p.transcriptionMs}
        flavourKey={theme.key} voice={theme.voice} generateError={p.generateError} onRetry={p.retryGenerate}
      />
    )
  }
  return (
    <ChronicleView
      chronicleText={p.chronicleText} audioKey={p.audioKey} transcript={p.transcript}
      flavours={p.flavours} selectedFlavour={p.selectedFlavour} retellAs={p.retellAs}
      jobOutcome={p.jobOutcome} restart={p.restart}
    />
  )
}

export default function App() {
  return (
    <StepBoundary fallback={<div style={{ padding: 48, color: '#9397ab' }}>Loading…</div>}>
      <Flow />
    </StepBoundary>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test` — Expected: PASS.

- [ ] **Step 5: Manual verification against the real dev server**

Run (terminal 1): `pnpm dev` — Run (terminal 2): `pnpm --filter web dev`
Open the printed Vite URL. Confirm: scene hero renders per selected flavour, carousel picks a narrator before recording, uploading a file moves to the review textarea, confirming moves to the processing card, and a completed job shows the chronicle + audio player.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): compose App.tsx around the four-stage presenter flow"
```

---

### Task 16: Swap `apps/api`'s static serving to the new build

**Files:**
- Modify: `apps/api/src/index.ts` (static file serving)
- Modify: `apps/api/package.json` (add `web` as a `devDependency` so Turborepo orders the build correctly)
- Delete: `apps/api/src/static/index.html`

**Interfaces:**
- Consumes: `apps/web/dist/` (Vite build output from Tasks 1/15)
- Produces: `apps/api`'s `/` route (and `/assets/*`) serve the React app instead of the old static HTML.

- [ ] **Step 1: Confirm the build output shape**

Run: `pnpm --filter web build`
Expected: `apps/web/dist/index.html` and `apps/web/dist/assets/*.js`/`*.css` exist.

- [ ] **Step 2: Modify `apps/api/src/index.ts`**

Replace:
```ts
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
```
with:
```ts
import { serveStatic } from "@hono/node-server/serve-static";
```

Replace:
```ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const landingPage = readFileSync(join(__dirname, "static/index.html"), "utf-8");
```
and
```ts
app.get("/", (c) => c.html(landingPage));
```
with:
```ts
app.use("/assets/*", serveStatic({ root: "../web/dist" }));
app.get("/", serveStatic({ path: "../web/dist/index.html" }));
```

`serveStatic`'s `root`/`path` resolve relative to the process's working directory — since `apps/api` is always run `cd`'d into its own package directory, `"../web/dist"` is the correct relative path, not one computed from `__dirname`.

- [ ] **Step 3: Add `web` as a `devDependency` in `apps/api/package.json`**

```json
"web": "workspace:*"
```

`apps/api` reads the built files at runtime via a relative path (not an import), so this exists purely so `turbo.json`'s `"build": { "dependsOn": ["^build"] }` orders `apps/web`'s build before `apps/api` starts.

- [ ] **Step 4: Delete the old static file and verify end-to-end**

Run: `rm -rf apps/api/src/static`
Run: `pnpm --filter web build && pnpm dev`
Open `http://localhost:3000/` — expect the same page Task 15 verified via the Vite dev server, now served from `apps/api` directly.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json
git rm -r apps/api/src/static
git commit -m "feat(api): serve apps/web's build output instead of the static demo"
```

---

### Task 17: Update Playwright E2E suite to `data-testid` selectors and the new flow order

**Files:**
- Modify: `tests/web/full-journey.spec.ts`
- Modify: `playwright.config.ts` (webServer command needs `apps/web` built before `apps/api` starts)

**Interfaces:**
- Consumes: `data-testid` attributes from Tasks 10–14 (`carousel-chip-{key}`, `audio-file`, `transcript`, `btn-generate`, `chronicle-text`, `tts-player`).

- [ ] **Step 1: Rewrite the journey in `tests/web/full-journey.spec.ts` to the new stage order**

The flavour is picked *before* upload now, and the transcript is confirmed on a distinct review screen before the chronicle result appears:

```ts
await page.getByTestId('carousel-chip-medieval').click()
await page.getByTestId('audio-file').setInputFiles('tests/fixtures/sample.mp3')

await expect(page.getByTestId('transcript')).toHaveValue(/.+/)
await page.getByTestId('btn-generate').click()

await expect(page.getByTestId('chronicle-text')).toHaveText(/.+/, { timeout: 30_000 })
const player = page.getByTestId('tts-player')
await expect(player).toHaveAttribute('src', /\/api\/v1\/pipeline\/audio\//)
```

Replace whatever assertions the existing spec makes on transcript/chronicle content with the same content checks it already had — only the selectors and step order change, not what's being verified.

- [ ] **Step 2: Update `playwright.config.ts`'s `webServer` so `apps/web` is built before `apps/api` starts**

Replace:
```ts
    {
      command: 'dotenv -e .env -- pnpm --filter api dev',
```
with:
```ts
    {
      command: 'pnpm --filter web build && dotenv -e .env -- pnpm --filter api dev',
```

- [ ] **Step 3: Run the suite**

Run: `pnpm test --grep-invert @integration`
Expected: PASS — `full-journey.spec.ts` passes against the rebuilt app with mocked AI providers.

- [ ] **Step 4: Commit**

```bash
git add tests/web/full-journey.spec.ts playwright.config.ts
git commit -m "test: repoint Playwright web suite at data-testid selectors, flavour-first order"
```

---

### Task 18: Contract-drift CI check

**Files:**
- Create: `.github/workflows/contract-drift.yml`

**Interfaces:**
- Consumes: `pnpm --filter @chronicler/api-client check-drift` (Task 2's script)

- [ ] **Step 1: Write `.github/workflows/contract-drift.yml`**

```yaml
name: API contract drift

on:
  pull_request:
    paths:
      - "apps/api/src/**"
      - "packages/api-client/src/**"

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @chronicler/core build
      - run: pnpm --filter api dev &
      - run: npx wait-on http://localhost:3000/openapi.json
      - run: pnpm --filter @chronicler/api-client check-drift
```

- [ ] **Step 2: Verify the check catches real drift**

Temporarily add a field to `FlavourSchema` in `apps/api/src/routes/pipeline.ts`, run `pnpm dev` in one terminal and `pnpm --filter @chronicler/api-client check-drift` in another.
Expected: FAIL — `diff` reports a difference between committed `types.gen.ts` and freshly regenerated types.
Revert: `git checkout apps/api/src/routes/pipeline.ts`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/contract-drift.yml
git commit -m "ci: add API contract-drift check against packages/api-client"
```

---

## Plan self-review notes

- **Spec coverage:** every addendum item in `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` maps to a task — flow reorder (Task 9's `stage`/`retellAs`), retell-redirects-to-landing (Task 9, Task 14), the transcript-review gate (Task 12), the five designed error/edge states (Tasks 7, 10, 13), and the two backend-contract simplifications (client-side format validation in Task 7, whole-job retry in Task 9/13). No `packages/core`/`packages/ui` introduced anywhere.
- **Type consistency:** `Stage`, `PipelineStage`, `JobOutcome`, `AudioValidation` are defined once (Tasks 7, 9) and consumed with matching field names by every View (Tasks 10–15) — cross-checked `stage`, `stages`, `jobOutcome`, `micError`, `uploadValidationError`, `tryUploadAudio`, `confirmTranscript`, `retryGenerate`, `retellAs`, `restart` against both the Presenter's return object (Task 9) and each View's destructured props.
- **Backend contract verification:** `ChronicleJobResult.text` (not `chronicle`) and `TranscriptionJobResult.transcriptionMs` were checked directly against `packages/core/src/queue-types.ts` rather than assumed — both are read under those exact names in Task 9's presenter and Task 15's integration test mock.
- **Design fidelity vs. scope:** the Chronicle view's custom waveform, playback-rate control, and share tab from the handoff are explicitly deferred past this plan's functional scope (noted in Task 14) — the native `<audio controls>` element covers play/pause/seek for a working MVP; a follow-up pass can add the custom player chrome without touching the Model/Presenter layer underneath it.
