# Web E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first real browser-driven Playwright test in this repo, walking the web demo's full user journey (upload → transcript → flavour → chronicle → audio) against the AI mocking layer from sub-project 1.

**Architecture:** A new Playwright project (`web`) runs browser tests against the same API server + mock AI server already wired up by sub-project 1's `webServer` config. One new fixture file (a dummy upload input) and one new spec file drive the real page via its actual DOM — no direct API calls bypassing the UI.

**Tech Stack:** Playwright's browser (`page`) fixture and `request` fixture (already a dependency — no new packages).

## Global Constraints

- File-upload flow only — no `MediaRecorder`/`getUserMedia` mic recording in this sub-project.
- One full-journey test, not separate tests per step — the demo's steps are linear and stateful (a flavour can't be generated without a transcript first).
- No Page Object Model abstraction — one test file with a handful of selectors doesn't justify a `tests/web/pages/` layer.
- All content assertions must be exact matches (`toHaveValue`, `toHaveText`, not `toContain`/truthy checks) against the sub-project-1 fixtures, so a leaked real AI call fails the test instead of passing coincidentally.
- Depends on sub-project 1's fixtures already existing at `tests/fixtures/transcription.json` and `tests/fixtures/chronicle.json`, and the `webServer` array in `playwright.config.ts` already pointing the API at the mock server.

---

### Task 1: Web Playwright project + upload fixture

**Files:**
- Modify: `playwright.config.ts:11-16` (the `projects` array)
- Create: `tests/fixtures/sample.mp3`

**Interfaces:**
- Consumes: nothing new
- Produces: a `web` Playwright project matching `tests/web/**/*.spec.ts`, and `tests/fixtures/sample.mp3` on disk — both consumed by Task 2's test file.

- [ ] **Step 1: Add the `web` project**

In `playwright.config.ts`, add a second entry to the `projects` array (leave the existing `api` entry untouched):

```typescript
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
    {
      name: 'web',
      testMatch: 'tests/web/**/*.spec.ts',
    },
  ],
```

- [ ] **Step 2: Create the upload fixture**

This file is fed into the demo's file input purely to trigger the upload flow — its actual bytes are irrelevant since the mock server's `/audio/transcriptions` route returns a canned response regardless of request content. Same technique as `tests/fixtures/tts.mp3` from sub-project 1 (MPEG frame sync byte + zero padding):

```bash
printf '\xFF\xFB\x90\x00' > tests/fixtures/sample.mp3
dd if=/dev/zero bs=1 count=256 >> tests/fixtures/sample.mp3 2>/dev/null
```

- [ ] **Step 3: Verify the project config is valid and the fixture exists**

Run: `pnpm exec playwright test --project=web --list`
Expected: exits with code 0, reports `Total: 0 tests in 0 files` (no test files exist yet — this only proves the project definition itself is valid and doesn't error, not that anything runs).

Run: `wc -c tests/fixtures/sample.mp3`
Expected: `260 tests/fixtures/sample.mp3`

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/fixtures/sample.mp3
git commit -m "test: add web Playwright project and upload fixture"
```

---

### Task 2: Full user journey test

**Files:**
- Create: `tests/web/full-journey.spec.ts`

**Interfaces:**
- Consumes:
  - The `web` Playwright project and `tests/fixtures/sample.mp3` (Task 1)
  - `tests/fixtures/transcription.json` → `{ "text": "Alex said: we got lost on the trail for two hours before finding the summit marker. Sam said: worth it for the view, even though my feet are still recovering." }` (sub-project 1)
  - `tests/fixtures/chronicle.json` → chronicle text `"Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam."` (sub-project 1)
  - DOM elements from `apps/api/src/static/index.html`: `#audio-file` (hidden file input), `#transcript` (textarea), `.flavour` cards rendered with `.flavour-name` text `"Medieval Chronicler"`, `#btn-generate` (button), `#chronicle-text` (div), `#tts-player` (audio element, `display: none` until a chronicle exists)
- Produces: nothing consumed elsewhere — this is the sub-project's proof test.

- [ ] **Step 1: Write the test**

Create `tests/web/full-journey.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('full journey: upload, transcript, flavour, generate, playback', async ({ page }) => {
  test.setTimeout(30_000) // browser overhead + two poll waits; global config timeout (15s) is tuned for the API-only project

  await page.goto('/')

  await page.locator('#audio-file').setInputFiles(path.join(__dirname, '..', 'fixtures', 'sample.mp3'))

  await expect(page.locator('#transcript')).toHaveValue(
    "Alex said: we got lost on the trail for two hours before finding the summit marker. Sam said: worth it for the view, even though my feet are still recovering.",
    { timeout: 10_000 },
  )

  await page.getByText('Medieval Chronicler').click()

  await page.locator('#btn-generate').click()

  await expect(page.locator('#chronicle-text')).toHaveText(
    "Here follows the chronicle of the fellowship's ascent, as testified before this scribe by Alex and Sam.",
    { timeout: 10_000 },
  )

  const player = page.locator('#tts-player')
  await expect(player).toBeVisible()

  const src = await player.getAttribute('src')
  expect(src).toMatch(/^\/api\/v1\/pipeline\/audio\/tts-.*\.mp3$/)

  const audioRes = await page.request.get(src!)
  expect(audioRes.status()).toBe(200)
  expect(audioRes.headers()['content-type']).toBe('audio/mpeg')
})
```

- [ ] **Step 2: Run it and verify it passes**

Run: `pnpm test`
Expected: `10 passed` (the 9 existing tests plus this one). If the transcript or chronicle assertions time out, check that the mock AI server and API server both started (visible in the Playwright output) before assuming a test bug — a stale dev server already bound to port 3000 will silently defeat the mock, the same issue found when merging sub-project 1.

- [ ] **Step 3: Commit**

```bash
git add tests/web/full-journey.spec.ts
git commit -m "test: add full-journey browser test for the web demo"
```

---

## Summary

After both tasks: `pnpm test` runs 10 Playwright tests, including one real browser-driven test that exercises the web demo's actual DOM and JavaScript end-to-end against the mocked AI providers — proving the UI wiring works, not just the API layer underneath it. Sub-project 3 (MCP tool tests) can proceed independently; sub-project 4 (CI) still waits until both are done.
