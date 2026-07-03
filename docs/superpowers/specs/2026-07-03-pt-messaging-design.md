# Portuguese Input Messaging — Design

**Date:** 2026-07-03
**Motivation:** Low engagement on the live web demo — most of Bruno's network speaks Portuguese, and nothing on the page signals that recording in Portuguese works. Goal is to remove that friction and drive more real usage, in the same spirit as the MCP-era decision to "get the product in front of people and learn" rather than keep building in isolation.

---

## Problem

The pipeline already handles Portuguese input correctly today, with zero code changes:

- **Transcription (Groq Whisper):** confirmed by manual testing — speaking Portuguese produces a correct Portuguese transcript.
- **Chronicle generation (Claude via OpenRouter):** the flavour system prompts (`packages/core/src/flavours/index.ts`) never specify an output language. In practice, confirmed by manual testing, the model responds in English regardless of input language — so a Portuguese testimony still produces an English chronicle.
- **TTS (Kokoro 82M):** narrates whatever text the LLM produced. Since that text is always English today, the English-voiced roster (`packages/core/src/tts/openrouter-models.ts`) is a correct match, not a mismatch — there's no Portuguese-narration problem to solve right now.

Nothing on `apps/api/src/static/index.html` tells a visitor any of this. A Portuguese speaker has no reason to expect the app understands them at all.

## Approach

Pure copy change, one file, no pipeline code touched.

Add a line under the Step 1 recording controls (where someone deciding whether to try is actually looking, not buried in the page subtitle):

> "Speak in English or Portuguese — your story comes back as an English legend either way."

**Scope of the claim:** limited to English/Portuguese — the two languages actually verified by hand. Whisper is documented as broadly multilingual, so other languages may well work too, but that's unverified and this messaging shouldn't imply it.

## Out of scope / backlog for later

- **TTS narration in Portuguese** (or in the input's own language generally) — would require sourcing a Portuguese-capable voice/model, since Kokoro's current roster is English-only. Not needed while the LLM's output stays English.
- **Verifying other languages** beyond English/Portuguese — Whisper likely supports many more, but nothing here has tested that, and the UI copy should not claim it yet.

## Success criteria

- The Step 1 card on the live demo clearly states Portuguese input is supported and that output stays in English.
- No pipeline, API, or provider code changes — copy only.
