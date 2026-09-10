# LinkedIn Post — Solo, Design-to-Ship, with a Different AI Tool at Each Handoff

**Date:** 2026-09-10
**Maps to:** No active roadmap — `docs/devlog/DEVLOG.md`'s original 14-post plan was deleted 2026-07-30 when the project pivoted from the mobile/Expo build to the current web app. Freestanding post.
**Status:** Draft
**Previous post:** [2026-06-22-mcp-linkedin-post.md](2026-06-22-mcp-linkedin-post.md)
**Background:** `docs/standards/design_handoff_epic_chronicler/` (Claude Design exports, gitignored — not in the repo), specs at `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` and `2026-09-04-web-frontend-motion-design.md`, plan at `docs/superpowers/plans/2026-09-08-web-frontend-motion-rebuild.md`

**⚠️ Before publishing:** this post describes work merged to `main` locally but **not yet pushed or deployed** (`main` is 20 commits ahead of `origin/main` as of this draft). Either push + deploy first, or soften the ending so it doesn't imply this is live on epicchronicler.com. Don't let this go out implying something's shipped that isn't.

---

## Title options

1. I used three different AI tools for three different jobs — here's the handoff between them (recommended)
2. Solo doesn't mean one tool. It means picking the right one for each decision.
3. I stopped arguing with myself about a UI decision and just looked at it instead.

---

## Angle

Not a tool review. The subject is **how a one-person team actually works end to end with AI at every stage** — and the thing that makes it work isn't any single tool being impressive, it's knowing which *kind* of decision you're making and reaching for the tool built for that kind, then handing off a real artifact (not a vibe) to the next stage.

Concretely, three different modes, three different tools, one continuous pipeline:
- **Visual/spatial decision** → Claude Design (a canvas tool — sketch and compare layouts, not describe them in prose)
- **Verbal/logical decision** (what does this actually need to do, what's in scope, what's the implementation plan) → Claude Code's spec/plan workflow
- **Execution + verification** → Claude Code again, but in a completely different mode — fresh, disposable subagents per task, each one reviewed before the next starts

The concrete story: a real UX problem (the app's pipeline steps felt like separate pages, not one flow), a design instinct that had a hidden flaw, a visual prototyping pass that resolved it, and then a fully speced, task-by-task, reviewed implementation that shipped a genuinely non-trivial piece of interaction design (one UI element that persists and morphs across every stage of the flow, instead of getting torn down and rebuilt).

---

## Draft

**TLDR:** Solo project, AI-assisted at every stage — but not the same tool for every stage. Design exploration, spec writing, and code execution are three different kinds of work, and I learned to stop trying to make one tool do all three. Here's what that pipeline actually looks like, end to end.

---

[Previous post → paste link here]

---

I almost shipped a UI idea that would have broken the first time someone hit restart.

The app moves through four steps — record, review the transcript, wait while it's processed, read the result. Each one *worked*. But moving between them felt like clicking to a new page, not advancing through one flow. My first instinct was a continuous-scroll pattern — scroll down, the next step appears. Felt right in my head, right up until I tried to describe it precisely enough to build it: the flow is cyclic, there's a restart button that sends you back to step one, and scroll-down-only has no way to "un-scroll" to a step that isn't there yet. The idea was broken and I only caught it by trying to spec it out loud.

That's a spatial problem, not a verbal one — the kind you resolve faster by looking at options than by describing them in a doc. So I opened Claude Design and laid the options out as actual screens, side by side. Two short sessions a few weeks apart: one for the overall visual language, one later specifically for how the ring/marker element should travel and morph between steps.

The visual answer isn't the deliverable, though. It's an input: a written spec — what's actually in scope, what the design assumes that my backend doesn't have yet (it confidently designed a retry flow and a re-narrate feature I can't actually build today), what stays and what gets simplified. Reconciling that is on me, not the tool. That spec became a task-by-task implementation plan: 13 tasks, each handed to a fresh AI subagent with only the context it needed for that one task, reviewed against the spec before the next one started. A final pass reviewed the whole branch together and caught four real issues — a marker overlapping error text, a card overflowing the viewport, a stale error notice unmounting an active recording mid-take — fixed and re-reviewed, all before I touched a line of it myself.

Three different kinds of decisions, three different tools, and the thing that actually made it work was the handoff between them: a screenshot doesn't survive a handoff to a coding session, a written spec does.

Still local, not deployed yet — writing this up before it ships, not after, because the decisions were the interesting part either way.

---

_Chronicler — voice stories, AI-narrated legends. Try it at epicchronicler.com_

#buildinpublic #solodev #AI #softwareengineering #productengineering #typescript

---

## Notes for editing

- Delete the `---` horizontal rules before pasting into LinkedIn
- Confirm push/deploy status before publishing — see the warning at the top of this file
- The restart-breaks-scroll catch is the sharpest beat — it shows real diagnosis, not just tool use; don't cut it
- Consider a side-by-side screenshot from the Claude Design canvas next to the shipped UI, if the design-handoff files can be exported to images (they're gitignored HTML, not committed)
- 2026-09-10 revision: cut the closing "lesson" paragraph and the tips bullets — they read as generic AI-workflow advice rather than this project's own voice. Moved the retry-flow/re-narrate reconciliation detail inline as evidence instead of restating it as an abstract tip. Kept the ending tight on the tool-handoff point instead of a takeaways list.
