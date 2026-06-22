# CLAUDE.md — Working contract for epicChronicler

This file is read at the start of every session. Follow it without needing to be reminded.

---

## How we work together

These rules come from real corrections made during this project. They are not suggestions.

### Understand before fixing

Diagnose before proposing. If a bug only appears in production and not locally, the first job is to explain *why* — what is different about the two environments — before writing a single line of fix. Proposing solutions before having a model of the problem is the most common failure mode here.

### Prove it or don't say it

If you recommend something you cannot back with documentation, source code, or clear reasoning, say so. "This should work" is not acceptable if the user asks for evidence. If you can't find the proof, say "I can't verify this" and offer an alternative you *can* verify.

### Verify before committing

Before staging or committing any file that affects deployment (Dockerfiles, Railway configs, start scripts, lockfiles), confirm it matches reality. Check the file. Quote the relevant line. Then commit.

### Constraints come first

When there is a stated constraint ("no new Railway services", "don't break the lockfile", "no API key in the README"), that constraint is the outer boundary. Find the solution within it — do not propose one that ignores it and hope it gets accepted.

### Be direct when action is needed

When the user asks for a command, give the command. Not an explanation of what the command does — the command. Explanation after, if asked.

### Don't over-engineer

No abstractions beyond what the task requires. Three similar lines is better than a premature helper. No error handling for scenarios that can't happen. No backwards-compatibility shims. If something is unused, delete it.

### No comments by default

Only add a comment when the *why* is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific external bug. If the comment restates what the code already says, don't write it.

---

## Commands

```bash
# Start Redis (required by both apps)
docker compose up redis -d

# Web app — API server + transcription worker + chronicle worker (port 3000)
pnpm dev:all

# MCP server — HTTP server + pipeline worker (port 3001)
pnpm dev:mcp

# Build all packages (core → api → mcp)
pnpm build

# Core package in watch mode (when iterating on packages/core)
pnpm --filter @chronicler/core dev
```

**Deployed endpoints:**
- MCP server: `https://epicchronicler-production.up.railway.app/mcp`
- Web app + landing page: `https://epicchronicler.com`
- API docs: `http://localhost:3000/doc` (Scalar UI, local only)

**Connect Claude CLI to the deployed MCP server:**
```bash
claude mcp add --transport http chronicler "https://epicchronicler-production.up.railway.app/mcp" \
  --header "Authorization: Bearer <mcp-api-key>"
```

---

## Infrastructure

All production services run on Railway within one project.

| Service | Railway name | Domain |
|---|---|---|
| MCP server | `epicChronicler-mcp` | `epicchronicler-production.up.railway.app` |
| API + landing page | `epicChronicler-web` | `epicchronicler.com` |
| Redis | managed Railway instance | internal — `redis-volume-S45M` (persistent volume) |

Redis is shared by both app services. The landing page is served from the same Hono process as the API (`epicChronicler-web`) — not a separate service.

**External providers:**
- **Cloudflare R2** — audio file storage (presigned URL upload/download, raw audio deleted post-transcription)
- **Groq** — transcription provider (active in production)
- **OpenRouter** — LLM + TTS provider (active in production)

**Domain registrar:** Hostinger — `epicchronicler.com`

Planned subdomains (not yet configured):
- `mcp.epicchronicler.com` → `epicChronicler-mcp`
- `api.epicchronicler.com` → `epicChronicler-web`

---

## Repo layout

```
epicChronicler/
├── apps/
│   ├── api/                  # Hono REST API + Phase 0 web test rig
│   │   └── src/
│   │       ├── index.ts      # Server entry: starts HTTP + transcription + chronicle workers
│   │       ├── routes/
│   │       │   └── pipeline.ts  # /upload, /jobs/:id, /generate, /audio/:key, /flavours
│   │       ├── queues/
│   │       │   └── index.ts     # BullMQ Queue instances (prefix: web:)
│   │       └── workers/
│   │           ├── transcription.ts  # Picks up web:transcription:* jobs
│   │           └── chronicle.ts      # Picks up web:chronicle:* jobs
│   │
│   └── mcp/                  # MCP server — HTTP + stdio transports
│       └── src/
│           ├── index.ts      # Server entry: HTTP mode starts pipeline worker
│           ├── tools/
│           │   ├── create-audio-upload.ts  # Returns presigned R2 PUT URL
│           │   ├── process-audio.ts        # Enqueue + poll pipeline job
│           │   └── chronicle.ts            # Text-only → chronicle + TTS (base64)
│           └── workers/
│               └── pipeline.ts  # Picks up mcp:pipeline:* jobs
│
├── packages/
│   └── core/                 # Shared library — imported by api and mcp
│       └── src/
│           ├── environment.ts       # Zod env schema — crashes clearly on missing vars
│           ├── r2.ts                # R2 upload / download / delete / presigned URLs
│           ├── redis.ts             # ioredis singleton
│           ├── queue-names.ts       # QueueName + QueuePrefix constants
│           ├── queue-types.ts       # TypeScript job data/result types
│           ├── flavours/index.ts    # The 4 flavour definitions + system prompts
│           ├── transcription/       # TranscriptionProvider interface + Groq impl
│           ├── llm/                 # LLMProvider interface + OpenRouter impl + model registry
│           └── tts/                 # TTSProvider interface + OpenRouter impl + model registry
│
├── scripts/                  # One-off dev utilities (benchmarking etc.)
├── docs/
│   ├── SDD.md                # Source of truth for product decisions
│   ├── architecture.md       # Mermaid service diagrams
│   └── devlog/               # LinkedIn build-in-public entries
│
├── docker-compose.yml        # Redis only
├── railway.web.json          # Railway config for epicChronicler-web (API)
├── railway.mcp.json          # Railway config for chronicler-mcp
├── Dockerfile                # Builds the MCP server image
├── Dockerfile.web            # Builds the API/web server image
└── CLAUDE.md                 # This file
```

---

## Queue isolation

Both apps share one Redis instance. Prefix enforces ownership.

| Redis key pattern | Owner |
|---|---|
| `mcp:pipeline:*` | chronicler-mcp |
| `web:transcription:*` | epicChronicler-web |
| `web:chronicle:*` | epicChronicler-web |

When adding a new queue or worker, always set `prefix` on both the `Queue` and `Worker` constructor. A missing prefix silently connects to the wrong namespace.

---

## Coding style

**Language:** TypeScript ESM. All imports use `.js` extensions even for `.ts` source files (Node ESM resolution requirement).

**No TypeScript enums.** Use `as const` objects:
```typescript
export const QueueName = {
  TRANSCRIPTION: 'transcription',
  PIPELINE: 'pipeline',
} as const
export type QueueName = (typeof QueueName)[keyof typeof QueueName]
```

**Factory functions, not classes for workers:**
```typescript
export function createTranscriptionWorker() {
  const worker = new Worker(...)
  worker.on('failed', ...)
  return worker
}
```

**Provider pattern for AI services.** Each capability has an interface in `types.ts` and a concrete implementation. Switching providers is a one-line change in the index file. Don't scatter provider instantiation across the codebase — it belongs in `packages/core/src/{transcription,llm,tts}/index.ts`.

**Env validation at startup.** `packages/core/src/environment.ts` uses Zod. Import `@chronicler/core` as the first line of any entry point so the process crashes immediately (with a clear error) if a required env var is missing.

**No error handling for things that can't fail.** Only validate at system boundaries: user input, external API calls, R2 operations. Internal function calls between our own modules don't need try/catch wrappers.

**Double cast for SDK type mismatches:**
```typescript
// When @types/node-fetch's Response conflicts with WHATWG Response structurally
) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch']
```
This pattern is intentional — not a smell. It exists because the OpenAI SDK's type definitions reference node-fetch types, not WHATWG types.

**Native fetch wrapper for OpenAI SDK clients** (required on Railway — node-fetch@2 gzip fails):
```typescript
fetch: ((url: string, init?: RequestInit) =>
  fetch(url, (init?.body ? { ...init, duplex: 'half' } : init) as RequestInit)
) as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>['fetch'],
```
Apply this to every `new OpenAI({...})` call in `packages/core`.

---

## Key design decisions (quick reference)

Full reasoning in `docs/SDD.md`. For quick context:

- **Flavour is per-event** — not per-group
- **Workers are in-process** — not separate Railway services; they're IO-bound and don't block the event loop
- **Audio upload goes direct to R2** — via presigned URL; never through the server
- **Raw audio deleted after transcription** — GDPR voice data risk; transcript retained indefinitely
- **Provider abstraction** — AI capabilities are behind interfaces; swap in `packages/core/{transcription,llm,tts}/index.ts`
- **Model registries** — LLM and TTS models are in named registries; switching is a one-line change

---

## Docs to update when architecture changes

When the service topology, data flow, or deployment config changes, update all of these:
1. `docs/architecture.md` — Mermaid diagrams
2. `docs/SDD.md` — Section 7 (architecture) + changelog
3. `README.md` — Project structure + design decisions + commands
