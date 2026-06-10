FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate

# ── deps: install all workspace dependencies ──────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/mcp/package.json ./apps/mcp/
COPY scripts/package.json ./scripts/
RUN pnpm install --frozen-lockfile

# ── build: compile @chronicler/core so the mcp app can import it ──────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/apps/mcp/node_modules ./apps/mcp/node_modules
COPY . .
RUN pnpm --filter @chronicler/core build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy workspace manifest so pnpm resolves the internal package graph
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy built core package (dist + manifest)
COPY --from=build /app/packages/core ./packages/core

# Copy mcp app source and its installed node_modules
COPY --from=build /app/apps/mcp ./apps/mcp

# Copy root node_modules (contains shared hoisted deps)
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "--filter", "chronicler-mcp", "exec", "tsx", "src/index.ts"]
