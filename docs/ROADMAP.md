# Chronicler — Roadmap & LinkedIn Build-in-Public Series

This file tracks the development journey of Chronicler as a public narrative for LinkedIn.
Each entry maps to one or more posts. The goal is to tell the engineering story behind the product —
decisions made, things learned, things that failed — in a way that's interesting to both
technical and non-technical audiences.

> **Strategy:** Posts that perform best on LinkedIn show *decision-making under uncertainty*, not just
> what was built. Every post should answer: what was the tradeoff, and why did I pick this side?

> **Numbering note:** Posts are numbered by what actually got published, not by a fixed one-post-per-phase
> plan. In practice, published posts have absorbed more ground than originally planned — Post 1 combined
> three planned topics (idea, SDD, tech stack) and Post 2 combined two (the web demo spike and the MCP
> pivot). The list below reflects that reality; it gets renumbered as posts ship, not reserved in advance.

> **Reconciliation note (2026-09-10):** Posts 8–14 below (originally numbered 5–11) describe the
> pre-pivot mobile/Expo/Supabase roadmap, written before the 2026-07-28 direction change to a
> single-user, web-only MVP (see `docs/PRD.md` §2 and Changelog). They're **superseded**, not current —
> left in place as a record, not a plan to execute. The actual mobile app is now an optional branch in
> `docs/HORIZONS.md`, not an assumed next phase. What's actually next — for the project and for future
> posts — lives in `docs/HORIZONS.md`, a non-linear menu rather than a fixed sequence.

---

## Series Overview

| Post | Phase(s) covered | Theme | Status |
|---|---|---|---|
| 1 | Pre-build | Idea + SDD + tech stack — published as one combined post | **Published** → [2026-06-03-kickoff.md](linkedin/2026-06-03-kickoff.md) |
| 2 | Phase 0 → 1 | Skipping the backend: web demo spike + MCP server pivot, published as one combined post | **Published** → [2026-06-09-mcp.md](linkedin/2026-06-09-mcp.md), [2026-06-22-mcp-linkedin-post.md](linkedin/2026-06-22-mcp-linkedin-post.md) |
| 3 | Phase 0 → 1 | What the AI pipeline actually costs, and where it broke in production | **Structured, pending data** |
| 4 | Phase 1 | Testing an AI pipeline — mocks, fixtures, and what not to test | **Decision log** → [2026-06-15-testing.md](linkedin/2026-06-15-testing.md) |
| 5 | Web rebuild | A frontend architecture standard, applied fresh — the `@theme` / `@theme inline` gotcha, promotion-not-preemption, generate-the-contract | **Draft** → [2026-09-10-frontend-standard-linkedin-post.md](linkedin/2026-09-10-frontend-standard-linkedin-post.md) |
| 6 | Web rebuild → motion rebuild | Solo, design-to-ship: a different AI tool at each handoff (Claude Design → spec → subagent-reviewed execution) | **Draft** → [2026-09-10-claude-design-linkedin-post.md](linkedin/2026-09-10-claude-design-linkedin-post.md) |
| 7 | Post-MVP | Tooling experiments on a "normal" workflow — Open Design, OpenCode, Pi harness, Xiaomi MiMo | **Stub** → [2026-09-10-tooling-experiments-linkedin-post.md](linkedin/2026-09-10-tooling-experiments-linkedin-post.md) |
| 8–14 | *(superseded — pre-pivot mobile roadmap, see note above)* | Production API, Supabase+BullMQ, Expo, native audio, App Store | **Superseded** |

---

## Post 1 — Idea, SDD & Tech Stack (Published)

**Phase:** Pre-build  
**Milestone:** Concept defined, SDD complete, tech stack finalised, Phase 0 kicked off  
**Published as:** [2026-06-03-kickoff.md](linkedin/2026-06-03-kickoff.md) — see that file's "As published" section for the actual posted text.

### What it covered
Originally planned as three separate posts (idea → why write an SDD first → tech stack rationale). Shipped as a single combined kickoff post instead — the three topics read better together as "day 1" than as a drip-fed series.

- The product concept and the frustration it solves
- Why an SDD got written before any code, and the three decisions it forced early (flavour per-event, owner-only deletion, raw audio retention)
- The stack and what got ruled out (Hono over FastAPI/Express, Supabase, R2, BullMQ)

### Hashtags
`#buildinpublic` `#indiedev` `#typescript` `#AI` `#hono` `#supabase` `#reactnative`

---

## Post 2 — Skipping the Backend (Published)

**Phase:** Phase 0 → Phase 1  
**Milestone:** Web demo live at epicchronicler.com; MCP server deployed on Railway  
**Published as:** [2026-06-22-mcp-linkedin-post.md](linkedin/2026-06-22-mcp-linkedin-post.md) — see that file's "As published" section for the actual posted text. Full decision background in [2026-06-09-mcp.md](linkedin/2026-06-09-mcp.md).

### What it covered
Originally planned as two separate posts (the Phase 0 web test rig, then the MCP server as its own Phase 1 story). Shipped as one post instead, framed around a single decision: skip the planned Supabase backend and get the core experience in front of real people first.

- Why a full backend (auth, groups, 22 endpoints) got postponed in favor of two surfaces anyone could try immediately
- The web demo at epicchronicler.com — no account, no setup
- The MCP server — one command in Claude or Cursor
- The Smithery distribution misstep: built OAuth against a registry that turned out to require users bring their own API keys — wrong funnel, cut it, web demo became the primary surface

### Hashtags
`#buildinpublic` `#AI` `#productengineering` `#softwareengineering` `#typescript` `#mcp` `#aiproducts`

---

## Post 3 — The Infrastructure Bet: Running Real AI in Production for (Almost) Nothing

**Phase:** Phase 0 → Phase 1  
**Theme:** The deliberate infra + free-tier choices (Groq, R2, a swappable OpenRouter registry) are why the AI side of this costs a rounding error — the real recurring cost is the $5/month Railway hosting floor, not the AI calls. Cost analysis first; the Kokoro reliability hiccup is a one-line caveat, not the plot.  
**Milestone:** Phase 0 pipeline validated; real billing data pulled from OpenRouter, Groq, and Railway dashboards (2026-07-27)  
**Recruiter angle:** this is the post that shows infrastructure judgment — deliberate frugal choices (free tiers, zero-egress storage, a provider-swap seam), backed by real numbers, not "I called an API and it worked."

### Hook
> "AI fees for this pipeline: about three-quarters of a cent per chronicle. Hosting: a flat $5 a month. The AI is not the expensive part."

### Structure

1. **The setup** — three stages, one pipeline: Whisper (transcribe) → LLM (rewrite in flavour) → TTS (narrate). Cost compounds across all three, but so does the payoff from choosing cheap, swappable providers at each stage.
2. **The infra bet** — R2 for storage (zero egress fees — matters for audio), Groq for transcription (free tier, OpenAI-compatible), OpenRouter for LLM + TTS (pay-per-use, no minimum, and every provider sits behind a model registry so swapping is a one-line change). None of this was an accident — it's the tech-stack rationale from the SDD, now with real numbers behind it.
3. **Whisper — actually free** — Groq dashboard: **$0.01 total** (projected — usage is still inside the free tier, not billed) across all `whisper-large-v3-turbo` calls to date.
4. **Narration — pennies per chronicle** — OpenRouter dashboard, real billing: Claude Sonnet 4.5 **$0.026** (85.6% of spend), Kokoro 82M **$0.00437** (14.4%). Report **per-request**, not aggregate — request volume is low enough (~4 calls each) that a raw dollar total undersells it: **~$0.0065/request** (Sonnet) and **~$0.0011/request** (Kokoro) ⇒ roughly **$0.0076/chronicle** combined. [DATA NEEDED: confirm exact request counts per model — currently an estimate from chart bar heights, not exact tooltip values.]
5. **The number that actually matters — hosting** — Railway: **$5/month flat**, covering both services (API + MCP server) and managed Redis. That flat fee already dwarfs total AI spend to date (~$0.03 across the whole test period). The honest takeaway: **the fixed hosting cost is the real bill; the marginal cost of one more chronicle is a fraction of a cent.** That ratio only gets better as usage grows, before hosting needs its own tier bump.
6. **The number that makes it pop — breakeven and scale** — this is the beat that turns a cost report into a business-judgment signal:
   - **Breakeven:** $5/month hosting ÷ $0.0076/chronicle ≈ **658 chronicles/month** before the AI itself becomes the bigger expense. Quotable line: *"I'd need to generate about 22 chronicles a day before the AI costs more than the hosting."*
   - **Scale projection** (same confirmed numbers, just projected forward — no new data needed):

     | Volume/month | AI cost | Total (+ $5 hosting) | Cost/chronicle |
     |---|---|---|---|
     | 100 | $0.76 | $5.76 | $0.058 |
     | 1,000 | $7.60 | $12.60 | $0.013 |
     | 10,000 | $76 | $81 | $0.0081 |
     | 100,000 | $760 | $765 | $0.00765 |

     The story: cost-per-chronicle *drops* as volume grows, because the fixed hosting cost amortizes away — the kind of unit-economics thinking that reads as "thinks about this like a product," not just "built a demo."
   - **Honesty caveat, keep it in:** this assumes Groq's free tier and OpenRouter's per-request pricing hold at that volume. Groq's free tier almost certainly has a rate cap that would need revisiting well before 10,000/month — say so rather than let the table imply it scales forever for free.
   - **Bonus, if there's room:** cost and latency correlate on the same stage — Sonnet is both 85% of AI spend *and* 83% of total latency. The expensive stage is the slow stage; that's the quality/cost/latency tradeoff made visible, not a coincidence.
7. **The one caveat worth admitting** — chasing the cheapest TTS option is exactly how you end up on a single-provider host with no failover: Kokoro hit a `tts_ms: 205,589` then an immediate `429` during first live testing (2026-06-09). A fresh run today came back in 1,707ms — not reproducing, but not fixed either, just not currently under whatever load triggered it. In the search for the lowest price, this is the kind of thing that can happen. ElevenLabs is evaluated as the fix but not yet tested (still backlog, as of 2026-07-27). One line, not a postmortem.
8. **The fix that's actually in place today** — not a provider swap (that's still deferred — code is unchanged, still OpenRouter/Kokoro + OpenRouter/Sonnet as of this writing). The real fix shipped was the **model registry abstraction**: swapping TTS or LLM providers is a one-line change in `packages/core`, decoupled from the rest of the app. That's what makes chasing cheap prices a reversible bet instead of a lock-in.
9. **Two flows, one pipeline** — the same three stages get reached two different ways, and comparing them makes the architecture visible instead of just described:

   **Web demo** — audio goes *through* the server:
   ```
   Browser records/uploads
     → POST /upload (multipart body, hits the API server directly)
     → server itself writes the buffer to R2
     → enqueue transcription job → Whisper worker
     → enqueue chronicle job → LLM + TTS worker
     → GET /jobs/:id (poll)
     → chronicle text + audio
   ```

   **MCP server** — audio never touches the server, but needs one extra round-trip first:
   ```
   create_audio_upload(filename, flavour)
     → presigned R2 PUT URL + fileId
     → client PUTs the audio bytes straight to R2 (server never sees them)
     → process_audio(file_id, flavour)
     → enqueue pipeline job → Whisper → LLM → TTS (in-process worker)
     → get_audio_job(job_id) (poll)
     → chronicle text + presigned audio_url
   ```

   The nuance worth stating plainly: MCP needs that extra `create_audio_upload` step because an AI assistant has no multipart form the way a browser does — the tool has to hand back a place to put the bytes before there's anything to process. The web app skips that step by routing the raw file through the server, which is simpler for a browser but is the one place the codebase doesn't practice the SDD's own "audio never touches the server" principle — that design decision only actually holds for the MCP path. Worth saying out loud rather than glossing over; it's a real, small inconsistency, not a flaw that needs defending.

   Land the post with something interactive: a recruiter with Claude Desktop can call `create_audio_upload` → `process_audio` → `get_audio_job` themselves, not just read about it.

### Visuals (screenshots provided, pending export to repo)

Save all five OpenRouter/Groq dashboard screenshots to `docs/linkedin/assets/2026-07-cost-post/` so they can be attached to the post directly (LinkedIn attaches images as media, not inline markdown — this folder is just to keep the source files versioned and easy to grab at publish time):

| # | Chart | Suggested placement |
|---|---|---|
| 1 | OpenRouter — cost by model ($0.026 Sonnet / $0.00437 Kokoro, 85.6%/14.4%) | Beat 4 — the real narration cost baseline |
| 2 | OpenRouter — usage by model over time (spiky, low-volume) | Beat 4 or opening visual — shows *why* per-request beats aggregate $ here |
| 3 | OpenRouter — request volume by model | Beat 4 — backs the per-request math directly |
| 4 | Groq — `whisper-large-v3-turbo` requests + seconds over time | Beat 3 — shows real usage pattern behind the "$0.01 total" claim |
| 5 | Groq — total spend $0.01, free-tier note | Beat 3 — the receipt for "transcription is free" |
| — | Scale-projection table (beat 6) — no screenshot exists yet; consider rendering it as a simple graphic (bar chart or styled table image) since it's the "pop" moment of the post | Beat 6 |

### Data to gather before drafting (flagged for follow-up)
- [x] Groq Whisper cost — **$0.01 total, free tier** (confirmed from dashboard, not billed)
- [x] OpenRouter LLM + TTS cost — **$0.026 Sonnet / $0.00437 Kokoro** (confirmed from dashboard)
- [x] Exact request counts per model — pipeline makes **1 Sonnet + 1 Kokoro request per run**, confirmed 1:1 by design. The ~4-per-model read off the chart is presented as an approximate "~4 test runs," not a false-precision exact figure.
- [x] Confirm current production reliability of Kokoro TTS — **not reproducing today**: fresh run on 2026-07-27 came back in 1,707ms. Can't call it fixed (no code change), just not currently under whatever load triggered the June incident.
- [x] End-to-end latency on a real recent run — **15,372ms total** (`transcription_ms: 426`, `llm_ms: 12,802`, `tts_ms: 1,707`), captured live via the deployed `generate_chronicle` MCP tool on 2026-07-27
- [x] Whether the LLM/TTS provider swap decision has moved — **no**, confirmed in code (`packages/core/src/tts/index.ts`, `llm/index.ts` still OpenRouter/Kokoro + OpenRouter/Sonnet). Still just the evaluated-but-unbenchmarked options from the 2026-06-09 decision log, pending Bruno confirming whether any quality benchmarking happened outside the code.
- [x] Railway hosting cost — **$5/month flat**, covers both services + managed Redis

### Takeaway
"The AI calls cost a fraction of a cent per chronicle. The $5/month Railway bill is the real recurring cost, and it doesn't scale with usage — the marginal cost of the next chronicle is basically zero. That's not luck; it's what you get from choosing free-tier and zero-egress infrastructure deliberately, and keeping every provider swappable behind a registry so a cheap choice never becomes a locked-in one."

---

## Post 4 — Testing an AI Pipeline

**Phase:** Phase 1  
**Theme:** How do you test a pipeline you can't run for free on every commit?  
**Milestone:** Fast + integration test suites built, mocking layer in place  
**Decision log:** [2026-06-15-testing.md](linkedin/2026-06-15-testing.md) — already has a written "LinkedIn angle" section and three concrete bugs manual testing caught before automated tests existed.

### Hook
> "How do you test an AI pipeline without running the AI every time?"

### Story to develop
- Mock at the HTTP boundary, not the function boundary — your application code still runs, only the external provider call is replaced
- The two-suite split: fast (mocked, every push) vs. integration (real APIs, pre-release only)
- Three real production bugs manual testing caught first: BullMQ job ID collisions across queues, worker crash from a misplaced `.env`, missing Redis auth on Railway
- The non-determinism problem (is the AI output *good*?) is a different question — belongs in evaluation pipelines, not unit tests

---

## Post 5 — A Frontend Standard, Applied Fresh

**Phase:** Web rebuild (Tailwind v4 + shadcn migration)
**Theme:** The frontend stack wasn't chosen for this project — it's a personal standard, refined across real work, applied here from day one. Leads on the `@theme` vs `@theme inline` gotcha, widens to "promotion, not preemption" and "generate the contract, don't hand-write it."
**Draft:** [2026-09-10-frontend-standard-linkedin-post.md](linkedin/2026-09-10-frontend-standard-linkedin-post.md) — full draft, ready for review.

---

## Post 6 — Solo, Design-to-Ship, with a Different AI Tool at Each Handoff

**Phase:** Web rebuild → motion rebuild
**Theme:** How a one-person team actually works end to end with AI at every stage — a visual tool for the spatial decision (Claude Design), a spec/plan workflow for the logical one, fresh reviewed subagents for execution. Anchored on catching a real UX flaw (continuous-scroll breaks on a cyclic flow) before building it.
**Draft:** [2026-09-10-claude-design-linkedin-post.md](linkedin/2026-09-10-claude-design-linkedin-post.md) — full draft, ready for review. **Not yet safe to publish as-is** — describes work merged locally but not pushed/deployed; see the warning at the top of that file.

---

## Post 7 — Tooling Experiments on a "Normal" Workflow

**Phase:** Post-MVP
**Theme:** Shifting from the heavily-scaffolded process the project has otherwise used to a lighter, more conventional setup — trying Open Design, OpenCode, Pi harness, and Xiaomi MiMo outside that scaffolding.
**Stub:** [2026-09-10-tooling-experiments-linkedin-post.md](linkedin/2026-09-10-tooling-experiments-linkedin-post.md) — theme only, not drafted. Needs a comparison axis and a concrete task before drafting. Remember to credit Joel and Phil.

---

## Superseded — Pre-Pivot Mobile Roadmap (originally Posts 5–11)

Written before the 2026-07-28 direction change (`docs/PRD.md` §2/Changelog) that moved groups,
accounts, and the mobile app to backlog in favor of a single-user, web-only MVP. Left in place below
as a record of the original plan, not a queue to execute — Supabase was never adopted in production,
and the mobile app is now an optional branch in `docs/HORIZONS.md`, not an assumed next phase.

---

## Post 8 — Building a Production API Before the Frontend

**Phase:** Phase 2  
**Theme:** Why I built a full API before the frontend  
**Milestone:** Phase 2 backend complete

### Hook
> "I have no UI yet. I have a Postman collection with 22 endpoints. This is intentional."

### Story to develop
- The value of a clean API contract before frontend work
- How Supabase auth integrates with Hono middleware (JWT)
- BullMQ worker architecture for the AI pipeline
- The audio deletion job — why it exists, how it works
- The contributor cap enforced server-side (not just client-side)

---

## Post 9 — Supabase + BullMQ: Async AI Jobs

**Phase:** Phase 2  
**Theme:** How the job queue architecture works  
**Milestone:** BullMQ workers running in production

### Hook
> "An AI call that takes 15 seconds will break your API. Here's how I solved it with a job queue."

### Story to develop
- Why AI calls can't block HTTP requests
- What BullMQ is and how Redis backs it
- The job lifecycle: UPLOADED → TRANSCRIBING → TRANSCRIBED → chronicle generated
- How the mobile client knows when the job is done (polling vs WebSocket vs push notification)
- What happens when a job fails (retry logic, dead-letter queue)

---

## Post 10 — First Screen in Expo

**Phase:** Phase 3  
**Theme:** The gap between design and device  
**Milestone:** Expo app running on device with auth working

### Hook
> "The design looked clean. The first build on my phone looked different. Here's what changed."

### Story to develop
- Expo project setup: file-based routing, TypeScript config
- Apple Sign-In — why it's required, how painful the setup is
- Deep-link handling for group invites (the moment it actually worked on device)
- The difference between designing in Figma and running on a real device

---

## Post 11 — Native Audio Is Harder Than I Expected

**Phase:** Phase 4  
**Theme:** The challenge of audio recording on mobile  
**Milestone:** Recording loop working end-to-end on device

### Hook
> "I thought the hard part of my app was the AI. It wasn't. It was the microphone."

### Story to develop
- Expo AV setup — permissions, audio session configuration
- Waveform visualisation: how to draw a real-time waveform without destroying performance
- File format for upload (m4a vs mp3 vs webm — what Whisper prefers)
- Upload from mobile to R2 (direct upload vs through backend — the tradeoff)
- The moment the first voice recording came back as a Whisper transcript

---

## Post 12 — The Moment the AI Told the Story Back

**Phase:** Phase 5  
**Theme:** The product's core experience working end-to-end  
**Milestone:** First full chronicle generated and narrated on device

### Hook
> "I pressed generate. I waited 18 seconds. Then a medieval chronicler started reading my story back to me. That's when I knew it worked."

### Story to develop
- What the first real end-to-end test felt like
- Multi-perspective merging: two recordings, one chronicle
- Which flavour prompt worked best on first attempt, which needed tuning
- The gap between "it works in a test" and "it works on a phone"

---

## Post 13 — App Store Submission

**Phase:** Phase 6  
**Theme:** What I didn't know I didn't know about shipping to the App Store  
**Milestone:** App submitted to both stores

### Hook
> "The code was done on Tuesday. The app went live on Friday. Here's what the three days between those were."

### Story to develop
- App Store review requirements I didn't know about
- Privacy policy for voice data — what it has to say
- The difference between TestFlight and production review
- Play Store vs App Store: which was harder
- What I'd do from day 1 differently to make submission smoother

---

## Post 14 — What I'd Do Differently

**Phase:** Post-launch  
**Theme:** Honest retrospective  
**Milestone:** App live

### Hook
> "Chronicler is live. Here's what I got wrong."

### Story to develop
- The design decisions I'd reverse
- What the SDD got right and what it missed
- Whether the tech stack held up under real usage
- What the actual AI costs looked like vs the estimates
- What feature I'd build first if I started over

---

## Notes on Posting Cadence

- Post every 1–2 weeks, aligned with phase milestones
- Each post should include a concrete technical detail — a diagram, a code snippet, a cost table, a terminal screenshot
- Posts that show real numbers (cost, latency, lines of code, hours spent) perform better than posts that don't
- Vulnerability performs better than polish — "here's what I got wrong" gets more engagement than "here's what I built"
- Tag the tools you use — Supabase, Expo, Cloudflare, Anthropic often reshare developer content
- Don't reserve post numbers for planned-but-unwritten topics — number by what ships, and let combined posts absorb multiple planned topics when that reads better (see Post 1 and Post 2)
