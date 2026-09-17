# Postmortems — Index

One file per incident: a dated writeup of what broke, the timeline, the root cause, why it wasn't
caught, the fix, and any follow-up worth naming but not necessarily doing immediately. Unlike
`docs/PRD.md` or `docs/architecture.md`, nothing here needs to stay "current" — a postmortem is true
the day it's written and stays true as a historical record. The only thing that goes stale is this
index itself if a new one lands without a row.

**Maintenance rule:** filing a postmortem under `docs/postmortems/` gets one new row here, in the same
commit. See `CLAUDE.md`'s "Docs to update when architecture changes."

---

| Date | Postmortem | What broke | Root cause, one line |
|---|---|---|---|
| 2026-09-17 | [mobile-recording-mp4-rejected.md](2026-09-17-mobile-recording-mp4-rejected.md) | In-browser recording on iOS Safari / WebKit-mobile rejected as "unsupported format" | Frontend's format whitelist and the backend's `MIME_TYPES` table were written 2.5 months apart and never cross-checked — `mp4` was missing from the former, present in the latter |

---

## Related, not part of this ledger

- `docs/superpowers/INDEX.md` — the technical *decision* ledger (specs/plans for work done
  deliberately, ahead of time). This index is the technical *incident* ledger — things that broke and
  got diagnosed after the fact. A postmortem sometimes produces a follow-up spec; when it does, link
  it from that postmortem's own "Follow-ups" section rather than duplicating the row here.
