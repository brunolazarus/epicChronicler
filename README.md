# Chronicler

A mobile app for friend groups to record, preserve, and relive shared memories through AI-narrated stories.

Members record short voice stories about a shared event. AI transcribes them, merges multiple perspectives, and retells the story in a chosen **flavour** — a medieval chronicler, a sports commentator, a nature documentary narrator, or an epic fantasy bard. A TTS voice reads the result back as audio.

Built in public. Every architectural decision is documented as it's made.

---

## How it works

```
voice recording → transcription → LLM rewrite → TTS narration
     (Groq)           (Claude)        (Kokoro)
```

1. A group member uploads a voice recording tied to an event
2. Groq transcribes it via Whisper (free tier)
3. Claude rewrites the transcript in the chosen flavour via OpenRouter
4. Kokoro 82M narrates the result as audio via OpenRouter
5. The chronicle is stored and playable by all group members

Multiple members can record their version of the same event — their transcripts are merged into a single chronicle.

---

## MCP Server

Chronicler exposes its AI pipeline as a **Model Context Protocol (MCP) server**, so AI assistants like Claude Desktop or Cursor can transcribe voice recordings and generate chronicles directly from a conversation.

### Claude CLI (hosted)

```bash
claude mcp add --transport http chronicler "https://epicchronicler-production.up.railway.app/mcp" \
  --header "Authorization: Bearer <mcp-api-key>"
```

### Claude Desktop (hosted)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chronicler": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<your-railway-url>/mcp"],
      "env": {
        "MCP_REMOTE_HEADER_Authorization": "Bearer <your-mcp-api-key>"
      }
    }
  }
}
```

### Manual setup — Cursor

Add to `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "chronicler": {
      "url": "https://<your-railway-url>/mcp",
      "headers": {
        "Authorization": "Bearer <your-mcp-api-key>"
      }
    }
  }
}
```

### Available tools

| Tool | What it does |
|---|---|
| `create_audio_upload` | Returns a presigned R2 upload URL and a `fileId`. PUT your audio file directly to that URL. |
| `process_audio` | Enqueues an uploaded file for full pipeline processing (transcribe → chronicle → TTS). Returns a `jobId`. |
| `get_audio_job` | Polls a job. Returns `chronicle` text + `audio_base64` MP3 when complete. |
| `generate_chronicle` | Rewrites existing text transcripts into a narrated chronicle + MP3. No audio upload needed. |

**Audio processing flow:**

```
# 1. Get a secure upload slot
create_audio_upload(filename: "recording.mp3", flavour: "medieval")
→ { uploadUrl, fileId }

# 2. Upload your file directly to R2 (audio never passes through the server)
curl -X PUT -T recording.mp3 -H "Content-Type: audio/mpeg" "$uploadUrl"

# 3. Kick off the pipeline
process_audio(file_id: "<fileId>", flavour: "medieval")
→ { jobId }

# 4. Poll until done
get_audio_job(job_id: "<jobId>")
→ { status: "completed", result: { chronicle, audio_base64 } }
```

The `flavour` parameter accepts `medieval`, `sports`, `nature`, or `fantasy`.

### Self-hosting on Railway

The MCP server is deployable to Railway with a single click:

1. Fork this repo and connect it to a new Railway project
2. Set the following environment variables in the Railway dashboard:

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | LLM + TTS via OpenRouter |
| `GROQ_API_KEY` | Yes | Transcription via Groq Whisper |
| `MCP_API_KEY` | Yes | Bearer token protecting the `/mcp` endpoint |
| `REDIS_URL` | For upload flow | BullMQ job queue (required by `process_audio` / `get_audio_job`) |
| `R2_ACCOUNT_ID` | For upload flow | Cloudflare R2 account ID (required by `create_audio_upload`) |
| `R2_ACCESS_KEY_ID` | For upload flow | R2 access key |
| `R2_SECRET_ACCESS_KEY` | For upload flow | R2 secret key |
| `R2_BUCKET_NAME` | For upload flow | R2 bucket name |
| `PORT` | No | Defaults to `3000` |

3. Railway builds from the `Dockerfile` at the repo root and deploys the MCP server on port 3000
4. The health check endpoint is `GET /` — Railway uses this to confirm the service is up

---

## Status

| Phase | Description | Status |
|---|---|---|
| Phase 0 | AI pipeline spike — validate transcription → LLM → TTS end to end | ✅ Complete |
| Phase 0.5 | MCP server — expose pipeline as tools for AI assistants | ✅ Complete |
| Phase 1 | Full backend — auth, groups, events, recordings, chronicles API | 🔄 Next |
| Phase 2 | Mobile foundation — Expo app with auth and navigation | Planned |
| Phase 3 | Recording loop — native audio capture and upload | Planned |
| Phase 4 | Chronicle experience — full end-to-end on device | Planned |
| Phase 5 | Polish and App Store submission | Planned |

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo) |
| Backend | Hono + TypeScript (Node.js) |
| Database + Auth | Supabase (PostgreSQL) |
| File storage | Cloudflare R2 |
| Job queue | Redis + BullMQ |
| Transcription | Groq (Whisper large v3 turbo) |
| LLM | Claude Sonnet via OpenRouter |
| TTS | Kokoro 82M via OpenRouter |
| MCP server | `@modelcontextprotocol/sdk` — stdio + HTTP transport |
| Deployment | Railway (Docker) |

Each AI provider sits behind an interface — swapping implementations is a one-line change. TTS and LLM models are managed via a registry in `packages/core` so alternatives can be evaluated without touching tool logic.

---

## Running locally

**Requirements:** Node.js 20+, pnpm, Docker (for Redis)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start Redis
docker compose up redis -d

# 4. Start the API server and workers
pnpm dev:all
```

Open `http://localhost:3000` for the Phase 0 test rig — upload an audio file and run the full pipeline in the browser.

To run the MCP server locally:

```bash
pnpm mcp
```

**Required environment variables:**

| Variable | What it's for |
|---|---|
| `OPENROUTER_API_KEY` | LLM (Claude) + TTS (Kokoro) |
| `GROQ_API_KEY` | Transcription via Whisper |
| `R2_ACCOUNT_ID` | Cloudflare R2 storage (API + worker only) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 storage (API + worker only) |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 storage (API + worker only) |
| `R2_BUCKET_NAME` | Cloudflare R2 storage (API + worker only) |

API documentation is available at `http://localhost:3000/doc` (Scalar UI, auto-generated from route schemas).

---

## Project structure

```
apps/
├── api/          # Hono REST API — routes, queues, Phase 0 test rig
├── worker/       # BullMQ job processors — transcription and chronicle jobs
└── mcp/          # MCP server — exposes pipeline as tools over stdio and HTTP

packages/
└── core/         # Shared library — env validation, AI providers, R2, Redis, flavours
    └── src/
        ├── environment.ts        # Zod env schema — crashes clearly if anything is missing
        ├── r2.ts                 # Cloudflare R2 upload / download / delete
        ├── redis.ts              # ioredis connection shared by queues and workers
        ├── transcription/        # TranscriptionProvider interface + Groq implementation
        ├── llm/                  # LLMProvider interface + OpenRouter implementation
        │   └── openrouter-models.ts  # LLM model registry (5 models, swappable)
        └── tts/                  # TTSProvider interface + OpenRouter/Kokoro implementation
            └── openrouter-models.ts  # TTS model registry (3 models, swappable)

scripts/          # Dev utilities — benchmarking, one-off tools
```

---

## Design decisions

Full reasoning behind every architectural choice is in [`docs/SDD.md`](docs/SDD.md). Key decisions:

- **Flavour is per-event, not per-group** — different events have different tones
- **Raw audio is deleted after transcription** — voice data under GDPR/CCPA is a liability; the transcript is what matters
- **AI jobs run in a queue, not inline** — transcription + LLM + TTS takes 5–20s; BullMQ keeps the HTTP layer fast and adds retry logic
- **Provider abstraction layer** — each AI capability has an interface; concrete providers are swappable without touching the rest of the codebase
- **Model registries in `packages/core`** — TTS and LLM models are named entries in a registry; switching providers or models is a one-line change, no tool logic to touch
- **R2 is optional in env** — the MCP server doesn't use storage, so R2 credentials are not required for it to start
- **MCP runs both transports** — stdio for local clients (Claude Desktop direct), HTTP for remote clients (Railway)

---

## Build log

Development is documented as a public series: [`docs/devlog/DEVLOG.md`](docs/devlog/DEVLOG.md)
