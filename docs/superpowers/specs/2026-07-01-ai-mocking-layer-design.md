# AI Provider Mocking Layer — Design

**Date:** 2026-07-01
**Sub-project:** 1 of 4 (testing plan decomposition — see `docs/devlog/2026-06-15-testing.md`)
**Depends on:** nothing (foundational)
**Blocks:** web E2E tests, CI wiring

---

## Problem

`docs/devlog/2026-06-15-testing.md` planned to mock AI calls via Playwright's `page.route()`, intercepting `api.groq.com` and `openrouter.ai`. That mechanism only intercepts requests made by a browser page. Every AI call in this codebase happens server-side — inside BullMQ workers, via the OpenAI SDK's Node `fetch` client (`packages/core/src/{transcription,llm,tts}/*.ts`). `page.route()` cannot see or fake these calls. The plan's mocking strategy would have mocked nothing.

The devlog's own stated philosophy — "mock at the HTTP boundary, not the function boundary," so real request-building and response-parsing code still runs — is worth keeping. The 2026-06-19 node-fetch/`duplex` production incident was exactly a request-construction bug that only a real HTTP round trip would have caught; a provider-level test double would have missed it. So the goal is an HTTP-boundary mock that actually works for server-to-server calls.

## Approach

Redirect the providers' base URLs to a local fixture server during tests, instead of intercepting the browser's network.

### 1. Configurable base URLs

`packages/core/src/environment.ts` gains two optional fields, defaulting to today's hardcoded production values:

```typescript
GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
```

The three provider constructors switch from a hardcoded `baseURL` string to `env.GROQ_BASE_URL` / `env.OPENROUTER_BASE_URL`:
- `transcription/groq.ts:21`
- `llm/openrouter.ts:14`
- `tts/openrouter.ts:14`

No behavior change in production — the defaults match what's hardcoded today.

### 2. Local fixture server

`tests/helpers/mock-ai-server.mjs` — a dependency-free Node `http` server (plain ESM, no TypeScript tooling needed to run it directly). Since Groq and OpenRouter are both reachable through one overridable host once `baseURL` is configurable, a single server instance serves all three routes on one port:

| Route | Method | Serves |
|---|---|---|
| `/audio/transcriptions` | POST | `tests/fixtures/transcription.json` → `{ text: "..." }` |
| `/chat/completions` | POST | `tests/fixtures/chronicle.json` → OpenAI-shaped completion (`choices[0].message.content`, `usage.prompt_tokens`/`completion_tokens`) |
| `/audio/speech` | POST | `tests/fixtures/tts.mp3` raw bytes |

Fixtures are static — no request inspection or conditional responses needed for this sub-project (deferred: failure-injection / scenario selection).

### 3. Wiring into Playwright

`playwright.config.ts`'s `webServer` becomes an array: the fixture server starts first, then the API server, with the API server's `env` pointing `GROQ_BASE_URL`/`OPENROUTER_BASE_URL` at the fixture server's local address.

### 4. Fast vs. integration split

Two npm scripts against the same spec files:
- `test` (default) — mock base URLs set, runs `--grep-invert @integration`. Runs on every push once CI exists.
- `test:integration` — base URLs left unset (hits real Groq/OpenRouter), runs `--grep @integration` only. Manual / pre-deploy.

## What's explicitly out of scope

- **R2 mocking** — TTS audio is still written to a real R2 bucket by the chronicle worker. Local dev already has real R2 credentials, so this keeps working unchanged; mocking R2 is not needed to fake AI provider calls and isn't tackled here.
- **Web E2E tests, MCP tool tests, CI wiring** — separate sub-projects (2–4) that depend on this one but aren't designed here.
- **Failure-injection fixtures** (simulated 500s, timeouts) — the fixture server returns only canned success responses for now.

## New test

`tests/api/pipeline-mocked.spec.ts` — `POST /generate` with sample transcripts + a flavour → poll `/jobs/:id` until `completed` → assert the chronicle text matches the fixture content and the result includes a `tts-`-prefixed audio key. This is the one test in this sub-project that proves the mechanism actually works end-to-end (route → queue → chronicle worker → mocked LLM → mocked TTS → real R2 write), not just that the pieces exist.

## Success criteria

- `pnpm test` produces zero real traffic to `api.groq.com` / `openrouter.ai`. Local `.env` holds real, valid keys, so a leaked real call would succeed silently rather than fail — not a safe thing to rely on for verification. Instead: the mocked pipeline test must complete in well under a second per provider call (the fixture server responds instantly; real Groq/OpenRouter round trips take 2–20s), and CI (sub-project 4) will run with `GROQ_API_KEY`/`OPENROUTER_API_KEY` set to placeholder strings, so any call that escapes the mock fails on auth immediately.
- Existing 8 route tests in `tests/api/pipeline.spec.ts` pass unchanged
- New `pipeline-mocked.spec.ts` passes
- `pnpm test:integration` still exercises the real APIs when run manually
