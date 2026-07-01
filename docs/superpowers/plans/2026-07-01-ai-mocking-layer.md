# AI Provider Mocking Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI calls (Groq Whisper, OpenRouter LLM, OpenRouter TTS) fakeable in tests by redirecting provider base URLs to a local fixture server, and prove the mechanism works end-to-end with one real pipeline test.

**Architecture:** Provider `baseURL`s become configurable via env vars (defaulting to today's production URLs). A dependency-free Node `http` server serves three static fixture responses on one local port. Playwright starts that server before the API server and points the API's env at it, unless `USE_REAL_AI=1` is set (integration mode).

**Tech Stack:** Zod (env schema), OpenAI SDK client (`baseURL` option), Node built-in `http`/`fs` (no new dependencies), Playwright `webServer` array.

## Global Constraints

- `GROQ_BASE_URL` defaults to `https://api.groq.com/openai/v1`; `OPENROUTER_BASE_URL` defaults to `https://openrouter.ai/api/v1` — production behavior must not change when these env vars are unset.
- No R2 mocking — TTS audio still writes to the real R2 bucket using existing local `.env` credentials.
- No new npm dependencies for the fixture server — Node's built-in `http`/`fs` only.
- Fixture server returns static canned responses only — no request inspection, no failure-injection.
- This repo has no unit test runner (Playwright only). Config-only tasks are verified by `pnpm --filter @chronicler/core build` (typecheck) and by the final end-to-end Playwright test, not by isolated unit tests.

---

### Task 1: Configurable provider base URLs

**Files:**
- Modify: `packages/core/src/environment.ts`
- Modify: `packages/core/src/transcription/groq.ts:19-25`
- Modify: `packages/core/src/llm/openrouter.ts:12-19`
- Modify: `packages/core/src/tts/openrouter.ts:12-19`

**Interfaces:**
- Consumes: nothing new
- Produces: `env.GROQ_BASE_URL: string`, `env.OPENROUTER_BASE_URL: string` — read by Task 4's mock server wiring (indirectly, via the API process env) and proven correct by Task 5's end-to-end test. No isolated behavioral test exists for this task alone — see Global Constraints.

- [ ] **Step 1: Add the two env fields**

In `packages/core/src/environment.ts`, add two fields to the schema (after `GROQ_API_KEY`):

```typescript
const schema = z.object({
  PORT: z.coerce.number().default(3000),
  // Redis is only used by the API and worker — optional so the MCP server can start without it
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  GROQ_API_KEY: z.string(),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  ELEVENLABS_API_KEY: z.string().optional(),
  // R2 is only used by the API and worker — optional so the MCP server can start without storage credentials
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
})
```

- [ ] **Step 2: Use the new env vars in the Groq provider**

In `packages/core/src/transcription/groq.ts`, replace the hardcoded `baseURL`:

```typescript
  constructor() {
    this.client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: env.GROQ_BASE_URL,
      fetch: ((url: string, init?: RequestInit) =>
        fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
      ) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
    })
  }
```

- [ ] **Step 3: Use the new env var in the LLM provider**

In `packages/core/src/llm/openrouter.ts`, replace the hardcoded `baseURL`:

```typescript
  constructor(modelKey: OpenRouterLLMModelKey = DEFAULT_LLM_MODEL) {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      timeout: 90_000,
      fetch: ((url: string, init?: RequestInit) =>
        fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
      ) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
    })
    this.modelKey = modelKey
  }
```

- [ ] **Step 4: Use the new env var in the TTS provider**

In `packages/core/src/tts/openrouter.ts`, replace the hardcoded `baseURL`:

```typescript
  constructor(modelKey: OpenRouterTTSModelKey = DEFAULT_TTS_MODEL) {
    this.client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      timeout: 90_000,
      fetch: ((url: string, init?: RequestInit) =>
        fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
      ) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
    })
    this.modelKey = modelKey
  }
```

- [ ] **Step 5: Build core and verify it typechecks**

Run: `pnpm --filter @chronicler/core build`
Expected: builds successfully, no TypeScript errors. This confirms the schema and provider changes are structurally correct; functional proof that the override actually redirects traffic comes from Task 5.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/environment.ts packages/core/src/transcription/groq.ts packages/core/src/llm/openrouter.ts packages/core/src/tts/openrouter.ts
git commit -m "feat: make Groq/OpenRouter base URLs configurable via env"
```

---

### Task 2: Fixture files

**Files:**
- Create: `tests/fixtures/transcription.json`
- Create: `tests/fixtures/chronicle.json`
- Create: `tests/fixtures/tts.mp3`

**Interfaces:**
- Consumes: nothing
- Produces: three files on disk read by Task 3's mock server:
  - `transcription.json` → `{ text: string }` (Groq Whisper response shape)
  - `chronicle.json` → `{ choices: [{ message: { content: string } }], usage: { prompt_tokens: number, completion_tokens: number } }` (OpenAI chat completion shape)
  - `tts.mp3` → raw bytes returned as-is for `audio.speech.create()`

- [ ] **Step 1: Create the fixtures directory and JSON fixtures**

```bash
mkdir -p tests/fixtures
```

Write `tests/fixtures/transcription.json`:

```json
{
  "text": "Alex said: we got lost on the trail for two hours before finding the summit marker. Sam said: worth it for the view, even though my feet are still recovering."
}
```

Write `tests/fixtures/chronicle.json`:

```json
{
  "choices": [
    {
      "message": {
        "content": "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 18
  }
}
```

- [ ] **Step 2: Create the binary TTS fixture**

The OpenAI SDK's `audio.speech.create()` response is only ever turned into a `Buffer` via `response.arrayBuffer()` and written to R2 — nothing decodes it as real audio in tests, so a small deterministic byte sequence is sufficient (starts with an MPEG frame sync byte for shape, then zero padding):

```bash
printf '\xFF\xFB\x90\x00' > tests/fixtures/tts.mp3
dd if=/dev/zero bs=1 count=256 >> tests/fixtures/tts.mp3 2>/dev/null
```

- [ ] **Step 3: Verify the fixtures**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('tests/fixtures/transcription.json')).text.length, JSON.parse(require('fs').readFileSync('tests/fixtures/chronicle.json')).choices[0].message.content.length, require('fs').statSync('tests/fixtures/tts.mp3').size)"`
Expected: prints three positive numbers (e.g. `158 103 260`) — proves both JSON files parse and contain the expected shape, and the binary fixture has non-zero size.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/transcription.json tests/fixtures/chronicle.json tests/fixtures/tts.mp3
git commit -m "test: add AI provider fixture responses"
```

---

### Task 3: Mock AI server

**Files:**
- Create: `tests/helpers/mock-ai-server.mjs`

**Interfaces:**
- Consumes: `tests/fixtures/transcription.json`, `tests/fixtures/chronicle.json`, `tests/fixtures/tts.mp3` (Task 2)
- Produces: an HTTP server listening on `process.env.MOCK_AI_PORT` (default `4010`), serving:
  - `POST /audio/transcriptions` → 200, `application/json`, `transcription.json` contents
  - `POST /chat/completions` → 200, `application/json`, `chronicle.json` contents
  - `POST /audio/speech` → 200, `audio/mpeg`, `tts.mp3` bytes
  - anything else → 404, `{ "error": "not found in mock-ai-server" }`

  Consumed by Task 4 (Playwright `webServer` entry).

- [ ] **Step 1: Write the server**

Create `tests/helpers/mock-ai-server.mjs`:

```javascript
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '..', 'fixtures')

const transcription = JSON.parse(readFileSync(join(fixturesDir, 'transcription.json'), 'utf-8'))
const chronicle = JSON.parse(readFileSync(join(fixturesDir, 'chronicle.json'), 'utf-8'))
const ttsAudio = readFileSync(join(fixturesDir, 'tts.mp3'))

const PORT = process.env.MOCK_AI_PORT ? Number(process.env.MOCK_AI_PORT) : 4010

const routes = {
  '/audio/transcriptions': () => ({ status: 200, contentType: 'application/json', body: JSON.stringify(transcription) }),
  '/chat/completions': () => ({ status: 200, contentType: 'application/json', body: JSON.stringify(chronicle) }),
  '/audio/speech': () => ({ status: 200, contentType: 'audio/mpeg', body: ttsAudio }),
}

const server = createServer((req, res) => {
  req.on('data', () => {}) // drain the request body; fixture responses don't inspect it
  req.on('end', () => {
    const handler = req.method === 'POST' ? routes[req.url] : undefined
    const response = handler
      ? handler()
      : { status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found in mock-ai-server' }) }

    res.writeHead(response.status, { 'Content-Type': response.contentType })
    res.end(response.body)
  })
})

server.listen(PORT, () => {
  console.log(`[mock-ai-server] listening on http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Verify it manually**

Run: `node tests/helpers/mock-ai-server.mjs &`
Then: `sleep 1 && curl -s -X POST http://localhost:4010/chat/completions`
Expected: prints the exact JSON from `tests/fixtures/chronicle.json`

Then: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4010/nonexistent-route`
Expected: `404`

Then stop the background server: `kill %1`

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/mock-ai-server.mjs
git commit -m "test: add local fixture server for Groq/OpenRouter responses"
```

---

### Task 4: Wire the mock server into Playwright

**Files:**
- Modify: `playwright.config.ts`
- Modify: `package.json:8-9`

**Interfaces:**
- Consumes: `tests/helpers/mock-ai-server.mjs` (Task 3), `env.GROQ_BASE_URL`/`env.OPENROUTER_BASE_URL` (Task 1)
- Produces: `pnpm test` runs the fast suite (mocked AI, excludes `@integration`-tagged tests); `pnpm test:integration` runs only `@integration`-tagged tests against real APIs. Consumed by Task 5's test and by anyone running the suite going forward.

- [ ] **Step 1: Update `playwright.config.ts`**

Replace the full file contents:

```typescript
import { defineConfig } from '@playwright/test'

const useRealAi = process.env.USE_REAL_AI === '1'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
  ],
  webServer: [
    ...(useRealAi
      ? []
      : [
          {
            command: 'node tests/helpers/mock-ai-server.mjs',
            port: 4010,
            reuseExistingServer: true,
            timeout: 10_000,
          },
        ]),
    {
      command: 'dotenv -e .env -- pnpm --filter api dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30_000,
      env: useRealAi
        ? {}
        : {
            GROQ_BASE_URL: 'http://localhost:4010',
            OPENROUTER_BASE_URL: 'http://localhost:4010',
          },
    },
  ],
})
```

- [ ] **Step 2: Update the root `package.json` scripts**

In `package.json`, replace:

```json
    "test": "playwright test",
    "test:ui": "playwright test --ui"
```

with:

```json
    "test": "playwright test --grep-invert @integration",
    "test:integration": "USE_REAL_AI=1 playwright test --grep @integration",
    "test:ui": "playwright test --ui"
```

- [ ] **Step 3: Verify the existing suite still passes with the mock server wired in**

Run: `pnpm test`
Expected: all 8 existing tests in `tests/api/pipeline.spec.ts` pass, and the terminal output shows the API server starting only after `[mock-ai-server] listening on http://localhost:4010` is logged — confirming the mock server boots first and the existing tests are unaffected (they don't call AI providers, so this proves the new webServer entry doesn't break anything already working).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts package.json
git commit -m "test: start local AI mock server before the API in the fast test suite"
```

---

### Task 5: Mocked full-pipeline test

**Files:**
- Create: `tests/api/pipeline-mocked.spec.ts`

**Interfaces:**
- Consumes: `POST /api/v1/pipeline/generate` (body: `{ transcripts: Array<{speaker: string, text: string}>, flavour: string }`, returns `{ jobId: string, status: 'queued' }`), `GET /api/v1/pipeline/jobs/:id` (returns `{ id, queue, status, progress, result, error }`, where on `status === 'completed'`, `result` is `{ text: string, audioKey: string, llmMs: number, ttsMs: number, totalMs: number, inputTokens: number, outputTokens: number, cacheReadTokens: number }` per `ChronicleJobResult` in `packages/core/src/queue-types.ts`)
- Produces: nothing consumed elsewhere — this is the terminal proof for this plan

- [ ] **Step 1: Write the test**

Create `tests/api/pipeline-mocked.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('generate chronicle end-to-end through mocked LLM + TTS', async ({ request }) => {
  const generateRes = await request.post('/api/v1/pipeline/generate', {
    data: {
      transcripts: [
        { speaker: 'Alex', text: 'We got lost on the trail for two hours before finding the summit.' },
        { speaker: 'Sam', text: 'Worth it for the view, even if my feet are still recovering.' },
      ],
      flavour: 'medieval',
    },
  })
  expect(generateRes.status()).toBe(200)
  const { jobId } = await generateRes.json()

  let result: { text: string; audioKey: string } | null = null
  for (let i = 0; i < 20; i++) {
    const pollRes = await request.get(`/api/v1/pipeline/jobs/${jobId}`)
    const body = await pollRes.json()
    if (body.status === 'completed') {
      result = body.result
      break
    }
    if (body.status === 'failed') throw new Error(`job failed: ${body.error}`)
    await new Promise((r) => setTimeout(r, 250))
  }

  expect(result).not.toBeNull()
  expect(result!.text).toBe(
    "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam.",
  )
  expect(result!.audioKey).toMatch(/^tts-.*\.mp3$/)
})
```

- [ ] **Step 2: Run it and verify it passes**

Run: `pnpm test`
Expected: `9 passed` (the 8 existing tests plus this one). Note the reported duration for this specific test — it should be well under a second of actual AI-call time (the poll loop itself may take a couple hundred ms, but there's no 2-20s real network round trip to Groq/OpenRouter). This is the functional proof that Task 1's base URL override and Task 3's mock server are wired together correctly.

- [ ] **Step 3: Commit**

```bash
git add tests/api/pipeline-mocked.spec.ts
git commit -m "test: prove chronicle generation works end-to-end against mocked AI providers"
```

---

## Summary

After all 5 tasks: `pnpm test` runs 9 Playwright tests against a real API server whose Groq/OpenRouter calls are transparently redirected to a local fixture server — zero real AI traffic, sub-second execution, and one test proves the full route → queue → worker → mocked-LLM → mocked-TTS → R2 chain actually works. `pnpm test:integration` remains available to hit real APIs manually. Sub-projects 2–4 (web E2E, MCP tests, CI) can now build on this foundation.
