# Chronicler — Product Requirements Document (PRD)

**Version:** 0.8
**Date:** 2026-09-10
**Status:** Active. Renamed from SDD to PRD (see 0.8 changelog entry) — this document is the full
product requirements, **including backlog scope that isn't built yet** (groups, mobile, accounts).
It is not a description of what's currently running. For that, see `CLAUDE.md` (current stack +
architecture), `docs/architecture.md` (current diagram), `docs/ROADMAP.md` (what's shipped, as public
narrative), and `docs/HORIZONS.md` (what might get built next). §5/§6/§8/§9/§10 below describe the
full requirements as originally scoped and are intentionally preserved even where the near-term plan
(§2) has deprioritized the feature they describe — a PRD's job is to hold requirements for backlog
scope, not just for what's implemented today.

---

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.8 | 2026-09-10 | Renamed SDD → PRD to match what the document actually is (product requirements, not a living architecture/tech-stack description — those drift too fast to hand-maintain here). §7.1's architecture diagram retired in favor of `docs/architecture.md` (single source); §7.2/§7.3 kept as-is. §11 Tech Stack retired — it had gone stale (still listed Supabase) and duplicated `CLAUDE.md`'s Infrastructure table, which is the one meant to stay current. §12 MVP Phases & Milestones replaced with pointers to `docs/ROADMAP.md`, `docs/HORIZONS.md`, and the new `docs/superpowers/INDEX.md` — that section had been self-flagged "under revision" since 0.7 and never revised; the phase-sequencing job it was doing now belongs to those three files. §13's Table of Contents entry corrected to match its actual heading ("Design Decisions Log", not "Open Questions" — a drift internal to this document, found while doing this pass). §5/§6/§8/§9/§10 (functional/non-functional requirements, data models, API design, AI pipeline) deliberately **not** retired — see the Status line above. |
| 0.7 | 2026-07-28 | Direction change: groups/multi-perspective merging/TLDR/push notifications moved from MVP scope to backlog (§2) — no monetization intent, and account gating conflicts with the low-friction positioning validated in Phase 1. Phase 2 (§12) is under revision toward a single-user-first plan. |
| 0.6 | 2026-07-16 | Documented monorepo build tooling (§7.3): Turborepo rationale, current vs. projected task coverage, known gap with the Docker deploy path; added workspace/build-graph diagram to `docs/architecture.md` |
| 0.5 | 2026-06-19 | Queue architecture refactor: `apps/worker` deleted; each app runs its own BullMQ workers in-process; Redis key prefix isolation (`mcp:`, `web:`) enforces ownership; MCP server now uses R2 for audio upload/download; both services confirmed working in production |
| 0.4 | 2026-06-09 | Added MCP server as Phase 1; postponed Expo to Phase 3+; updated tech stack to actual providers (Groq Whisper, Kokoro 82M via OpenRouter); added `packages/core` service isolation to architecture |
| 0.3 | 2026-06-01 | Phase 0 complete; switched to OpenRouter for LLM + TTS; added Groq for transcription; built provider abstraction layer; added `@hono/zod-openapi` + Scalar UI for API docs |
| 0.2 | 2026-05 | Data model finalised; all design decisions resolved; API endpoints defined |
| 0.1 | 2026-05 | Initial draft — vision, personas, user stories, functional requirements |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture](#7-system-architecture)
8. [Data Models](#8-data-models)
9. [API Design](#9-api-design)
10. [AI Pipeline](#10-ai-pipeline)
11. [Tech Stack](#11-tech-stack) — retired, see note in-place
12. [MVP Phases & Milestones](#12-mvp-phases--milestones) — retired, see note in-place
13. [Design Decisions Log](#13-design-decisions-log) — TOC previously mislabeled this "Open Questions"; corrected 0.8

---

## 1. Overview

### Vision Statement
Chronicler transforms the messy, ephemeral experience of group memories into polished, entertaining chronicles — narrated in styles that make the mundane legendary.

### Problem Statement
Friend groups share experiences constantly, but have no good way to preserve them. Photos get buried in camera rolls. Group chats are unsearchable walls of noise. Stories fade. Chronicler solves this by making memory capture as easy as pressing record, and memory retrieval as fun as listening to an audiobook — narrated by a medieval scribe, a sports commentator, or an epic fantasy bard.

### Target Users
- **Primary:** Friend groups (ages 18–35) who share frequent experiences — trips, game nights, events, traditions
- **Secondary:** New members joining an existing group who need to quickly understand its history

---

## 2. Goals & Non-Goals

**Direction change (2026-07-28):** the group/multi-perspective mechanic is deprioritized to backlog, not abandoned. Reasoning: there's no monetization intent, so the usage-limiting and account-gating that groups implied has no real purpose; and requiring an account is exactly the kind of friction that works against the "try it in 30 seconds" positioning the web demo and MCP server already validated in Phase 1. Current focus is a better single-user experience — record, retell, listen — with no login required.

### In Scope (MVP)

- [x] Users can record a voice story, no account required
- [x] AI transcribes audio to text (Whisper)
- [x] AI retells the story in a chosen "flavour" (narrative style)
- [x] TTS narrates the final chronicle aloud
- [ ] Users can save and revisit their own past chronicles

### Backlog (deprioritized, not abandoned)

- Accounts and friend groups
- Multiple members contribute perspectives on the same event; merged into one chronicle
- TLDR generator summarizing group history for new members
- Push notifications (chronicle ready, new perspective, group invites)
- Group roles (Owner/Member), invite links, contributor caps

### Out of Scope (Post-MVP)

- Video recording or video playback
- Public or discoverable groups
- Web app
- Offline mode / local-only storage
- Monetization / subscription tiers
- Custom user-created flavours
- Moderation tooling (flagging / reporting)
- **Retell in a different flavour** — after a chronicle is generated, re-narrate the same event in a new flavour without re-recording (requires chronicle regeneration to be opened up to all members; data model already supports this)
- Raise contributor cap beyond 3 members per event

> **Why this matters:** Defining non-goals is as important as defining goals. It protects the team from scope creep and gives stakeholders a clear answer to "why isn't X in it?"

---

## 3. User Personas

### Persona 1 — The Organizer (Alex, 26)
- Creates the group, sets the tone, invites everyone
- Most likely to choose the chronicle flavour and push members to contribute
- Wants the app to feel polished enough that friends actually use it long-term
- Pain point: "I'm always the one trying to get people to document things and nobody does"

### Persona 2 — The Contributor (Sam, 24)
- Records stories after shared events
- Values low friction above all — quick record, done, move on
- Gets genuine delight from hearing the AI retell their story
- Pain point: "I want to remember this trip but I'm not going to write a journal"

### Persona 3 — The Newcomer (Jordan, 23)
- Joined the group mid-history, doesn't know all the lore
- Uses the TLDR to get up to speed quickly
- Becomes a contributor once they feel part of the group
- Pain point: "Everyone has inside jokes and I don't know any of the backstory"

---

## 4. User Stories

### Group Management
- As a user, I can sign up and create a profile with a display name and avatar
- As a user, I can create a group with a name and description
- As a user, I can invite friends to a group via a shareable link
- As a user, I can join a group using an invite link
- As an organizer, I can rename or edit the group description
- As an organizer, I can delete any member's recording from any event

### Event & Recording
- As a member, I can create an event (name, date, and flavour) within a group
- As a member, I can record an audio story and attach it to an event
- As a member, I can play back my recording before submitting it
- As a member, I can re-record before submitting
- As a member, I can see who else has contributed a perspective to an event
- As a member, I can add my perspective to an event someone else started

### Chronicle
- As a member, I can trigger chronicle generation for an event once at least one recording exists
- As a member, I can read the generated chronicle as text
- As a member, I can listen to the TTS-narrated chronicle
- As a member, I can see which contributors' perspectives were included in a chronicle
- As an organizer, I can regenerate a chronicle (creates a new version; previous versions are preserved)

### TLDR
- As a new member, I can request a TLDR of the group's history after joining
- As any member, I can request a fresh TLDR at any time
- As a member, I can share a TLDR text snippet externally

### Notifications
- As a member, I receive a push notification when a new chronicle is ready
- As a member, I receive a notification when someone adds a perspective to an event I contributed to
- As a user, I receive an in-app notification for group invites

---

## 5. Functional Requirements

> **Scope note (added 0.8):** §5, §6, §8, §9, and §10 describe the full product as originally
> designed — including the groups/multi-perspective/mobile scope §2 moved to backlog on 2026-07-28.
> They're preserved deliberately, not because they're current. The actual single-user MVP's real API
> is four endpoints (`/upload`, `/jobs/:id`, `/generate`, `/flavours`), generated and documented live
> at `/doc` — see `packages/api-client` and `CLAUDE.md`, not this section, for what's really running.

### 5.1 Authentication & User Management
- [ ] Email/password sign-up and login
- [ ] Apple Sign-In (required for iOS App Store)
- [ ] Google OAuth
- [ ] User profile: display name, avatar (upload or select from defaults)
- [ ] Password reset via email

### 5.2 Groups
- [ ] Create group: name, optional description
- [ ] Invite link generation (expires after 7 days, single-use configurable)
- [ ] Member list with roles: **Owner** and **Member**
- [ ] Group settings: rename, edit description
- [ ] Owner can delete any recording from any event in the group
- [ ] Leave group (owner must transfer ownership first)

### 5.3 Events
- [ ] Create event: name + date + flavour selection (description optional)
- [ ] Events displayed in chronological timeline within the group
- [ ] Event status lifecycle: `OPEN` → `GENERATING` → `CLOSED`
- [ ] An event moves to `CLOSED` after its first chronicle is generated
- [ ] Maximum **2 contributors** per event in MVP (enforced server-side; UI shows "full" state when cap reached)
- [ ] Cap is designed to expand to 3 in a future release without data model changes

### 5.4 Audio Recording
- [ ] In-app audio recorder with waveform visualization during recording
- [ ] Playback of recording before submission
- [ ] Maximum recording length: **5 minutes** (enforced client-side)
- [ ] Upload audio to cloud storage on submission
- [ ] Recording status: `UPLOADED` → `TRANSCRIBING` → `TRANSCRIBED` / `FAILED`
- [ ] Raw audio file is **deleted from R2 within 24 hours of successful transcription** — transcript (text) is retained indefinitely
- [ ] If transcription fails, audio is retained for up to 7 days to allow retry, then deleted regardless

### 5.5 Flavours (Narrative Styles)
- [ ] Medieval chronicler
- [ ] Sports commentator
- [ ] Nature documentary narrator
- [ ] Epic fantasy bard
- [ ] Flavours are **server-driven** — new flavours can be added without an app update
- [ ] Each flavour has: name, description, icon, and a system prompt stored server-side

### 5.6 Chronicle Generation
- [ ] **Any member** can trigger first-time chronicle generation (requires ≥1 `TRANSCRIBED` recording)
- [ ] **Owner only** can regenerate a chronicle (data model stores `allowed_regenerators` as a role list — currently `[OWNER]`, extendable without schema changes)
- [ ] Regeneration creates a new versioned Chronicle row; all previous versions are preserved
- [ ] Pulls all `TRANSCRIBED` recordings for the event
- [ ] Sends combined transcripts + event's flavour system prompt to LLM
- [ ] Stores generated text in `Chronicle.body_text`
- [ ] Triggers async TTS job; stores TTS audio in `Chronicle.audio_url`
- [ ] TTS audio retained for minimum **7 days** after generation
- [ ] Notifies all group members when ready

### 5.7 TLDR Generator
- [ ] Triggered on new member onboarding or via manual request
- [ ] Summarizes all group chronicles into a brief, readable format
- [ ] Delivered as text (TTS optional)
- [ ] Cacheable — regenerate only when new chronicles have been added

### 5.8 Push Notifications
- [ ] "Your group's chronicle for [Event] is ready"
- [ ] "[Name] added their perspective on [Event]"
- [ ] "You've been invited to join [Group]"

---

## 6. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| Audio upload | < 3s for 1-min recording on LTE | Compress client-side before upload |
| Transcription latency | < 10s for 5-min audio | Async job; show spinner |
| Chronicle generation | < 20s end-to-end | LLM + TTS in parallel where possible |
| App cold start | < 2s | Lazy-load heavy screens |
| API response (non-AI) | < 300ms p95 | Standard CRUD endpoints |
| Uptime | 99.5% | Acceptable for consumer MVP |
| Data privacy | Recordings visible to group members only | No public access to audio or chronicles |
| Platform support | iOS 16+, Android 10+ | Covers ~95% of active devices |
| Raw audio retention | Deleted within 24h of successful transcription; max 7 days on failure | Reduces storage cost + GDPR/CCPA voice data exposure |
| TTS audio retention | Minimum 7 days after chronicle generation | AI-generated voice, not user voice — lower legal risk |
| Usage limits (MVP) | Max 3 groups per user; max 10 recordings per user per month | Prevents API cost runaway; revisit at monetization phase |

---

## 7. System Architecture

### 7.1 High-Level Diagram

**Retired (0.8).** This subsection used to hand-draw the architecture in ASCII, and it had drifted —
still showing a planned Supabase auth/DB service and a mobile client that were never built for the
current single-user MVP. Rather than fix this copy and let it drift again, the diagram now has exactly
one home: `docs/architecture.md`. See that file for the current architecture, and `CLAUDE.md`'s
Infrastructure table for the current deployed services.

### 7.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Async AI jobs | BullMQ workers in-process alongside the HTTP server | AI calls take 5–20s and are IO-bound (async API calls); they don't block the event loop, so a separate worker process or service adds complexity without benefit at this scale |
| Queue ownership | Each app owns its workers; Redis key prefixes isolate namespaces | `mcp:pipeline:*` and `web:transcription:*` share one Redis instance without cross-contamination; no separate worker Railway service needed |
| Audio upload (MCP) | Presigned R2 PUT URL — audio never passes through the server | Keeps the HTTP server stateless; audio goes directly from client to R2 at full network speed |
| Flavour scope | Per-event (set at event creation) | Flexibility per memory; groups don't lock into one style |
| Flavour storage | Server-side config table | New flavours without app updates |
| Audio storage | R2 (not database) | Binary files belong in object storage, not DB |
| Audio deletion | Delete raw audio after transcription | Reduces R2 costs; limits GDPR voice-data retention window |
| Multi-perspective merging | Simple concatenation with speaker labels | "Alex said: ... Sam said: ..." passed to LLM |
| Contributor cap | 2 for MVP, 3 post-MVP | Kept as a runtime config value — no schema change needed to bump |
| Chronicle permissions | Generation: any member; Regeneration: owner only (stored as role list) | Role list makes it easy to open up regeneration to all members later |

### 7.3 Monorepo & Build Tooling

**Structure:** pnpm workspaces (`apps/*`, `packages/*`, `scripts`) with Turborepo orchestrating cross-package tasks. See `docs/architecture.md` for the full workspace diagram.

**Why Turborepo, not hand-rolled `pnpm --filter` chains:**

| Concern | Without Turborepo | With Turborepo |
|---|---|---|
| Build order | Every script that needs `@chronicler/core` built first has to say so explicitly, in order | `turbo.json`'s `"build": { "dependsOn": ["^build"] }` derives build order from the workspace dependency graph — a new app or package that depends on `@chronicler/core` is ordered correctly with zero script changes |
| Redundant work | A full `pnpm build` rebuilds every package every time, regardless of what changed | Turborepo hashes each package's inputs and skips/caches unchanged builds — the payoff grows as `packages/*` grows past just `core` |
| Entry point | Root scripts accumulate one more `pnpm --filter` line per package added | `turbo build` is one command regardless of workspace size |

**Current usage is intentionally narrow — only `build` goes through Turborepo.** The root `pnpm build` script is `turbo build`. `dev`, `dev:mcp`, and `dev:all` run directly via `concurrently` + `pnpm --filter` (`package.json`), and `test` runs Playwright directly — none of these benefit from Turborepo's cache, since dev servers are long-running watch processes and the test suite isn't scoped per-package.

**Known gap:** `Dockerfile.api` and `Dockerfile.mcp` do **not** call `turbo build`. Each hand-rolls `pnpm --filter @chronicler/core build` because the container runs the app straight from source via `tsx` (e.g. `pnpm --filter api exec tsx src/index.ts`), not from a compiled `dist/` — so `@chronicler/core` is the only package in the image that needs a build step at all. This means Turborepo's dependency-ordering isn't exercised by the deploy path today; it only matters for local full-repo builds (`pnpm build` at the root). It starts pulling real weight once a CI pipeline (GitHub Actions — planned, not yet built) runs `turbo build` / `turbo test` across the whole workspace, or once a second app depends on more than one `packages/*` entry and the build order can no longer be eyeballed.

---

## 8. Data Models

### User
```
id            UUID        PK
email         TEXT        UNIQUE NOT NULL
display_name  TEXT        NOT NULL
avatar_url    TEXT
created_at    TIMESTAMP   DEFAULT NOW()
```

### Group
```
id            UUID        PK
name          TEXT        NOT NULL
description   TEXT
owner_id      UUID        FK → User
created_at    TIMESTAMP   DEFAULT NOW()
```

### GroupMember
```
group_id      UUID        FK → Group
user_id       UUID        FK → User
role          ENUM        (OWNER, MEMBER)
joined_at     TIMESTAMP   DEFAULT NOW()
PRIMARY KEY (group_id, user_id)
```

### Flavour
```
id            UUID        PK
name          TEXT        NOT NULL        -- "Medieval Chronicler"
slug          TEXT        UNIQUE          -- "medieval"
description   TEXT
icon_url      TEXT
system_prompt TEXT        NOT NULL        -- The LLM system prompt
is_active     BOOLEAN     DEFAULT TRUE
```

### Event
```
id              UUID        PK
group_id        UUID        FK → Group
name            TEXT        NOT NULL
event_date      DATE        NOT NULL
description     TEXT
flavour_id      UUID        FK → Flavour    -- set at event creation; determines chronicle style
contributor_cap INTEGER     DEFAULT 2       -- MVP=2, bump to 3 post-MVP without schema change
status          ENUM        (OPEN, GENERATING, CLOSED)
created_by      UUID        FK → User
created_at      TIMESTAMP   DEFAULT NOW()
```

### Recording
```
id                UUID        PK
event_id          UUID        FK → Event
user_id           UUID        FK → User
audio_url         TEXT        NOT NULL    -- R2 path; NULL after deletion
transcript        TEXT                    -- retained indefinitely after transcription
status            ENUM        (UPLOADED, TRANSCRIBING, TRANSCRIBED, FAILED)
duration_sec      INTEGER
audio_deleted_at  TIMESTAMP               -- set when raw audio is purged from R2
created_at        TIMESTAMP   DEFAULT NOW()
```

### Chronicle
```
id              UUID        PK
event_id        UUID        FK → Event
flavour_id      UUID        FK → Flavour
body_text       TEXT        NOT NULL
audio_url       TEXT
version         INTEGER     DEFAULT 1
generated_at    TIMESTAMP   DEFAULT NOW()
```

---

## 9. API Design

> All endpoints are prefixed with `/api/v1`. All requests require a valid auth token (JWT) except `/auth/*`.
> API documentation is auto-generated from route schemas via `@hono/zod-openapi` and served as an interactive Scalar UI at `/doc`. The OpenAPI JSON spec is available at `/openapi.json`.

### Auth
```
POST   /auth/register          Sign up with email + password
POST   /auth/login             Login, returns JWT
POST   /auth/oauth/google      OAuth with Google
POST   /auth/oauth/apple       OAuth with Apple
POST   /auth/reset-password    Send password reset email
```

### Users
```
GET    /users/me               Get current user profile
PATCH  /users/me               Update display name or avatar
```

### Groups
```
GET    /groups                 List groups the current user belongs to
POST   /groups                 Create a new group
GET    /groups/:id             Get group detail + member list
PATCH  /groups/:id             Update name or description  [owner only]
POST   /groups/:id/invite      Generate or refresh invite link  [owner only]
POST   /groups/join/:token     Join group via invite token
DELETE /groups/:id/members/me  Leave group
```

### Events
```
GET    /groups/:id/events      List events in a group (paginated)
POST   /groups/:id/events      Create a new event (includes flavour_id)  [any member]
GET    /events/:id             Get event detail + recording list
PATCH  /events/:id             Update event name or date  [event creator or owner]
```

### Recordings
```
POST   /events/:id/recordings   Upload audio recording  [any member; 409 if contributor_cap reached]
GET    /events/:id/recordings   List recordings for event
DELETE /recordings/:id          Delete a recording  [owner only; allowed at any time]
```

### Chronicles
```
POST   /events/:id/chronicles/generate     Trigger first chronicle generation  [any member]
POST   /events/:id/chronicles/regenerate   Regenerate chronicle  [owner only]
GET    /events/:id/chronicles/latest       Get the most recent chronicle
GET    /events/:id/chronicles              Get all versions
GET    /chronicles/:id/audio               Stream TTS audio
```

### TLDR
```
GET    /groups/:id/tldr        Get (or generate) group TLDR
```

### Flavours
```
GET    /flavours               List all active flavours
```

---

## 10. AI Pipeline

### 10.1 Step-by-Step Flow

```
1. Member records audio in-app
2. Audio uploaded to Cloudflare R2
3. Recording status set to UPLOADED
4. Worker picks up job → calls Whisper API
5. Transcript saved to Recording.transcript
6. Recording status set to TRANSCRIBED

--- (triggered when member taps "Generate Chronicle") ---

7. API fetches all TRANSCRIBED recordings for the event
8. Transcripts concatenated with speaker labels:
   "Alex said: [transcript 1]\n\nSam said: [transcript 2]"
9. Flavour system prompt fetched from DB
10. Combined prompt sent to Claude Sonnet 4.6 via OpenRouter
11. LLM returns chronicle text → stored in Chronicle.body_text
12. TTS job triggered with chronicle text
13. TTS audio stored in R2 → stored in Chronicle.audio_url
14. Event status set to CLOSED
15. Push notification sent to all group members
```

### 10.2 Flavour System Prompt (Example — Medieval)

```
You are a medieval chronicler of great renown. You have received testimonies 
from members of a fellowship describing a recent shared event. Your task is to 
retell their account as a formal chronicle, written for posterity.

Use solemn, archaic language. Refer to participants by name. Dramatize mundane 
details. Begin with: "Here follows the chronicle of..."

Keep the chronicle between 200–400 words. Do not invent facts not present in 
the testimonies.

The testimonies are as follows:
{transcripts}
```

### 10.3 TLDR Prompt (Example)

```
You are summarizing the history of a friend group for a new member.
Below are all chronicles from the group's shared events.
Write a warm, entertaining summary of who these people are, their notable 
adventures, and key running themes or jokes — in 200 words or fewer.
Write it in plain, friendly language (not in any flavour style).
Chronicles:
{all_chronicles}
```

---

## 11. Tech Stack

**Retired (0.8).** This table had gone stale (still listed Supabase/Postgres, which was never adopted
for the current MVP) and duplicated `CLAUDE.md`'s Infrastructure table, which is the copy meant to
stay current — see that file's "Infrastructure" section and its External providers list. If groups/
mobile scope (§2 Backlog) ever gets built, its tech choices get decided fresh at that time, not
inherited unread from this table's original guesses.

---

## 12. MVP Phases & Milestones

**Retired (0.8).** This section was a phase-sequenced execution plan — the WHEN/HOW, not the WHAT —
and Phase 2 had been self-flagged "under revision" since 0.7 and never revised. That job now belongs
to three files that stay current the way this one couldn't: `docs/ROADMAP.md` (what's actually shipped,
as public narrative), `docs/HORIZONS.md` (what might get built next — a menu, not a phase queue), and
`docs/superpowers/INDEX.md` (the technical decision ledger for everything built since 2026-07-01).

What's worth keeping here as a permanent record, briefly: **Phase 0 (AI pipeline spike) and Phase 1
(MCP server) both completed** — full transcribe → rewrite → narrate pipeline validated at fractions of
a cent per chronicle, then exposed as MCP tools and deployed to production on Railway, both ahead of
any mobile client. Everything from "Phase 2" onward assumed the groups/multiplayer/mobile scope that
§2 moved to backlog on 2026-07-28; its detailed checklists (Supabase auth, Expo screens, push
notifications, App Store submission) live on in git history (`git log -p -- docs/SDD.md` before the
0.8 rename) if that scope ever gets picked back up, but repeating them here as if they were a live
plan was exactly the kind of staleness this rename set out to fix.

---

## 13. Design Decisions Log

All questions resolved. Recorded here for future reference.

| # | Decision | Resolution | Implications |
|---|---|---|---|
| 1 | Flavour scope | **Per-event** — selected at event creation | `flavour_id` lives on Event, not Group; enables different styles per memory |
| 2 | Chronicle generation trigger | **Any member** can generate; **owner only** can regenerate | Separate `/generate` and `/regenerate` endpoints; permissions stored as role list for easy future expansion |
| 3 | Contributor cap | **2 per event (MVP)**; expanding to 3 post-MVP | `contributor_cap` column on Event; no schema change needed to bump |
| 4 | Recording deletion | **Owner only** at any time | Prevents accidental re-triggering of transcription API; members cannot self-delete |
| 5 | Chronicle regeneration access | **Owner only** (data model uses a role list) | Role list means "retell in different flavour for all members" requires only a config change, not a migration |
| 6 | Raw audio retention | **Deleted within 24h of successful transcription**; max 7 days on failure | Reduces R2 costs; limits GDPR/CCPA voice data exposure; transcript retained indefinitely |
| 7 | Usage limits | **Max 3 groups per user; max 10 recordings/user/month** | Prevents runaway API costs; revisit when monetization is scoped |
| 8 | Content moderation | **None for MVP** | Acceptable for closed, invite-only groups; flag for review before public launch |
