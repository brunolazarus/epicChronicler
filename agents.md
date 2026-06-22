# agents.md — When and how to use subagents in this project

This file guides decisions about spawning subagents (via the Agent tool) vs. doing work inline. The wrong call is expensive — subagents start cold, re-derive context, and cost extra. The right call is also expensive in the other direction: clogging the main context with large grep results or multi-file exploration is slow and noisy.

---

## Default: do it inline

Most tasks in this codebase should be done inline. The repo is small and well-organized. A `grep` or `find` from the Bash tool is faster than spawning an Explore agent for any targeted lookup.

Only spawn a subagent when the task matches one of the patterns below.

---

## When to spawn — and which type

### `Explore` agent — codebase search

Use when you need to find something but don't know exactly where it lives, and the search would require 3+ grep attempts or recursive directory scanning.

**Good candidates:**
- "Where is the flavour system prompt defined?"
- "Which files reference `QueuePrefix.MCP`?"
- "Find all places we instantiate `new OpenAI`"

**Bad candidates (do inline instead):**
- Reading a file you already know the path to → use `Read`
- A single targeted grep → use `Bash`
- Cross-file consistency analysis → do it inline; Explore reads excerpts and misses content past its window

**How to brief it:** Give the exact symbol, pattern, or file type to search for. Specify breadth: `"quick"` (one targeted lookup), `"medium"` (moderate exploration), `"very thorough"` (multiple locations and naming conventions).

---

### `Plan` agent — architecture decisions

Use before starting a non-trivial implementation that touches multiple files or introduces a new pattern. Return with a step-by-step plan, identify the critical files, and surface tradeoffs before writing code.

**Good candidates:**
- Adding a new BullMQ queue and worker pair
- Introducing a new AI provider (new transcription, LLM, or TTS impl)
- Changing the queue prefix scheme or job data types

**Not for:** bug fixes, single-file changes, renaming, documentation updates.

**How to brief it:** Include the constraint ("no new Railway services"), the current pattern to match (e.g., "follow the same factory function pattern as `createTranscriptionWorker`"), and what the plan should produce (files to create/modify, with purpose).

---

### `claude` (general purpose) — parallel independent tasks

Use when two or more independent research or read tasks can run at the same time and neither depends on the other's output.

**Good candidates:**
- Reading the current state of two separate files to compare them before merging
- Checking Railway docs and the SDK docs simultaneously

**Not for:** tasks that depend on each other's results — run those sequentially.

---

## What subagents don't know

Every subagent starts cold. They have no memory of this conversation, this project's constraints, or the decisions made in previous sessions. When spawning, always include:

1. **The relevant constraint** — "no new Railway services", "workers must be in-process", "we use `as const` not enums"
2. **The file structure context** — which files are involved, which package (`apps/api`, `apps/mcp`, `packages/core`)
3. **The current pattern to match** — don't describe what to build from scratch; point to the existing pattern (e.g., "match the structure of `apps/api/src/workers/transcription.ts`")
4. **Whether to write code or just research** — state this explicitly; an agent that wasn't told to write code will only report findings

---

## Prompt template for subagents in this project

```
Context: epicChronicler is a TypeScript ESM monorepo (pnpm workspaces).
- apps/api — Hono REST API, runs transcription + chronicle BullMQ workers in-process (prefix: web:)
- apps/mcp — MCP server, runs pipeline BullMQ worker in-process (prefix: mcp:)
- packages/core — shared library: env, r2, redis, queue names, AI providers

Constraint: [state the relevant constraint]

Task: [what to find / what to build]

Pattern to follow: [file path of the existing pattern to match]

Output expected: [code changes to specific files / research findings only]
```

---

## When NOT to spawn

- You already know the file path → use `Read`
- You need one grep → use `Bash`
- The task is a single file edit → do it inline
- The user just asked a question → answer it inline
- The work is in progress and the agent would need to re-derive what you already know → don't duplicate

Subagents protect the main context from noise, but they're not free. Use them deliberately.
