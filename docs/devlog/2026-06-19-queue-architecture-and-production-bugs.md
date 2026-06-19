# Queue Architecture Refactor & Production Bug Hunting — Decision Log

**Date:** 2026-06-19
**Phase:** 1
**Status:** Both web app and MCP server confirmed working end-to-end in production

---

## What changed

Two things happened in parallel today: a deliberate architectural refactor of how BullMQ queues are owned, and an unplanned bug hunt that exposed a subtle incompatibility between the OpenAI SDK and Node.js's native fetch on Railway.

---

## Queue architecture — each app owns its workers

### The problem with the original setup

The original deployment had one Railway service running both the API server and the BullMQ worker as background processes in the same container. This was wrong in a few ways:

- If the API crashed, the worker died with it (and vice versa)
- The MCP server was also connecting to the same Redis queues — meaning both the API and the MCP were enqueuing jobs, but a single shared worker was consuming all of them regardless of which app produced them
- The `apps/worker` package consumed queues for both the web pipeline (`transcription`, `chronicle`) and the MCP pipeline (`pipeline`). Neither app owned its own queue processing

### What we built instead

Each app now runs its own workers in-process and owns its queue namespace via a Redis key prefix:

```
epicChronicler-web   = API HTTP server + transcription worker + chronicle worker
                       All keys prefixed: web:transcription, web:chronicle

epicChronicler-mcp   = MCP HTTP server + pipeline worker
                       All keys prefixed: mcp:pipeline
```

The shared `apps/worker` package was deleted. No new Railway services were created — just a reallocation of what each existing service is responsible for.

### Why prefix isolation matters

Both apps connect to the same Redis instance. Without prefixes, a queue named `transcription` is shared between all consumers — there's nothing stopping the MCP's worker from accidentally consuming a job enqueued by the web app. Prefixes enforce ownership at the Redis key level. You can see exactly who owns what by looking at the key names:

```
web:transcription:*   → only epicChronicler-web touches these
mcp:pipeline:*        → only epicChronicler-mcp touches these
```

### The tradeoff

In-process workers mean a crash in the worker affects the HTTP server and vice versa. Separate processes (or separate services) give better isolation. The decision to keep them in-process was driven by the constraint of not adding Railway services — and at current scale, the simplicity is worth the tradeoff.

BullMQ workers are async and IO-bound (calling Groq, OpenRouter). They don't block Node's event loop, so running them alongside the HTTP server is safe in practice.

---

## Production bug 1 — stale lockfile blocking deploys silently

After deleting `apps/worker`, the `pnpm-lock.yaml` still referenced it as a workspace package. Docker builds ran `pnpm install --frozen-lockfile`, which couldn't reconcile the lockfile with the missing directory. The build either failed silently or Railway continued serving the previous deployment.

**Symptom:** code changes were pushed but production behaviour didn't change.

**Fix:** run `pnpm install` locally after deleting any workspace package to let pnpm update the lockfile, then commit the result alongside the deletion.

**Lesson:** a deleted package directory is not enough — the lockfile is authoritative for Docker builds. If you delete a workspace package and don't update the lockfile, your CI/CD will silently deploy old code.

---

## Production bug 2 — node-fetch gzip failure on Railway

This one took longer to find.

### The error

```
FetchError: Invalid response body while trying to fetch
https://api.groq.com/openai/v1/audio/transcriptions: Premature close
  at Gunzip.<anonymous> (node_modules/node-fetch@2.7.0/lib/index.js:400:12)
```

The transcription pipeline worked perfectly locally but failed consistently on Railway in under a second. Same code. Same audio file. Same API key.

### The root cause

The OpenAI SDK (used for Groq, OpenRouter LLM, and OpenRouter TTS) defaults to `node-fetch@2` when running in Node.js. This is hardcoded in the SDK's Node runtime shim — it doesn't auto-detect native fetch even on Node 22.

On Railway, `node-fetch@2`'s gzip decompression fails when the HTTP response goes through Railway's network infrastructure. The `Gunzip` stream receives a truncated or modified response and throws `ERR_STREAM_PREMATURE_CLOSE`. This does not happen on macOS — the local network path to Groq and OpenRouter handles gzip correctly with node-fetch.

### Why the fix introduced a second error

Passing Node 22's native `fetch` to the OpenAI SDK constructor bypasses node-fetch:

```typescript
this.client = new OpenAI({ fetch: fetch })
```

This fixed the gzip error but surfaced a different one:

```
TypeError: RequestInit: duplex option is required when sending a body.
  at node:internal/deps/undici/undici:15141:13
```

Node.js's built-in fetch (undici) enforces the WHATWG streams spec strictly. Requests with a body — like a multipart audio file upload to Groq — require `duplex: 'half'` in the RequestInit options. The OpenAI SDK was written against node-fetch which has no such requirement, so it never sets this option.

### The fix

A thin wrapper that adds `duplex: 'half'` when a request body is present, then delegates to native fetch:

```typescript
fetch: ((url: string, init?: RequestInit) =>
  fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
```

The `as unknown as ...` cast exists because `@types/node-fetch` (a type dependency of the OpenAI SDK) defines `Response` with extra properties that the standard WHATWG `Response` doesn't have. TypeScript sees a structural mismatch. The double cast tells it to trust us — at runtime, the types are compatible.

This wrapper was applied to all three OpenAI SDK clients in `packages/core`: Groq (transcription), OpenRouter LLM, and OpenRouter TTS.

### What this exposed about the SDK

The OpenAI SDK's comment in its shims README says it uses node-fetch "because fetch is still experimental in Node." That was true in Node 16. Node 22 has had stable fetch for two major versions. The SDK hasn't caught up. This is a known open issue — the correct long-term fix is on the SDK side, not ours.

---

## End-to-end confirmation

After these fixes, both pipelines ran successfully in production:

**Web app:** upload audio → `web:transcription` → Groq Whisper → `web:chronicle` → OpenRouter LLM + TTS → MP3 served from R2 ✅

**MCP server:** `create_audio_upload` → presigned R2 PUT → `process_audio` → `mcp:pipeline` → Groq + LLM + TTS → presigned R2 GET URL ✅

---

## LinkedIn angle

Three separate bugs, three separate layers: architecture, deployment tooling, and an SDK incompatibility that only surfaces on a specific hosting provider's network. None of them were visible in local testing.

The architecture one was deliberate. The lockfile one was an operator error with a clear fix. The node-fetch one required reading stack traces, checking SDK source code, checking Railway-specific HTTP behaviour, and working through two layers of incompatibility before landing on a solution that actually holds.

That's a realistic picture of what production debugging looks like.
