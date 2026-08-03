# Web Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-page web demo (`apps/api/src/static/index.html`) as a proper React + Vite app (`apps/web`) using an MVP (Model/Presenter/View) architecture, with a generated, typed API client (`packages/api-client`), reproducing today's exact flow and functionality with no regressions.

**Architecture:** `apps/web` is a Vite-built React SPA served as static assets from the existing `apps/api` Hono process (same Railway service, no new deployment target). Data-fetching lives in local Model hooks (TanStack Query), orchestration lives in one Presenter hook, Views are render-only and composed together. `packages/api-client` is generated from `apps/api`'s existing OpenAPI spec and is the only new shared package — per the "promotion, not preemption" principle, `packages/core` and `packages/ui` are *not* created in this pass since there is only one frontend app.

**Tech Stack:** React 18, Vite 5, TanStack Query v5, `openapi-typescript` + `openapi-fetch`, `react-error-boundary`, Vitest + React Testing Library, Playwright (existing suite, updated).

## Global Constraints

- No new Railway service, no new deployment target — the built app is served by the existing `apps/api` Hono process, same as today's static file.
- No auth/accounts work — there is no login, no bearer token, nothing in this plan requires one.
- `packages/core` and `packages/ui` are not created in this pass.
- The 5 existing API endpoints (`/api/v1/pipeline/upload`, `/jobs/:id`, `/generate`, `/audio/:key`, `/flavours`) are consumed as-is — no backend route or logic changes.
- Every interactive element the existing Playwright suite selects on gets a `data-testid` attribute so the suite can be repointed at stable selectors instead of hand-written IDs.
- Visual output must match today's page (same dark theme, same copy: the sample chronicle card, the Portuguese-input note, the MCP developer callout) — this is an architecture migration, not a redesign.

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

Note: this uses `"moduleResolution": "bundler"`, not the `NodeNext` used by `apps/api`/`packages/core`. That's expected — `apps/web` is bundled by Vite for the browser, not run directly by Node, so it follows Vite's own recommended TS config instead of the backend's Node-ESM convention.

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

The dev-server proxy forwards `/api/*` calls to `apps/api` (started separately via `pnpm dev` at the root) so `apps/web`'s dev server can be run standalone on its own port while still hitting the real backend, matching production where both are same-origin.

- [ ] **Step 4: Write `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicler — Make your stories awsome</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

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

This gets fully built out in Task 11 — for now it just proves the scaffold renders.

- [ ] **Step 7: Port the existing stylesheet to `apps/web/src/index.css`**

Copy the entire `<style>` block contents (lines 7–246) from `apps/api/src/static/index.html` verbatim into `apps/web/src/index.css`, with the surrounding `<style>`/`</style>` tags removed (just the CSS rules themselves — `*, *::before, *::after { box-sizing: border-box; ... }` through the `.upload-alt label:hover` rule). This preserves the exact dark theme, card styling, flavour grid, record button, and progress bar styles so later Views need zero new CSS.

- [ ] **Step 8: Install dependencies and verify the dev server**

Run: `pnpm install`
Run: `pnpm --filter web dev`

Expected: Vite prints a local dev URL (e.g. `http://localhost:5173`); opening it in a browser shows an "H1: Chronicler" heading with the dark theme background applied (confirms `index.css` loaded).

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Vite + React app, port existing stylesheet"
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

Expected: `packages/api-client/src/types.gen.ts` is created, exporting a `paths` interface (and `components`) describing all 5 pipeline routes, generated from `http://localhost:3000/openapi.json`.

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
Expected: PASS — 1 test passed. (This is a harness-verification step rather than a true red/green cycle, since Task 1's placeholder `App.tsx` already renders the heading. Every subsequent task follows the real red→green cycle.)

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
- Produces: `<StepBoundary fallback={<Spinner/>}>{children}</StepBoundary>` — every step card in Task 11 wraps its content in one of these. Errors thrown by a child's `useSuspenseQuery` are caught here and rendered as the raw error message (the named early-stage trade-off from the design spec), not a generic message.

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
  return <div className="status err">✗ {error.message}</div>
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

- [ ] **Step 5: Add `react-error-boundary` to `apps/web/package.json` dependencies if not already present, then reinstall**

(Already added in Task 1's `package.json` — just confirm with) Run: `pnpm install`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/StepBoundary.tsx apps/web/src/views/StepBoundary.test.tsx
git commit -m "feat(web): add StepBoundary (Suspense + ErrorBoundary per step card)"
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
  - `useUploadAudio(): UseMutationResult<{ jobId: string }, Error, File>` — call `.mutate(file)`
  - `useGenerateChronicle(): UseMutationResult<{ jobId: string }, Error, { transcripts: { speaker: string; text: string }[]; flavour: string }>` — call `.mutate({ transcripts, flavour })`

Note on suspense vs. regular queries: `useFlavours` has no "not ready to ask yet" state (flavours are always fetchable on mount), so it's a clean `useSuspenseQuery` fit. `/upload` and `/generate` are actions with side effects (they enqueue a job), not data reads, so they're `useMutation`, not a query. `useJobPoll` genuinely can't run before a `jobId` exists, so it's a regular `useQuery` with `enabled: jobId !== null` — forcing suspense onto a query with no arguments yet would be the wrong tool here.

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

### Task 6: Presenter — `useChroniclePresenter`

**Files:**
- Create: `apps/web/src/presenters/useChroniclePresenter.ts`
- Test: `apps/web/src/presenters/useChroniclePresenter.test.tsx`

**Interfaces:**
- Consumes: `useFlavours`, `useUploadAudio`, `useJobPoll`, `useGenerateChronicle` (Task 5)
- Produces:
```ts
interface ChroniclePresenter {
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
This is the exact shape every View in Tasks 7–10 receives as props (or consumes directly, for leaf components).

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

  // Once transcription completes, seed the editable transcript textarea.
  // Guarded so the user's further edits aren't clobbered on re-render.
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

  // The chronicle-queue job result's text field is named `text`, not `chronicle`
  // (see packages/core/src/queue-types.ts's ChronicleJobResult) — matches what
  // today's static demo already reads via `result.text`.
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

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/presenters
git commit -m "feat(web): add useChroniclePresenter orchestrating the record-to-chronicle flow"
```

---

### Task 7: Static Views — `SampleChronicleCard`, `McpCallout`

**Files:**
- Create: `apps/web/src/views/SampleChronicleCard.tsx`
- Create: `apps/web/src/views/McpCallout.tsx`
- Test: `apps/web/src/views/SampleChronicleCard.test.tsx`
- Test: `apps/web/src/views/McpCallout.test.tsx`

**Interfaces:**
- Produces: `<SampleChronicleCard />`, `<McpCallout />` — no props, no state, pure copy carried over from `apps/api/src/static/index.html`.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/src/views/SampleChronicleCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SampleChronicleCard } from './SampleChronicleCard.js'

describe('SampleChronicleCard', () => {
  it('shows the illustrative chronicle text', () => {
    render(<SampleChronicleCard />)
    expect(screen.getByText(/Siege of the Flatpack Throne/)).toBeInTheDocument()
  })
})
```

```tsx
// apps/web/src/views/McpCallout.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { McpCallout } from './McpCallout.js'

describe('McpCallout', () => {
  it('links to the MCP server and README', () => {
    render(<McpCallout />)
    expect(screen.getByRole('link', { name: 'MCP server' })).toHaveAttribute(
      'href',
      'https://epicchronicler-production.up.railway.app/mcp',
    )
    expect(screen.getByRole('link', { name: 'README' })).toHaveAttribute(
      'href',
      'https://github.com/brunolazarus/epicChronicler',
    )
  })
})
```

- [ ] **Step 2: Run to verify both fail**

Run: `pnpm --filter web test`
Expected: FAIL — modules not found

- [ ] **Step 3: Write `apps/web/src/views/SampleChronicleCard.tsx`**

```tsx
export function SampleChronicleCard() {
  return (
    <div className="card">
      <div className="card-label">A story, told</div>
      <div className="chronicle">
        {`Here follows the chronicle of the Siege of the Flatpack Throne, as testified before this scribe by Marco and Júlia.

On a Saturday eve, the two companions undertook a quest of no small peril: the assembly of a bookshelf delivered in a box of cardboard, its instructions rendered in a tongue neither could decipher. Marco, ever bold, seized the Allen key as a knight seizes his sword and declared the battle begun.

Three hours did the siege endure. Twice was a shelf mounted backward and twice undone. Júlia, keeper of patience, discovered at the eleventh hour that an entire bag of fasteners had been overlooked — a revelation that nearly ended the fellowship there and then. Yet triumph came at last: the throne stood upright, bearing its full weight of books without complaint, and the companions toasted their victory with cold pizza, as is tradition among those who have suffered together.

Let it be remembered: no furniture was harmed beyond repair, and the friendship, like the bookshelf, held.`}
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#555', textAlign: 'center' }}>
        Try it with your own story ↓
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Write `apps/web/src/views/McpCallout.tsx`**

```tsx
export function McpCallout() {
  return (
    <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#333', textAlign: 'center' }}>
      Developer? Add Chronicler to Claude or Cursor as an{' '}
      <a
        href="https://epicchronicler-production.up.railway.app/mcp"
        style={{ color: '#3b82f6', textDecoration: 'none' }}
      >
        MCP server
      </a>{' '}
      — see the{' '}
      <a
        href="https://github.com/brunolazarus/epicChronicler"
        style={{ color: '#3b82f6', textDecoration: 'none' }}
      >
        README
      </a>
      .
    </p>
  )
}
```

- [ ] **Step 5: Run to verify both pass**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/SampleChronicleCard.tsx apps/web/src/views/McpCallout.tsx apps/web/src/views/SampleChronicleCard.test.tsx apps/web/src/views/McpCallout.test.tsx
git commit -m "feat(web): add static SampleChronicleCard and McpCallout views"
```

---

### Task 8: `RecordStep` View (recording, file upload, Portuguese note)

**Files:**
- Create: `apps/web/src/views/RecordStep.tsx`
- Test: `apps/web/src/views/RecordStep.test.tsx`

**Interfaces:**
- Consumes: `uploadAudio: (file: File) => void`, `uploadStatus: 'idle'|'uploading'|'transcribing'|'done'|'error'`, `uploadError: string | null` (from the Presenter, Task 6)
- Produces: `<RecordStep uploadAudio={...} uploadStatus={...} uploadError={...} />`, with `data-testid="btn-record"` and `data-testid="audio-file"` for Playwright.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordStep } from './RecordStep.js'

describe('RecordStep', () => {
  it('calls uploadAudio with the selected file', async () => {
    const uploadAudio = vi.fn()
    render(<RecordStep uploadAudio={uploadAudio} uploadStatus="idle" uploadError={null} />)

    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    const input = screen.getByTestId('audio-file')
    await userEvent.upload(input, file)

    expect(uploadAudio).toHaveBeenCalledWith(file)
  })

  it('shows the Portuguese-input note', () => {
    render(<RecordStep uploadAudio={vi.fn()} uploadStatus="idle" uploadError={null} />)
    expect(screen.getByText(/Speak in English or Portuguese/)).toBeInTheDocument()
  })

  it('shows the raw error message on upload failure', () => {
    render(
      <RecordStep uploadAudio={vi.fn()} uploadStatus="error" uploadError="Failed to upload audio" />,
    )
    expect(screen.getByText('✗ Failed to upload audio')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './RecordStep.js'`

- [ ] **Step 3: Write `apps/web/src/views/RecordStep.tsx`**

```tsx
import { useState, useRef } from 'react'

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'

export function RecordStep({
  uploadAudio,
  uploadStatus,
  uploadError,
}: {
  uploadAudio: (file: File) => void
  uploadStatus: UploadStatus
  uploadError: string | null
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunksRef.current = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      const mimeType = recorder.mimeType || 'audio/webm'
      const ext = mimeType.split('/')[1].split(';')[0]
      const blob = new Blob(chunksRef.current, { type: mimeType })
      uploadAudio(new File([blob], `recording.${ext}`, { type: mimeType }))
      setIsRecording(false)
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    setIsRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadAudio(file)
  }

  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')

  const statusText =
    uploadStatus === 'error'
      ? `✗ ${uploadError}`
      : uploadStatus === 'uploading'
        ? 'Uploading…'
        : uploadStatus === 'transcribing'
          ? 'Listening to your story…'
          : uploadStatus === 'done'
            ? '✓ Got it'
            : 'Tap record or upload an audio file.'

  const statusClass =
    uploadStatus === 'error' ? 'err' : uploadStatus === 'done' ? 'ok' : uploadStatus === 'idle' ? '' : 'wait'

  return (
    <div className={`card ${uploadStatus === 'error' ? 'error' : uploadStatus === 'done' ? 'done' : 'active'}`}>
      <div className="card-label">Step 1 — Your story</div>
      <button
        className={`record-btn ${isRecording ? 'recording' : ''}`}
        data-testid="btn-record"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={uploadStatus === 'uploading'}
      >
        {isRecording && <span className="rec-dot" />}
        <span>{isRecording ? 'Stop' : 'Start Recording'}</span>
        {isRecording && (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {m}:{s}
          </span>
        )}
      </button>
      <div className="upload-alt">
        <span>or</span>
        <label htmlFor="audio-file">upload a file</label>
        <input
          type="file"
          id="audio-file"
          data-testid="audio-file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={onFileSelected}
        />
      </div>
      <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.5rem' }}>
        Speak in English or Portuguese — your story comes back as an English legend either way.
      </p>
      <div className={`status ${statusClass}`}>{statusText}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/RecordStep.tsx apps/web/src/views/RecordStep.test.tsx
git commit -m "feat(web): add RecordStep view (recording + file upload)"
```

---

### Task 9: `TranscriptStep` and `FlavourStep` Views

**Files:**
- Create: `apps/web/src/views/TranscriptStep.tsx`
- Create: `apps/web/src/views/FlavourStep.tsx`
- Test: `apps/web/src/views/TranscriptStep.test.tsx`
- Test: `apps/web/src/views/FlavourStep.test.tsx`

**Interfaces:**
- `TranscriptStep` consumes: `transcript: string`, `setTranscript: (text: string) => void` — produces `data-testid="transcript"` textarea.
- `FlavourStep` consumes: `flavours: Flavour[]`, `selectedFlavour: string | null`, `selectFlavour: (key: string) => void`, `canGenerate: boolean`, `generate: () => void` — produces `data-testid="btn-generate"` button, and renders each flavour by its `name` (so Playwright's existing `getByText('Medieval Chronicler')` keeps working unchanged).

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/src/views/TranscriptStep.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TranscriptStep } from './TranscriptStep.js'

describe('TranscriptStep', () => {
  it('shows the transcript and calls setTranscript on edit', async () => {
    const setTranscript = vi.fn()
    render(<TranscriptStep transcript="hello" setTranscript={setTranscript} />)

    const textarea = screen.getByTestId('transcript')
    expect(textarea).toHaveValue('hello')

    await userEvent.type(textarea, '!')
    expect(setTranscript).toHaveBeenCalled()
  })
})
```

```tsx
// apps/web/src/views/FlavourStep.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlavourStep } from './FlavourStep.js'

const flavours = [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe retells your tale' }]

describe('FlavourStep', () => {
  it('selects a flavour by clicking its card', async () => {
    const selectFlavour = vi.fn()
    render(
      <FlavourStep
        flavours={flavours}
        selectedFlavour={null}
        selectFlavour={selectFlavour}
        canGenerate={false}
        generate={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Medieval Chronicler'))
    expect(selectFlavour).toHaveBeenCalledWith('medieval')
  })

  it('disables Generate until canGenerate is true', () => {
    render(
      <FlavourStep
        flavours={flavours}
        selectedFlavour="medieval"
        selectFlavour={vi.fn()}
        canGenerate={true}
        generate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('btn-generate')).toBeEnabled()
  })
})
```

- [ ] **Step 2: Run to verify both fail**

Run: `pnpm --filter web test`
Expected: FAIL — modules not found

- [ ] **Step 3: Write `apps/web/src/views/TranscriptStep.tsx`**

```tsx
export function TranscriptStep({
  transcript,
  setTranscript,
}: {
  transcript: string
  setTranscript: (text: string) => void
}) {
  return (
    <div className={`card ${transcript ? 'done' : ''}`}>
      <div className="card-label">Step 2 — What you said</div>
      <textarea
        data-testid="transcript"
        rows={5}
        placeholder="Your words will appear here…"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Write `apps/web/src/views/FlavourStep.tsx`**

```tsx
interface Flavour {
  key: string
  name: string
  description: string
}

export function FlavourStep({
  flavours,
  selectedFlavour,
  selectFlavour,
  canGenerate,
  generate,
}: {
  flavours: Flavour[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
  canGenerate: boolean
  generate: () => void
}) {
  return (
    <div className="card">
      <div className="card-label">Step 3 — Choose a voice</div>
      <div className="flavours">
        {flavours.map((f) => (
          <div
            key={f.key}
            className={`flavour ${selectedFlavour === f.key ? 'selected' : ''}`}
            onClick={() => selectFlavour(f.key)}
          >
            <div className="flavour-name">{f.name}</div>
            <div className="flavour-desc">{f.description}</div>
          </div>
        ))}
      </div>
      <button data-testid="btn-generate" onClick={generate} disabled={!canGenerate}>
        Tell the story
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run to verify both pass**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/views/TranscriptStep.tsx apps/web/src/views/FlavourStep.tsx apps/web/src/views/TranscriptStep.test.tsx apps/web/src/views/FlavourStep.test.tsx
git commit -m "feat(web): add TranscriptStep and FlavourStep views"
```

---

### Task 10: `ResultStep` View

**Files:**
- Create: `apps/web/src/views/ResultStep.tsx`
- Test: `apps/web/src/views/ResultStep.test.tsx`

**Interfaces:**
- Consumes: `chronicleText: string | null`, `audioKey: string | null`, `generateStatus: 'idle'|'generating'|'done'|'error'`, `generateError: string | null`
- Produces: `data-testid="chronicle-text"`, `data-testid="tts-player"` (an `<audio>` element with `src="/api/v1/pipeline/audio/{audioKey}"`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultStep } from './ResultStep.js'

describe('ResultStep', () => {
  it('shows placeholder text before generation', () => {
    render(<ResultStep chronicleText={null} audioKey={null} generateStatus="idle" generateError={null} />)
    expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Your chronicle will appear here…')
  })

  it('shows the chronicle text and audio player once done', () => {
    render(
      <ResultStep
        chronicleText="Here follows the chronicle..."
        audioKey="tts-abc123.mp3"
        generateStatus="done"
        generateError={null}
      />,
    )
    expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...')
    expect(screen.getByTestId('tts-player')).toHaveAttribute(
      'src',
      '/api/v1/pipeline/audio/tts-abc123.mp3',
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `Cannot find module './ResultStep.js'`

- [ ] **Step 3: Write `apps/web/src/views/ResultStep.tsx`**

```tsx
export function ResultStep({
  chronicleText,
  audioKey,
  generateStatus,
  generateError,
}: {
  chronicleText: string | null
  audioKey: string | null
  generateStatus: 'idle' | 'generating' | 'done' | 'error'
  generateError: string | null
}) {
  return (
    <div className={`card ${generateStatus === 'done' ? 'done' : generateStatus === 'error' ? 'error' : ''}`}>
      <div className="card-label">Step 4 — The chronicle</div>
      <div className="chronicle" data-testid="chronicle-text">
        {generateStatus === 'error'
          ? `✗ ${generateError}`
          : chronicleText ?? 'Your chronicle will appear here…'}
      </div>
      {audioKey && (
        <audio data-testid="tts-player" controls src={`/api/v1/pipeline/audio/${audioKey}`} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/ResultStep.tsx apps/web/src/views/ResultStep.test.tsx
git commit -m "feat(web): add ResultStep view"
```

---

### Task 11: Compose `App.tsx` — full integration

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `useChroniclePresenter` (Task 6), all Views (Tasks 7–10), `StepBoundary` (Task 4)
- Produces: the complete page, structurally equivalent to today's `apps/api/src/static/index.html`.

- [ ] **Step 1: Write the failing integration test (replaces the Task 3 placeholder test)**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from './App.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function renderApp() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('renders the heading, sample card, and MCP callout', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    renderApp()

    expect(screen.getByRole('heading', { name: 'Chronicler' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Medieval Chronicler')).toBeInTheDocument())
    expect(screen.getByText(/Siege of the Flatpack Throne/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MCP server' })).toBeInTheDocument()
  })

  it('walks the full flow: upload file, edit transcript, pick flavour, generate', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string, opts?: unknown) => {
      if (path === '/api/v1/pipeline/flavours') {
        return {
          data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
          error: undefined,
          response: new Response(),
        } as never
      }
      // /jobs/{id} — first call is for the upload job, second for the generate job
      return {
        data: {
          status: 'completed',
          progress: 100,
          result: { transcript: 'a wild tale', text: 'Here follows the chronicle...', audioKey: 'tts-1.mp3' },
          error: null,
        },
        error: undefined,
        response: new Response(),
      } as never
    })
    vi.mocked(client.POST).mockResolvedValue({
      data: { jobId: 'job-1', status: 'queued' },
      error: undefined,
      response: new Response(),
    } as never)

    renderApp()
    await waitFor(() => expect(screen.getByText('Medieval Chronicler')).toBeInTheDocument())

    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(screen.getByTestId('audio-file'), file)

    await waitFor(() => expect(screen.getByTestId('transcript')).toHaveValue('a wild tale'))

    await userEvent.click(screen.getByText('Medieval Chronicler'))
    await userEvent.click(screen.getByTestId('btn-generate'))

    await waitFor(() =>
      expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...'),
    )
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `App` doesn't yet render the sample card, MCP callout, or step views.

- [ ] **Step 3: Write the full `apps/web/src/App.tsx`**

```tsx
import { StepBoundary } from './views/StepBoundary.js'
import { SampleChronicleCard } from './views/SampleChronicleCard.js'
import { RecordStep } from './views/RecordStep.js'
import { TranscriptStep } from './views/TranscriptStep.js'
import { FlavourStep } from './views/FlavourStep.js'
import { ResultStep } from './views/ResultStep.js'
import { McpCallout } from './views/McpCallout.js'
import { useChroniclePresenter } from './presenters/useChroniclePresenter.js'

function Flow() {
  const p = useChroniclePresenter()

  return (
    <>
      <SampleChronicleCard />
      <RecordStep uploadAudio={p.uploadAudio} uploadStatus={p.uploadStatus} uploadError={p.uploadError} />
      <TranscriptStep transcript={p.transcript} setTranscript={p.setTranscript} />
      <FlavourStep
        flavours={p.flavours}
        selectedFlavour={p.selectedFlavour}
        selectFlavour={p.selectFlavour}
        canGenerate={p.canGenerate}
        generate={p.generate}
      />
      <ResultStep
        chronicleText={p.chronicleText}
        audioKey={p.audioKey}
        generateStatus={p.generateStatus}
        generateError={p.generateError}
      />
    </>
  )
}

export default function App() {
  return (
    <div>
      <h1>Chronicler</h1>
      <p className="subtitle">Record a voice story. Hear it told back as a legend.</p>
      <StepBoundary fallback={<p>Loading…</p>}>
        <Flow />
      </StepBoundary>
      <McpCallout />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS — all tests green, including the two new integration tests.

- [ ] **Step 5: Manual verification against the real dev server**

Run (terminal 1): `pnpm dev` (starts `apps/api` on port 3000)
Run (terminal 2): `pnpm --filter web dev`

Open the printed Vite URL in a browser. Confirm: heading, sample chronicle card, record button, file upload, flavour cards (once `/flavours` loads), and MCP footer all render with the ported dark theme styling.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): compose full app from Presenter + Views"
```

---

### Task 12: Swap `apps/api`'s static serving to the new build

**Files:**
- Modify: `apps/api/src/index.ts:14-15` (landing page read), `apps/api/src/index.ts` (static file serving)
- Modify: `apps/api/package.json` (add `@hono/node-server`'s `serve-static`, no new dependency needed — already part of `@hono/node-server`)
- Delete: `apps/api/src/static/index.html`

**Interfaces:**
- Consumes: `apps/web/dist/` (Vite build output from Task 1/11)
- Produces: `apps/api`'s `/` route (and any `/assets/*` paths Vite's build emits) serve the React app instead of the old static HTML.

- [ ] **Step 1: Build `apps/web` to confirm output shape**

Run: `pnpm --filter web build`
Expected: `apps/web/dist/index.html` and `apps/web/dist/assets/*.js` / `*.css` exist.

- [ ] **Step 2: Modify `apps/api/src/index.ts`**

Replace:
```ts
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
```
with:
```ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
```

Replace:
```ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const landingPage = readFileSync(join(__dirname, "static/index.html"), "utf-8");
```
with:
```ts
const __dirname = dirname(fileURLToPath(import.meta.url));
const webDist = join(__dirname, "../../web/dist");
```

Replace:
```ts
app.get("/", (c) => c.html(landingPage));
```
with:
```ts
app.use("/assets/*", serveStatic({ root: webDist.replace(__dirname + "/", "") }));
app.get("/", serveStatic({ path: join(webDist, "index.html") }));
```

Note: `serveStatic`'s `root`/`path` options resolve relative to the process's current working directory, not `__dirname` — since `apps/api` is always run from its own package directory (`pnpm --filter api dev`/`start` both `cd` into `apps/api` first), `join(webDist, ...)` still needs to be relative to that cwd. Use `"../web/dist"` (relative from `apps/api/`) directly instead of computing from `__dirname`, to match how Hono's `serveStatic` actually resolves paths:

```ts
app.use("/assets/*", serveStatic({ root: "../web/dist" }));
app.get("/", serveStatic({ path: "../web/dist/index.html" }));
```

- [ ] **Step 3: Update `apps/api/package.json`'s `build` script so it depends on `apps/web` being built first**

`turbo.json`'s `"build": { "dependsOn": ["^build"] }` already orders workspace dependency builds correctly, but `apps/api` doesn't declare a dependency on `web` in its `package.json` (it reads the built files at runtime via a relative path, not via an import) — add it as a `devDependency` so Turborepo's dependency graph picks it up:

Modify `apps/api/package.json`, in `"devDependencies"`, add:
```json
"web": "workspace:*"
```

- [ ] **Step 4: Delete the old static file**

Run: `rm -rf apps/api/src/static`

- [ ] **Step 5: Verify end-to-end locally**

Run: `pnpm --filter web build`
Run: `pnpm dev` (starts `apps/api`)
Open `http://localhost:3000/` in a browser.

Expected: the same page Task 11 verified via the Vite dev server now loads from `apps/api` directly, confirming static-serving swap works.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json
git rm -r apps/api/src/static
git commit -m "feat(api): serve apps/web's build output instead of the static demo"
```

---

### Task 13: Update Playwright E2E suite to `data-testid` selectors

**Files:**
- Modify: `tests/web/full-journey.spec.ts`
- Modify: `playwright.config.ts` (webServer command needs `apps/web` built before `apps/api` starts, since `apps/api` now serves its build output)

**Interfaces:**
- Consumes: the `data-testid` attributes added in Tasks 8–10 (`audio-file`, `transcript`, `btn-generate`, `chronicle-text`, `tts-player`)

- [ ] **Step 1: Update `tests/web/full-journey.spec.ts` selectors**

Replace:
```ts
await page.locator('#audio-file').setInputFiles('tests/fixtures/sample.mp3')

await expect(page.locator('#transcript')).toHaveValue(
```
with:
```ts
await page.getByTestId('audio-file').setInputFiles('tests/fixtures/sample.mp3')

await expect(page.getByTestId('transcript')).toHaveValue(
```

Replace:
```ts
await page.locator('#btn-generate').click()

await expect(page.locator('#chronicle-text')).toHaveText(
```
with:
```ts
await page.getByTestId('btn-generate').click()

await expect(page.getByTestId('chronicle-text')).toHaveText(
```

Replace:
```ts
const player = page.locator('#tts-player')
```
with:
```ts
const player = page.getByTestId('tts-player')
```

(The `page.getByText('Medieval Chronicler')` line is unchanged — `FlavourStep` renders that exact text.)

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
git commit -m "test: repoint Playwright web suite at data-testid selectors"
```

---

### Task 14: Contract-drift CI check

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

Run locally: temporarily add an extra field to `FlavourSchema` in `apps/api/src/routes/pipeline.ts` (e.g. `z.object({ key: z.string(), name: z.string(), description: z.string(), extra: z.string().optional() })`).
Run: `pnpm dev` (in one terminal)
Run: `pnpm --filter @chronicler/api-client check-drift` (in another)
Expected: FAIL — `diff` reports a difference between committed `types.gen.ts` and freshly regenerated types.

Revert the temporary schema change:
Run: `git checkout apps/api/src/routes/pipeline.ts`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/contract-drift.yml
git commit -m "ci: add API contract-drift check against packages/api-client"
```

---

## Plan self-review notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` maps to a task — structure (Tasks 1, 2, 6–11), data flow (Task 5, 6), error/loading handling (Task 4), testing (Tasks 3, 5–11, 13, 14), deployment/rollout (Task 12), success criteria (all tasks collectively; no `packages/core`/`packages/ui` created, confirmed by the task list above never introducing them).
- **Type consistency:** `Flavour`, `JobStatus`, `Transcript` shapes are defined once (Task 5) and reused with matching field names across the Presenter (Task 6) and Views (Tasks 8–10) — cross-checked all prop names (`uploadAudio`, `uploadStatus`, `uploadError`, `chronicleText`, `audioKey`, `generateStatus`, `generateError`, `canGenerate`, `generate`, `selectFlavour`, `selectedFlavour`, `flavours`, `transcript`, `setTranscript`) against the Presenter's returned object in Task 6 and each View's destructured props in Tasks 7–10.
- **Backend contract verification:** cross-checked the job-result field names the Presenter reads against `packages/core/src/queue-types.ts` directly rather than assuming. Found and fixed one real mismatch — the chronicle-generation job's text field is `text` (`ChronicleJobResult.text`), not `chronicle` as an earlier draft of this plan had it in both Task 6's Presenter and Task 11's integration test mock. Both now read `result.text`, matching what today's existing `index.html` already does and what the real backend actually returns.
