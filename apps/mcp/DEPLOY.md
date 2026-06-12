# Deploying the Chronicler MCP Server to Railway

## Prerequisites

- A [Railway](https://railway.app) account
- This GitHub repository connected to your Railway project

---

## 1. Create a Railway Service

1. In the Railway dashboard, click **New Project** → **Deploy from GitHub repo**
2. Select this repository (`epicChronicler`)
3. Railway will auto-detect the `Dockerfile` at the repo root

---

## 2. Set Environment Variables

In the Railway service settings under **Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | LLM + TTS via OpenRouter |
| `GROQ_API_KEY` | Yes | Transcription via Groq Whisper |
| `MCP_API_KEY` | Yes | Bearer token protecting the `/mcp` endpoint |
| `PORT` | No | Railway injects this automatically |

---

## 3. Deploy

Push to `main`. Railway builds from the `Dockerfile` at the repo root.

The health check polls `GET /` — it must return HTTP 200. Once healthy, Railway assigns a public URL.

---

## 4. Connect clients

**Claude CLI:**
```bash
claude mcp add --transport http chronicler "https://<railway-url>" \
  --header "Authorization: Bearer <MCP_API_KEY>"
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "chronicler": {
      "transport": "http",
      "url": "https://<railway-url>",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "chronicler": {
      "url": "https://<railway-url>",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

---

## Troubleshooting

- **Health check fails** — confirm `PORT` is set and the HTTP server is listening on it
- **401 on tool calls** — verify `MCP_API_KEY` matches the Bearer token in your client config
- **Build fails** — ensure `pnpm-lock.yaml` is committed and up to date
