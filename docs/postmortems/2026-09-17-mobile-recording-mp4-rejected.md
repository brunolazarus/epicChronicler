# Postmortem — Mobile recording rejected as "unsupported format"

**Date filed:** 2026-09-17
**Fix commit:** `020658f` — "bugfix: fixes accepted FE mime types list mismatch" (pushed directly to `main`)
**Status:** Fixed, deployed.

---

## Summary

Every recording made directly in-browser on iOS Safari (and any other WebKit-based mobile browser —
Chrome and Firefox on iOS use the same engine) was rejected client-side with "That format isn't
supported," even though the backend has always been able to transcribe it. Desktop Chrome/Firefox
were unaffected, which is why this didn't surface until a mobile user hit it.

## Timeline

| Date | Event |
|---|---|
| 2026-06-07 | `packages/core/src/transcription/groq.ts`'s `MIME_TYPES` table ships with `mp4 → audio/mp4` already mapped, in the AI pipeline's very first commit (`a992230`). The backend has been able to accept mp4 since day one. |
| 2026-08-31 | `apps/web/src/models/validateAudioFile.ts` is written from scratch during the full frontend rebuild (`fd0d216`) — a plausible-looking list of common audio extensions (`webm, mp3, m4a, wav, ogg`), authored independently of the backend's existing `MIME_TYPES` table. `mp4` isn't on it. |
| 2026-09-17 | Reported by Bruno via a screenshot from an actual mobile device: "That format isn't supported / ERR_UNSUPPORTED_FORMAT / mp4" on the upload-error card. Diagnosed and fixed same day. |

**Impact window:** ~18 days (2026-08-31 → 2026-09-17) where the web app's in-browser recording was
effectively broken for any iOS Safari / WebKit-mobile visitor. Uploading an already-recorded `.m4a`
file still worked; live in-browser recording didn't.

## Root cause

Two independent lists of "which audio formats are OK," written 2.5 months apart, never cross-checked
against each other.

- `packages/core/src/transcription/groq.ts`'s `MIME_TYPES` maps `mp4 → audio/mp4`, alongside `m4a`
  (also `audio/mp4`) — the backend has always distinguished between the two spellings and accepted both.
- `apps/web/src/models/validateAudioFile.ts`'s `SUPPORTED_EXTENSIONS` had `m4a` but not `mp4` — the
  filename-convention spelling, not the MIME-subtype spelling, for the exact same container format.

Mechanically: `useChroniclePresenter.ts` derives the file extension from `recorder.mimeType`. On iOS
Safari, `MediaRecorder` with no explicit options records into an MPEG-4 container and reports
`"audio/mp4"` — which the code correctly turns into the extension `"mp4"`. The validator's whitelist
just never recognized that spelling.

## Why it wasn't caught

No test ever exercised the mp4 case — every existing test recorded/uploaded `.webm` files, which is
what desktop Chrome (the dev's own browser) produces. There's no browser-matrix or mobile-device
testing in the suite, so a Safari-only failure had no way to surface before a real user hit it.

## Fix

- Added `mp4` to `SUPPORTED_EXTENSIONS` in `validateAudioFile.ts`, and updated the error-card copy
  (`limit` string and the notice body text in `useChroniclePresenter.ts`) to mention it.
- Added a regression test: `accepts mp4 — what iOS Safari's MediaRecorder actually produces`, in
  `apps/web/src/models/test/validateAudioFile.test.ts`.
- Verified: full `pnpm build` (5/5 packages) and `pnpm --filter web test` (24 files / 89 tests,
  up from 88 with the new test) both green before the fix was pushed.

## Follow-ups (not done here)

- This is the "generate the contract, don't hand-write it" principle from
  `docs/standards/frontend-architecture-standard.md`, violated between two internal layers instead of
  across the API boundary it was written for. `validateAudioFile.ts`'s whitelist could be derived from
  (or at least asserted equal to, via a shared test) `groq.ts`'s `MIME_TYPES` keys, so the two can't
  drift again the way they just did for 18 days, unnoticed.
- No mobile-device or WebKit-specific testing exists anywhere in the suite. Not scoping that here —
  just naming it as the category of gap that let this ship unnoticed.
