# Chronicler — Service Architecture

## MCP Server (deployed)

```mermaid
flowchart LR
    subgraph clients["AI Clients"]
        CD["Claude Desktop"]
        CU["Cursor"]
    end

    subgraph railway_box["Railway"]
        MCP["chronicler-mcp\n:3000  /mcp"]
    end

    subgraph groq_box["Groq"]
        WH["whisper-large-v3-turbo\ntranscription"]
    end

    subgraph or_box["OpenRouter"]
        LLM["── LLM ──────────────────\nclaude-sonnet-4-5  ★\nclaude-3-5-haiku\ngemini-2-5-flash\ngemini-2-5-flash-lite\ngpt-4o-mini"]
        TTS["── TTS ──────────────────\nkokoro-82m  ★\ngpt-audio-mini\ngpt-audio"]
    end

    CD -->|"HTTP + Bearer"| MCP
    CU -->|"HTTP + Bearer"| MCP

    MCP -->|"transcribe_voice"| WH
    MCP -->|"generate_chronicle"| LLM
    MCP -->|"voice_narration"| TTS
```

**★ = current default model**

---

## Backend pipeline (Phase 1 — in progress)

```mermaid
flowchart LR
    subgraph mobile["Mobile"]
        APP["Expo App"]
    end

    subgraph backend["Backend (Railway)"]
        API["API\n(Hono)"]
        RD["Redis"]
        WK["Worker\n(BullMQ)"]
    end

    subgraph storage["Cloudflare"]
        R2["R2\nchronicler-dev"]
    end

    subgraph groq_box["Groq"]
        WH["whisper-large-v3-turbo\ntranscription"]
    end

    subgraph or_box["OpenRouter"]
        LLM["LLM  —  chronicle generation"]
        TTS["TTS  —  narration"]
    end

    APP -->|"upload recording"| API
    API -->|"enqueue job"| RD
    RD -->|"process job"| WK
    API & WK -->|"store / retrieve"| R2
    WK -->|"transcribe"| WH
    WK -->|"generate"| LLM
    WK -->|"narrate"| TTS
```

---

## Model registry

Both LLM and TTS models are managed as named registries in `packages/core`. Switching the active model is a one-line change — no tool logic to touch.

| Registry | File |
|---|---|
| LLM | `packages/core/src/llm/openrouter-models.ts` |
| TTS | `packages/core/src/tts/openrouter-models.ts` |
