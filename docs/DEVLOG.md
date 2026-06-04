# Chronicler — Dev Log & LinkedIn Build-in-Public Series

This file tracks the development journey of Chronicler as a public narrative for LinkedIn.
Each entry maps to one or more posts. The goal is to tell the engineering story behind the product —
decisions made, things learned, things that failed — in a way that's interesting to both
technical and non-technical audiences.

> **Strategy:** Posts that perform best on LinkedIn show *decision-making under uncertainty*, not just
> what was built. Every post should answer: what was the tradeoff, and why did I pick this side?

---

## Series Overview

| Post | Phase | Theme | Status |
|---|---|---|---|
| 1 | Pre-build | The idea — what Chronicler is and why I'm building it in public | Draft |
| 2 | Pre-build | Writing an SDD before touching code | Draft |
| 3 | Pre-build | Tech stack decisions — and what I ruled out | Draft |
| 4 | Phase 0 | Why I built a throwaway web page before the app | Draft |
| 5 | Phase 0 | What the AI pipeline actually cost and how fast it ran | Draft |
| 6 | Phase 1 | Building a production API before the frontend | Draft |
| 7 | Phase 1 | Supabase, BullMQ, and the architecture of async AI jobs | Draft |
| 8 | Phase 2 | First screen in Expo — the gap between design and device | Draft |
| 9 | Phase 3 | Native audio on mobile is harder than I expected | Draft |
| 10 | Phase 4 | The moment the AI told the story back to me | Draft |
| 11 | Phase 5 | Submitting to the App Store — what I didn't know I didn't know | Draft |
| 12 | Post-launch | What I'd do differently | Draft |

---

## Post 1 — The Idea

**Phase:** Pre-build  
**Theme:** Product concept + why build in public  
**Milestone:** Concept defined, project started

### Hook
> "I've built a lot of apps. Most of them I can't show anyone. So I'm building this one in public."

### Story
Chronicler is a mobile app that turns voice recordings into AI-narrated group stories — in the voice of a medieval chronicler, a sports commentator, or an epic fantasy bard.

The idea came from a simple frustration: friend groups share experiences constantly, but have no good way to preserve them. Photos get buried. Group chats are unreadable. Stories fade.

I'm documenting every decision — the architecture, the stack choices, the things that break — in a public dev log. Not because everything will go right, but because the decisions are the interesting part.

### Takeaway for the post
"Building in public isn't about showing a finished product. It's about showing how you think."

### Hashtags
`#buildinpublic` `#indiedev` `#mobiledev` `#reactnative` `#AI`

---

## Post 2 — The SDD

**Phase:** Pre-build  
**Theme:** Why I wrote a full design document before touching code  
**Milestone:** SDD v0.3 complete, all design questions resolved

### Hook
> "Before I wrote a single line of code, I wrote 8 pages of decisions. Here's why."

### Story
Most side projects skip the planning phase. I've done it too — and watched good ideas collapse because the data model was wrong on week 6 and it was too painful to fix.

This time I wrote a Software Design Document. Not for a team — I'm building solo. For me.

The SDD forced me to answer questions I would have deferred:
- Is the narrative flavour per-group or per-event? (Per-event — much more flexible)
- Who can delete recordings? (Owner only — because re-running Whisper isn't free)
- How long do we keep audio files? (Delete raw audio after transcription — it's personal voice data under GDPR)

The answers aren't complicated. But without the doc forcing me to ask them, I would have coded the wrong thing, then spent a week undoing it.

### Takeaway
"The best time to make architecture decisions is when changing them costs nothing."

### Hashtags
`#softwaredesign` `#systemdesign` `#buildinpublic` `#solodev` `#engineering`

---

## Post 3 — Tech Stack Decisions

**Phase:** Pre-build  
**Theme:** Stack choices and the reasoning behind them  
**Milestone:** Tech stack finalised in SDD

### Hook
> "I had three good options for the backend. Here's how I ruled two of them out."

### Story
Starting stack: FastAPI (Python). I changed it to Hono (Node.js / TypeScript).

Why? I'm more productive in JavaScript. When I'm debugging a BullMQ job at midnight, I want to be in a language I think in, not one I'm translating into.

The less obvious choice was Hono over Express or Fastify. Hono is TypeScript-first, minimal, and — crucially — has a path to Cloudflare Workers if I ever want to run the API at the edge alongside Cloudflare R2 for storage. Not a requirement now, but a door I didn't want to close.

The full stack:
- **Mobile:** Expo (React Native) — cross-platform with one codebase
- **Backend:** Hono + TypeScript — async-native, minimal overhead
- **Database + Auth:** Supabase — Postgres, auth, and realtime in one package
- **Storage:** Cloudflare R2 — S3-compatible, zero egress fees
- **Queue:** Redis + BullMQ — async AI jobs need a proper queue
- **AI:** OpenAI Whisper + Claude Sonnet 4.6 + OpenAI TTS

Every choice trades something. I'll show you the tradeoffs as I hit them.

### Hashtags
`#techstack` `#nodejs` `#typescript` `#buildinpublic` `#hono` `#supabase`

---

## Post 4 — The Phase 0 Spike

**Phase:** Phase 0  
**Theme:** Why I built a throwaway web test rig before the app  
**Milestone:** Phase 0 kicked off

### Hook
> "The first thing I built for my mobile app was a 50-line HTML page. Here's why that was the right call."

### Story
The riskiest part of Chronicler isn't the mobile UI. It's the AI pipeline:
voice → Whisper transcription → LLM rewrite → TTS narration.

If that pipeline is too slow, too expensive, or just doesn't produce good enough output, the whole product falls apart. And I can't know that by looking at documentation.

So before touching Expo, I built a simple web form that lets me:
1. Upload an audio file
2. Hit the backend
3. Read the AI-generated chronicle
4. Play back the TTS narration

It took a day to build. And it'll tell me everything I need to know before I spend weeks on the mobile app.

The principle: validate the hardest assumption first, with the least possible code.

### Hashtags
`#buildinpublic` `#ai` `#softwareengineering` `#technicalspike` `#indiedev`

---

## Post 5 — AI Pipeline Results

**Phase:** Phase 0  
**Theme:** What the AI pipeline actually cost and how fast it was  
**Milestone:** Phase 0 complete — pipeline validated

> **Fill in with real data after Phase 0 is complete.**

### Hook
> "I ran 50 AI-generated chronicles through my pipeline. Here's what it actually cost."

### Story to develop
- Whisper: cost per minute of audio, actual latency
- Claude Sonnet: cost per chronicle, quality notes across all 4 flavours
- TTS: cost per word, which voice worked best
- End-to-end latency: time from upload to playback-ready
- Surprises: what was better/worse than expected
- What I changed as a result

### Takeaway
"The gap between API pricing pages and real-world cost with real audio is [X]. Here's what I found."

---

## Post 6 — Building the Backend First

**Phase:** Phase 1  
**Theme:** Why I built a full API before the frontend  
**Milestone:** Phase 1 backend complete

### Hook
> "I have no UI yet. I have a Postman collection with 22 endpoints. This is intentional."

### Story to develop
- The value of a clean API contract before frontend work
- How Supabase auth integrates with Hono middleware (JWT)
- BullMQ worker architecture for the AI pipeline
- The audio deletion job — why it exists, how it works
- The contributor cap enforced server-side (not just client-side)

---

## Post 7 — Supabase + BullMQ: Async AI Jobs

**Phase:** Phase 1  
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

## Post 8 — First Screen in Expo

**Phase:** Phase 2  
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

## Post 9 — Native Audio Is Harder Than I Expected

**Phase:** Phase 3  
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

## Post 10 — The Moment the AI Told the Story Back

**Phase:** Phase 4  
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

## Post 11 — App Store Submission

**Phase:** Phase 5  
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

## Post 12 — What I'd Do Differently

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
