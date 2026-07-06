# Sample Chronicle Text — Design

**Date:** 2026-07-06
**Motivation:** Same engagement push as the Portuguese messaging change (`docs/superpowers/specs/2026-07-03-pt-messaging-design.md`) — the landing page gives no sense of what a finished chronicle actually reads like before someone commits to recording their own story. A short example removes that uncertainty.

---

## Approach

Pure copy addition, one file (`apps/api/src/static/index.html`), no backend or pipeline changes.

Add a short section above the Step 1 recording controls showing one hand-written, illustrative example chronicle (medieval flavour — the app's flagship personality), styled the same way a real generated chronicle displays (`.chronicle` block), with a brief nudge into the recording flow below (e.g. "Try it with your own story ↓").

**Not generated through the real pipeline** — written directly, purely for illustration. No AI call, no audio, no new route, no static MP3 file (an earlier version of this design considered baking in a real generated MP3; dropped in favor of text-only, which is simpler and sufficient for the actual goal — showing what the *writing* sounds like).

## Example content

```
Here follows the chronicle of the Siege of the Flatpack Throne, as testified
before this scribe by Marco and Júlia.

On a Saturday eve, the two companions undertook a quest of no small peril:
the assembly of a bookshelf delivered in a box of cardboard, its instructions
rendered in a tongue neither could decipher. Marco, ever bold, seized the
Allen key as a knight seizes his sword and declared the battle begun.

Three hours did the siege endure. Twice was a shelf mounted backward and
twice undone. Júlia, keeper of patience, discovered at the eleventh hour
that an entire bag of fasteners had been overlooked — a revelation that
nearly ended the fellowship there and then. Yet triumph came at last: the
throne stood upright, bearing its full weight of books without complaint,
and the companions toasted their victory with cold pizza, as is tradition
among those who have suffered together.

Let it be remembered: no furniture was harmed beyond repair, and the
friendship, like the bookshelf, held.
```

## Out of scope

- Real pipeline-generated example (considered, dropped — see Approach)
- Audio playback for the example (dropped along with the above)
- Rotating/multiple examples per flavour — one static example is enough for this cycle

## Success criteria

- A visitor sees a representative example chronicle before recording, styled consistently with the real result screen
- No backend, route, or pipeline changes
