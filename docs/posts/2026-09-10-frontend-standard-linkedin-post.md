# LinkedIn Post — A Frontend Standard Built From Two Wrong Attempts

**Date:** 2026-09-10
**Maps to:** No active roadmap — freestanding post (see the companion draft's note on `DEVLOG.md`).
**Status:** Draft
**Previous post:** [2026-06-22-mcp-linkedin-post.md](2026-06-22-mcp-linkedin-post.md)
**Background:** `docs/standards/frontend-architecture-standard.md`, specs at `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` and `2026-08-31-web-styling-tailwind-shadcn-design.md`

---

## Title options

1. My frontend architecture isn't a preference. It's a standard, written down after getting it wrong twice. (recommended)
2. The frontend decisions I stopped making from scratch
3. One keyword in a CSS file decides whether your whole theming system works

---

## Angle

Different register from the design-tool post: this one is about **accumulated engineering judgment**, not AI workflow. The frontend stack on this project — React, TanStack Query, Zod, Tailwind v4, the Model/Presenter/View split — wasn't picked fresh for this app. It's a standard, written down once, carried between projects, and applied here on day one instead of re-litigated.

The document's own opening line is the thesis: *"This document merges two prior variations of the same underlying pattern into one crystallized standard, with the reconciliation decisions called out explicitly where the sources disagreed."* That's an admission, in writing, that the current shape is what's left after two different projects got parts of it wrong in two different ways.

Lead with the most concrete, verifiable, specific technical detail — the Tailwind v4 `@theme` vs `@theme inline` gotcha — because it's checkable by anyone who knows the tool, and it's the kind of detail that only shows up from actually shipping something with runtime per-tenant/per-theme styling, not from reading docs. Then widen out to the standard's bigger calls: don't share code until a second consumer actually needs it, and generate the contract instead of hand-writing it.

---

## Draft

**TLDR:** The frontend stack on this project wasn't chosen for this project. It's a standard I've refined across real work, written down with the tradeoffs made explicit, and applied here from day one. One example of what that catches: a single keyword in a Tailwind v4 config file that decides whether a whole per-flavour color system actually works, or silently doesn't.

---

[Previous post → paste link here]

---

Here's a bug that will pass every visual check and still be wrong: your app has four color themes, one theme renders correctly (whichever one happened to load first), and the other three just... don't switch. No error. No warning. The CSS looks right if you read it.

The cause, in Tailwind v4: theming through CSS variables needs the color token declared inside `@theme inline`, not plain `@theme`. Plain `@theme` resolves the indirection once, at the root, the moment the page loads — so `background-color: var(--color-accent)` gets baked down to whatever `--accent` was *first*, and redefining `--accent` further down the DOM never re-triggers it. `@theme inline` keeps the reference live, so it re-resolves per element, the way you'd assume it already worked.

That's not a tip I picked up from a blog post. It's in my frontend architecture standard, written down the exact moment it bit me, so the next project starts already knowing it.

That standard exists because I got the same category of decision wrong twice, in two earlier projects, in two different directions — once over-sharing code across apps that didn't actually need it shared, once under-specifying the contract between frontend and backend until they quietly drifted apart. The standard is the reconciliation of both mistakes, written down as rules instead of instincts, so a brand new project doesn't have to relearn either lesson at 11pm.

Two of those rules, both applied here from the first commit:

**Promotion, not preemption.** Don't create a shared package until a second real consumer needs it. This project has one frontend app. There's no `packages/ui`, no shared `packages/core` model layer beyond the one thin exception the standard names explicitly (session auth). Every hook, every primitive lives local to the one app that uses it — not because sharing is bad, but because sharing code nobody's using yet is speculative work with a maintenance cost and zero payoff until app number two shows up.

**Generate the contract, don't hand-write it.** The backend's Zod schemas produce the OpenAPI spec; the frontend's typed API client is generated from that spec. Neither side hand-maintains an interface the other has to trust. Concretely: a job-result type on this project was typed as `unknown` for longer than it should've been, every caller casting it with `as` to get on with things — exactly the kind of gap where a backend field rename would pass typecheck and break in production. Closing it meant making the schema real on both ends instead of trusting the cast. That's the risk this pattern is built to catch, and it caught it here too.

None of this is about a tool being smart. It's the opposite point, actually — the decisions that took years to get right the first two times took an afternoon to apply correctly the third time, because they were already written down.

---

_Chronicler — voice stories, AI-narrated legends. Try it at epicchronicler.com_

#frontend #softwareengineering #typescript #tailwindcss #softwarearchitecture #buildinpublic

---

## Notes for editing

- Delete the `---` horizontal rules before pasting into LinkedIn
- The `@theme` / `@theme inline` opening is the whole hook — don't bury it or explain it away before the reveal
- Consider a two-frame screenshot: same component, one color-mixing correctly across themes and one frozen — if that's easy to reproduce and capture
- "Written down instead of relearned" is the line to protect if trimming for length
- This one skips AI-workflow framing almost entirely on purpose — companion post already owns that angle; keep this one about engineering judgment
