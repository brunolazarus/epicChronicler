# Deploying the Chronicler MCP Server to Railway

## Prerequisites

- A [Railway](https://railway.app) account
- This GitHub repository connected to your Railway project
- The HTTP transport branch merged (the current `src/index.ts` uses stdio; Railway deployment requires the HTTP transport version)

---

## 1. Create a Railway Service

1. In the Railway dashboard, click **New Project** → **Deploy from GitHub repo**.
2. Select this repository (`epicChronicler`).
3. Railway will auto-detect the `Dockerfile` at the repo root and use it as the build context.

---

## 2. Set Environment Variables

In the Railway service settings under **Variables**, add the following:

| Variable | Value |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GROQ_API_KEY` | Your Groq API key |
| `MCP_API_KEY` | A secret string you choose — clients must send this as a Bearer token |
| `PORT` | `3000` |

> Railway injects `PORT` automatically, but setting it explicitly to `3000` keeps it consistent with the Dockerfile `EXPOSE` directive.

---

## 3. Deploy

Push to the branch Railway is tracking (typically `main`). Railway will:

1. Build the Docker image from the repo root using `Dockerfile`.
2. Install all pnpm workspace dependencies.
3. Build `@chronicler/core`.
4. Start the server with `pnpm --filter mcp exec tsx src/index.ts`.

The health check polls `GET /` and expects an HTTP 200 response. The HTTP transport layer exposes this route on `PORT=3000`.

---

## 4. Get Your Railway URL

Once the deployment is healthy, Railway assigns a public URL in the format:

```
https://<project-name>.up.railway.app
```

You can find it in **Settings → Networking → Public URL** for the service.

---

## 5. Add to Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "chronicler": {
      "transport": "http",
      "url": "https://<project-name>.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

Replace `<project-name>` with your Railway project slug and `<MCP_API_KEY>` with the value you set in Railway.

Restart Claude Desktop after saving.

---

## 6. Add to Cursor

Open Cursor settings (**Cmd+,**) and navigate to **Features → MCP Servers**, then add:

```json
{
  "chronicler": {
    "transport": "http",
    "url": "https://<project-name>.up.railway.app/mcp",
    "headers": {
      "Authorization": "Bearer <MCP_API_KEY>"
    }
  }
}
```

Alternatively, add the entry to `.cursor/mcp.json` in your project root (for project-scoped access):

```json
{
  "mcpServers": {
    "chronicler": {
      "transport": "http",
      "url": "https://<project-name>.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

---

## Troubleshooting

- **Build fails on `pnpm install --frozen-lockfile`** — make sure `pnpm-lock.yaml` is committed and up to date locally before pushing.
- **Health check fails** — confirm the HTTP transport is active and listening on `PORT`. The `GET /` route must return 200.
- **Tool calls return auth errors** — verify `MCP_API_KEY` matches the Bearer token configured in your client.
