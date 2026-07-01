# Web E2E Tests — Design

**Date:** 2026-07-01
**Sub-project:** 2 of 4 (testing plan decomposition — see `docs/devlog/2026-06-15-testing.md`)
**Depends on:** sub-project 1, AI provider mocking layer (merged)
**Blocks:** nothing — independent of sub-project 3 (MCP tool tests)

---

## Problem

Sub-project 1 built the mechanism to fake Groq/OpenRouter responses in tests, but the only test using it (`tests/api/pipeline-mocked.spec.ts`) drives the API directly via HTTP requests — it never opens a real browser. The web demo (`apps/api/src/static/index.html`) is the actual user-facing product: a four-step page (record-or-upload → transcript → pick a flavour → generate → chronicle text + audio playback) served from the same API process. Playwright's core capability — real browser automation — is still completely unused in this repo. This sub-project adds the first test that actually drives that page.

## Scope

The demo supports two ways to get audio in: a hidden file input (`#audio-file`) and live mic recording via `MediaRecorder`/`getUserMedia`. Mic recording requires Chromium's fake-media-device launch flags to test headlessly. Per decision: **file upload only** for this sub-project — reliable, no special browser flags, and it exercises the same upload → transcribe → generate → play chain. The `MediaRecorder`/`getUserMedia` wiring itself is not covered.

The demo's steps are linear and stateful (a flavour can't be generated without a transcript first). Per decision: **one full-journey test**, not separate tests per step — this matches how a real user interacts with the page and avoids reaching into the page to fake state that wouldn't occur through real interaction.

## Approach

### 1. New Playwright project

Add a `web` project to `playwright.config.ts`'s `projects` array, alongside the existing `api` project:

```typescript
{
  name: 'web',
  testMatch: 'tests/web/**/*.spec.ts',
},
```

No explicit browser device config is needed — Playwright launches Chromium by default for any test using the `page` fixture (the existing `api` project skips browser launch entirely since it only uses the `request` fixture). The `webServer` array from sub-project 1 (mock AI server + API server pointed at it) is shared across all projects — no duplication, no new server config.

### 2. New fixture: upload input file

`tests/fixtures/sample.mp3` — a small deterministic dummy file, built the same way as `tts.mp3` (fixed byte header + padding via `printf`/`dd`, no real audio content needed). This is fed into the hidden file input purely to trigger the upload flow; its actual bytes are irrelevant since the mock server's `/audio/transcriptions` route returns a canned response regardless of request content.

### 3. New test: full user journey

`tests/web/full-journey.spec.ts` — one test:

1. `page.goto('/')`
2. `page.locator('#audio-file').setInputFiles('tests/fixtures/sample.mp3')` — fires the page's own `onchange` handler → `uploadAudio()`. No `getUserMedia`/mic permission involved.
3. Assert the `#transcript` textarea's value equals the exact text in `tests/fixtures/transcription.json` — proves upload → mocked-Groq → client-side poll works through real page JS, not just the API layer.
4. Click a flavour card (e.g. the one for `medieval`).
5. Click `#btn-generate` (auto-enables once transcript + flavour are both set).
6. Assert `#chronicle-text`'s content equals the exact text in `tests/fixtures/chronicle.json` — proves generate → mocked-LLM → poll works.
7. Assert `#tts-player` becomes visible with a `src` matching `/api/v1/pipeline/audio/tts-.*\.mp3$/`, and that fetching that URL directly (via `page.request.get(...)`) returns `200` with `Content-Type: audio/mpeg` — proves the fake TTS bytes actually round-tripped through R2 and are servable, not just that the frontend guessed a plausible-looking URL.

All content assertions are exact matches (`toHaveValue`, `toHaveText`, not `toContain`/truthy checks) — a leaked real AI call would produce different, non-deterministic prose and fail immediately, the same proof principle as sub-project 1's `pipeline-mocked.spec.ts`.

## What's explicitly out of scope

- **Mic recording (`MediaRecorder`/`getUserMedia`)** — deferred; would need Chromium fake-media-device flags and is a separate, more fragile test.
- **Page Object Model abstraction** — one test file with a handful of selectors doesn't justify a `tests/web/pages/` layer yet. Selectors live inline in the spec.
- **MCP tool tests, CI wiring** — separate sub-projects (3, 4).

## Success criteria

- `pnpm test` reports 10 passed (the existing 9 plus this new one)
- The new test drives the real page in a real (headless) browser — no direct API calls bypassing the UI
- Every assertion is an exact match against the sub-project-1 fixtures, so a real AI call slipping through would fail the test rather than pass coincidentally
