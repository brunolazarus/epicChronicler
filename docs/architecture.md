# Chronicler — Service Architecture

## Monorepo Layout

Current workspace members, the build/task graph, and the infrastructure each app talks to. Dashed nodes and edges are projected — not built yet. Rationale for Turborepo is in `docs/SDD.md` §7.3.

```mermaid
flowchart TB
    subgraph apps[" "]
        direction LR
        API["API"]
        MCP["MCP Server"]
        MOBILE["Mobile\n(planned)"]
    end

    subgraph shared["Shared in one Turborepo workspace"]
        direction LR
        TYPES["Shared Types\n& Business Logic"]
        CONFIG["Shared Config\nTypeScript · Lint · Build"]
    end

    SUPABASE["Supabase\nAuth + Postgres\n(planned)"]

    API --> TYPES & CONFIG
    MCP --> TYPES & CONFIG
    MOBILE -.-> TYPES & CONFIG
    API -.->|"planned"| SUPABASE
    MOBILE -.->|"planned — direct auth"| SUPABASE

    classDef projected stroke-dasharray: 5 5
    class MOBILE,SUPABASE projected
```

**Note:** the Docker deploy path (`Dockerfile.api`, `Dockerfile.mcp`) bypasses `turbo build` and calls `pnpm --filter @chronicler/core build` directly — see SDD §7.3 for why.

---

## MCP Server (deployed)

Each AI client calls `create_audio_upload` to get a presigned R2 URL, uploads the audio file directly to R2, then calls `process_audio` to enqueue the job. The pipeline worker runs in-process alongside the HTTP server.

```mermaid
flowchart LR
    subgraph clients["AI Clients"]
        CD["Claude Desktop"]
        CU["Cursor"]
    end

    subgraph railway_mcp["Railway — chronicler-mcp"]
        SRV["HTTP Server\n/mcp  :3000"]
        WK["Pipeline Worker\nin-process\nmcp:pipeline:*"]
    end

    subgraph cf["Cloudflare R2"]
        R2["audio uploads\ntts results"]
    end

    subgraph rd["Redis"]
        RD["mcp:pipeline:*"]
    end

    subgraph groq_box["Groq"]
        WH["whisper-large-v3-turbo\ntranscription"]
    end

    subgraph or_box["OpenRouter"]
        LLM["── LLM ──────────────────\nclaude-sonnet-4-5  ★\nclaude-3-5-haiku\ngemini-2-5-flash\ngemini-2-5-flash-lite\ngpt-4o-mini"]
        TTS["── TTS ──────────────────\nkokoro-82m  ★\ngpt-audio-mini\ngpt-audio"]
    end

    CD & CU -->|"HTTP + Bearer"| SRV
    SRV -.->|"presigned PUT URL"| CD & CU
    CD & CU -->|"PUT audio direct"| R2
    SRV -->|"enqueue job"| RD
    WK -->|"subscribe"| RD
    WK -->|"download / upload tts"| R2
    WK -->|"transcribe"| WH
    WK -->|"chronicle"| LLM
    WK -->|"narrate"| TTS
```

**★ = current default model**

Audio never passes through the HTTP server — the client writes directly to R2 via the presigned URL, keeping the server stateless and the upload fast.

---

## Web App (deployed)

The API server and both BullMQ workers run in the same Railway service. There is no separate worker deployment.

```mermaid
flowchart LR
    subgraph browser["Browser"]
        APP["Web Test Rig\n:3000"]
    end

    subgraph railway_api["Railway — epicChronicler-web"]
        API["Hono API Server"]
        TWK["Transcription Worker\nweb:transcription:*"]
        CWK["Chronicle Worker\nweb:chronicle:*"]
    end

    subgraph cf["Cloudflare R2"]
        R2["audio uploads\ntts results"]
    end

    subgraph rd["Redis"]
        RD["web:transcription:*\nweb:chronicle:*"]
    end

    subgraph groq_box["Groq"]
        WH["whisper-large-v3-turbo\ntranscription"]
    end

    subgraph or_box["OpenRouter"]
        LLM["LLM  —  chronicle generation"]
        TTS["TTS  —  narration"]
    end

    APP -->|"upload recording"| API
    API -->|"store audio"| R2
    API -->|"enqueue"| RD
    TWK -->|"subscribe"| RD
    TWK -->|"download / delete raw"| R2
    TWK -->|"transcribe"| WH
    TWK -->|"enqueue chronicle"| RD
    CWK -->|"subscribe"| RD
    CWK -->|"chronicle"| LLM
    CWK -->|"narrate"| TTS
    CWK -->|"upload tts"| R2
```

---

## Queue isolation

Both Railway services share the same Redis instance. Redis key prefixes enforce ownership so workers from one service never consume jobs enqueued by the other.

| Redis key pattern | Owner |
|---|---|
| `mcp:pipeline:*` | chronicler-mcp — pipeline worker |
| `web:transcription:*` | epicChronicler-web — transcription worker |
| `web:chronicle:*` | epicChronicler-web — chronicle worker |

---

## Model registry

Both LLM and TTS models are managed as named registries in `packages/core`. Switching the active model is a one-line change — no tool logic to touch.

| Registry | File |
|---|---|
| LLM | `packages/core/src/llm/openrouter-models.ts` |
| TTS | `packages/core/src/tts/openrouter-models.ts` |
