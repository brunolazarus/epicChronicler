# Chronicler — Software Design Document (SDD)

**Version:** 0.3  
**Date:** June 2026  
**Status:** Active — Ready for Phase 0 (AI pipeline spike)  

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
11. [Tech Stack](#11-tech-stack)
12. [MVP Phases & Milestones](#12-mvp-phases--milestones)
13. [Open Questions](#13-open-questions)

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

### In Scope (MVP)

- [ ] Users can create accounts and join friend groups
- [ ] Members record voice stories tied to a group event
- [ ] AI transcribes audio to text (Whisper)
- [ ] AI retells the story in a chosen "flavour" (narrative style)
- [ ] Multiple members contribute perspectives on the same event; they are merged into one chronicle
- [ ] TTS narrates the final chronicle aloud
- [ ] TLDR generator summarizes group history for new members
- [ ] Push notifications for new chronicles and new perspectives

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

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (Expo / React Native)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS REST / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Server (Hono / Node.js / TypeScript)        │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │ Auth Service │  │  REST API    │  │  Job Queue       │  │
│   │ (Supabase)   │  │  (CRUD)      │  │  (BullMQ+Redis)  │  │
│   └──────────────┘  └──────────────┘  └────────┬─────────┘  │
└────────────────────────────────────────────────┼────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
          ┌─────────────────┐        ┌───────────────────┐        ┌──────────────────┐
          │  File Storage   │        │  AI Pipeline      │        │  Database        │
          │  (Cloudflare R2)│        │                   │        │  (PostgreSQL via  │
          │                 │        │  1. Whisper API   │        │   Supabase)       │
          │  - Raw audio    │        │  2. Claude Sonnet │        │                  │
          │  - TTS audio    │        │  3. OpenAI TTS    │        │  - Users         │
          │  - Avatars      │        │                   │        │  - Groups        │
          └─────────────────┘        └───────────────────┘        │  - Events        │
                                                                   │  - Recordings    │
                                                                   │  - Chronicles    │
                                                                   └──────────────────┘
```

### 7.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Async AI jobs | Job queue (Redis + worker) | AI calls take 5–20s; don't block the HTTP request |
| Flavour scope | Per-event (set at event creation) | Flexibility per memory; groups don't lock into one style |
| Flavour storage | Server-side config table | New flavours without app updates |
| Audio storage | R2 (not database) | Binary files belong in object storage, not DB |
| Audio deletion | Delete raw audio after transcription | Reduces R2 costs; limits GDPR voice-data retention window |
| Multi-perspective merging | Simple concatenation with speaker labels | "Alex said: ... Sam said: ..." passed to LLM |
| Contributor cap | 2 for MVP, 3 post-MVP | Kept as a runtime config value — no schema change needed to bump |
| Chronicle permissions | Generation: any member; Regeneration: owner only (stored as role list) | Role list makes it easy to open up regeneration to all members later |

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
10. Combined prompt sent to Claude Sonnet 4.6 via `@anthropic-ai/sdk`
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

| Layer | Technology | Why |
|---|---|---|
| Mobile | React Native (Expo) | Cross-platform iOS + Android; Expo simplifies audio, push, and OTA updates |
| Backend | Hono (Node.js / TypeScript) | TypeScript-first, minimal overhead, async-native; future upgrade path to Cloudflare Workers edge deployment |
| Database | PostgreSQL via Supabase | Managed Postgres + built-in auth + realtime subscriptions; `@supabase/supabase-js` works natively in Node |
| File Storage | Cloudflare R2 | S3-compatible, zero egress fees — important for audio streaming; pairs naturally with Hono's Cloudflare lineage |
| Job Queue | Redis + BullMQ | De facto standard for Node.js async queues; robust retry logic, job prioritisation, and dashboard UI out of the box |
| Transcription | OpenAI Whisper API | Best-in-class accuracy; Node.js `openai` SDK handles multipart audio upload |
| LLM | Claude Sonnet 4.6 | Strong creative/narrative output; cost-effective at scale; `@anthropic-ai/sdk` for Node |
| TTS | OpenAI TTS (tts-1-hd) | Good quality, affordable, fast; voices configurable per flavour |
| Push Notifications | Expo Push Notifications | Free, handles both APNS and FCM from one SDK |
| CI/CD | GitHub Actions | Standard; free tier sufficient for MVP |

---

## 12. MVP Phases & Milestones

> **Rationale for ordering:** The AI pipeline (transcription → LLM → TTS) is the highest-risk and most novel part of Chronicler. It is built and validated first via a throwaway web test rig before any mobile work begins. The backend built in Phase 0 is the production backend — nothing is thrown away.

---

### Phase 0 — AI Pipeline Spike (Weeks 1–2)
**Goal:** Prove the full AI pipeline works, costs are acceptable, and latency is within targets — before writing a single line of mobile code.

- [ ] Hono + TypeScript project scaffolded (monorepo root)
- [ ] Supabase connected (Postgres client + service role key)
- [ ] Cloudflare R2 bucket set up; upload/download working
- [ ] BullMQ worker wired to Redis; basic job round-trip confirmed
- [ ] Whisper transcription job: upload audio → get transcript
- [ ] LLM chronicle job: transcripts + flavour prompt → chronicle text (all 4 flavours tested)
- [ ] TTS job: chronicle text → audio file stored in R2
- [ ] **Minimal web test rig** — a simple HTML page (or Hono-served form) that drives the full pipeline: pick audio file → upload → generate → read text → play TTS audio
- [ ] Log and review per-chronicle cost and end-to-end latency

**Exit criteria:** Upload a recorded voice note via the web rig and receive a narrated chronicle in all 4 flavours. Cost per chronicle is known and acceptable.

---

### Phase 1 — Backend Foundation (Weeks 3–5)
**Goal:** Full production API built on top of the proven pipeline; no mobile code yet.

- [ ] Supabase Auth middleware integrated into Hono (JWT validation)
- [ ] User registration, login, OAuth (Google + Apple) endpoints
- [ ] Groups API: create, invite link, join via token, member list
- [ ] Events API: create with flavour selection, list, status lifecycle
- [ ] Recordings API: upload endpoint, contributor cap enforcement, owner delete
- [ ] Chronicle API: `/generate` (any member) + `/regenerate` (owner only), versioning
- [ ] BullMQ workers for transcription and chronicle generation promoted to production jobs
- [ ] Usage limits enforced: max 3 groups/user, 10 recordings/user/month
- [ ] Audio deletion job: purge R2 raw audio 24h after successful transcription
- [ ] Expo Push notification integration (send on chronicle ready + new perspective)
- [ ] TLDR endpoint (uses all group chronicles as context)
- [ ] API fully testable via HTTP client (Hoppscotch / Postman collection)

**Exit criteria:** The entire API can be exercised via HTTP client: create a group, add an event, upload two recordings, generate a chronicle, receive push notification.

---

### Phase 2 — Mobile Foundation (Weeks 6–8)
**Goal:** Expo app scaffolded; auth and group management working on device.

- [ ] Expo project setup with TypeScript + file-based routing
- [ ] Auth screens: sign up, log in, Apple Sign-In, Google OAuth
- [ ] Group list screen + create group flow
- [ ] Invite link generation + deep-link join flow
- [ ] Group home screen (event timeline, empty state)
- [ ] Profile screen: display name + avatar

**Exit criteria:** A user can sign up, create a group, invite a friend via link, and both see the group on their device.

---

### Phase 3 — Recording Loop (Weeks 9–10)
**Goal:** Members can record, upload, and see transcripts on device.

- [ ] Event creation screen with flavour picker
- [ ] In-app audio recorder with waveform visualisation (Expo AV)
- [ ] Playback before submit; re-record option
- [ ] Upload audio to R2 from mobile; show upload progress
- [ ] Transcription status polling: `TRANSCRIBING` → `TRANSCRIBED` indicator
- [ ] Event screen: contributor list, recording status per member
- [ ] UI enforcement of 2-contributor cap ("event full" state)

**Exit criteria:** Two members on the same event each record a story and both see their transcripts appear.

---

### Phase 4 — Chronicle + Full Experience (Weeks 11–12)
**Goal:** The complete Chronicler experience works end-to-end on device.

- [ ] "Generate Chronicle" trigger in event screen (any member)
- [ ] Chronicle loading state (async job polling or WebSocket)
- [ ] Chronicle display screen: text + contributor credits
- [ ] TTS audio playback with playback controls
- [ ] "Regenerate" action gated to owner
- [ ] Push notification received on device when chronicle is ready
- [ ] Multi-perspective merge confirmed working with 2 contributors

**Exit criteria:** A group with two recordings generates a narrated chronicle, both members receive a push notification, and can listen to the TTS audio.

---

### Phase 5 — TLDR, Polish & Launch (Weeks 13–14)
**Goal:** TLDR complete; app is shippable.

- [ ] TLDR screen: generated on new-member onboarding + available on demand
- [ ] New member onboarding flow (join group → TLDR prompt)
- [ ] Error states: failed transcription, failed generation, network errors
- [ ] Waveform playback UI polish
- [ ] Cold start performance pass (target < 2s)
- [ ] App Store + Play Store metadata, screenshots, privacy policy
- [ ] TestFlight / internal track testing

**Exit criteria:** App submitted to both stores.

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
