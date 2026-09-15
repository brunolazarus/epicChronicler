# LinkedIn Post — A Frontend Standard Built From Two Wrong Attempts

**Date:** 2026-09-10
**Maps to:** No active roadmap — freestanding post (see the companion draft's note on `DEVLOG.md`).
**Status:** Draft
**Previous post:** [2026-06-22-mcp-linkedin-post.md](2026-06-22-mcp-linkedin-post.md)
**Background:** `docs/standards/frontend-architecture-standard.md`, specs at `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` and `2026-08-31-web-styling-tailwind-shadcn-design.md`

---

## Title options

1. The frontend finally has a standard behind it, not a demo bolted onto the API. (recommended)
2. I stopped picking my frontend stack from scratch, project after project.
3. Before I posted about my frontend standard, I checked whether I was actually following it.

---

## Angle

Reframed from the earlier draft: the stack and the reasoning behind each piece are the post now, not the `@theme` bug. The `@theme`/`@theme inline` gotcha survives as one supporting detail, not the hook.

Two threads this version ties together:
1. **The history** — for most of this project, "the frontend" was a static page served directly out of `apps/api` (the Phase 0 test rig). It proved the pipeline worked and was never meant to last, then lasted two months because something else was always more urgent. What replaced it isn't a redesign, it's the first time this project applied a written standard end to end instead of improvising a structure.
2. **The stack + why each piece is there** — pulled straight from `docs/standards/frontend-architecture-standard.md`: Zod as the generated contract (not hand-written), TanStack Query as a Suspense-first Model layer, Tailwind v4 + shadcn for styling, and MVP layering with composition over configuration in the View layer.

The vulnerability beat, replacing the old theme-story-as-hook: before writing this post, the standard got checked against the actual code instead of taken on faith. Composition-over-configuration was already written down — the concrete mechanism for it (compound components) wasn't, and there's a component in the app right now that proves why it should have been: a flat prop list where three of the props only ever get passed together, existing purely to toggle a chunk of markup on or off. Found reviewing the app before posting, not before the fact. The doc got stronger; fixing the component is next, deliberately kept separate from finishing the doc.

---

## Draft

**TLDR:** For most of this project, "the frontend" was a static test rig served straight out of the API. It just got replaced by an actual layered app — and the stack behind it isn't new, it's a standard I wrote down once and carried here from day one. Writing this post meant checking that standard against the real code first, and it caught a real gap.

---

[Previous post → paste link here]

---

For most of this project, there wasn't a frontend. There was a static page, served directly out of the API server, good enough to prove the pipeline worked end to end. It was never meant to survive past that. It survived for two months anyway, because it worked and there was always something more urgent than rebuilding it.

What replaced it isn't a redesign — I didn't start from new screens. I applied a frontend standard I'd already written down, end to end, on a real project for the first time. The stack isn't a set of picks I made for this app:

**Zod, generating the contract instead of hand-writing it.** The backend's schemas produce the OpenAPI spec; the frontend's typed client is generated from that spec, not maintained by hand on trust. Concretely: a job-result field was typed `unknown` for longer than it should've been, every caller casting it with `as` to move on. Closing that gap meant making the schema real on both ends instead of trusting the cast — exactly the kind of drift this pattern exists to catch, and it caught it here too.

**TanStack Query as the Model layer, Suspense-first.** Loading and error states are structural — a boundary per feature section — not `isLoading`/`isError` checks sprinkled through component bodies.

**Tailwind v4 + shadcn for styling**, utility classes only, tokens as CSS custom properties. One real landmine worth a single line: v4's token indirection needs `@theme inline`, not plain `@theme`, or a per-theme color resolves once at load and silently never again. Wrote it into the standard the moment it drew blood.

**MVP layering — View → Presenter → Model, one direction — with composition over configuration in the View layer.** Small, single-purpose components composed together, instead of one component's prop list slowly turning into a config language.

That last one is where this post almost shipped the easy version of itself. Composition-over-configuration has been in the standard since the first draft. What hadn't been written down was the actual mechanism — compound components, shared state via context, parts exposed as a component's own static properties — and I only caught that gap by rereading the standard against the app instead of assuming it before posting about it. There's a component in this codebase right now with ten props, three of which only ever get passed together, existing purely to toggle a strip of markup on or off. That's the exact shape the standard now calls out by name. The doc is stronger for it today; fixing that component is next, on purpose kept separate from finishing the doc.

None of this is about a tool being smart. It's a standard that took two earlier projects to get right, applied here on day one instead of relearned — and checked again, against real code, before I let myself write a post claiming I'd applied it well.

If you want to see where it landed instead of just reading about it: the whole thing is live at epicchronicler.com, no account, no setup. Record a voice memo, pick a flavour, and a medieval chronicler (or three other narrators) tells it back to you. Go poke at it — I'd genuinely like to know what breaks first.

---

_Chronicler — voice stories, AI-narrated legends. Try it at epicchronicler.com_

#frontend #softwareengineering #typescript #tailwindcss #softwarearchitecture #buildinpublic

---

## Notes for editing

- Delete the `---` horizontal rules before pasting into LinkedIn
- The Phase 0 static-test-rig → real layered app contrast is the opening hook now — protect it if trimming
- `@theme`/`@theme inline` is now one supporting paragraph, not the lead — resist the urge to expand it back into the hook
- The compound-components admission is the new vulnerability beat (replacing the old theme-bug-as-hook) — it's stronger because it's about the post's actual subject (the stack + standard), not a side anecdote
- Don't imply the flagged component (10-prop card) has been refactored yet — it hasn't; that's queued as separate follow-up work, referenced here only as "next," not "done"
- Consider a short before/after: the Phase 0 static page vs. the current app, if a screenshot of the old test rig still exists anywhere
- 2026-09-11: added a lighter closing CTA inviting people to actually try the app, right before the tagline — the rest of the post is dense/technical on purpose, so keep this paragraph short and low-effort to read
- Note for a later pass: the compound-component refactor this post references as "next" actually landed in the working tree on 2026-09-11 (RecordRing/NarratorCarousel/ConfirmView/ChronicleView all split), but isn't committed/pushed yet — don't change "next" to "done" in the post until that's actually shipped
