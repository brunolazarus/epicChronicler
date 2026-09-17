# LinkedIn Post — A Frontend Standard Built From Two Wrong Attempts

**Date:** 2026-09-10 (drafted) / 2026-09-15 (finalized)
**Maps to:** No active roadmap — freestanding post (see the companion draft's note on `DEVLOG.md`).
**Status:** Ready to publish
**Previous posts (live thread):** [the cost breakdown](https://www.linkedin.com/feed/update/urn:li:activity:7487658303137755136/) (Post 3, most recent) and [skipping the backend](https://www.linkedin.com/feed/update/urn:li:activity:7474900425901801472/) (Post 2, the MCP pivot)
**Next post:** [2026-09-10-claude-design-linkedin-post.md](2026-09-10-claude-design-linkedin-post.md) — this post's closing line ("I'm about to introduce a pretty different kind of input... AI design tools") is a direct teaser into it. Keep that continuity when both are live.
**Background:** `docs/standards/frontend-architecture-standard.md`, specs at `docs/superpowers/specs/2026-07-30-web-frontend-rebuild-design.md` and `2026-08-31-web-styling-tailwind-shadcn-design.md`

---

## Title / hook

Opening line doubles as the hook, no separate title needed: **"Time to hit the frontend hard."**

---

## Angle (final)

Reframed twice from the original draft. First pass led with the `@theme`/`@theme inline` bug as the hook. Second pass replaced that with a compound-components self-audit as the vulnerability beat. This final version drops both technical-landmine anecdotes entirely and leads with a different, stronger frame: **the standard isn't a finished artifact, it's a hypothesis this project is actively pressure-testing.** Does it hold as the product gets more complex? Which decisions keep proving themselves, which need to get more precise? That question is the post's actual spine, not any one bug.

Consequences of this reframe:

- No longer references the compound-component gap or `NoticeCard`-shaped anti-pattern at all — so the earlier caution about not overclaiming "fixed" vs. "next" no longer applies to this draft. Whatever state that refactor is in doesn't gate this post.
- Ends with an explicit, deliberate teaser into Post 6 ("a pretty different kind of input... AI design tools... that's next") — the two posts are now sequenced as a pair, not independent. Publish them in order, ideally close together, so the teaser doesn't sit stale.
- Closing CTA carried over in spirit from the earlier "go poke at it" addition, now in the user's own voice ("Go break it. I'd like to know what happens.").

---

## Draft (final, as written by Bruno 2026-09-15)

Time to hit the frontend hard.

Been a minute since [skipping the backend](https://www.linkedin.com/feed/update/urn:li:activity:7474900425901801472/) and [the cost breakdown](https://www.linkedin.com/feed/update/urn:li:activity:7487658303137755136/). This one's about the frontend, finally.

For most of this project, there barely was a frontend. There was a static page served directly from the API, and that was enough for what I needed at the time: proving the pipeline worked end to end. It was never meant to become the real frontend. It lasted two months anyway.

When it was finally time to build the real thing, I didn't want to start by picking a stack. I wanted years of frontend experience, turned into a set of standards, to become the seed of a new project.

The stack is opinionated:

**Zod + generated contracts** — backend schemas produce the OpenAPI spec, and the frontend client is generated from it instead of maintained by hand.

**TanStack Query + Suspense** — data belongs in the Model layer, with loading and error handling handled at feature boundaries.

**Tailwind v4 + shadcn** — utility-first styling, reusable primitives, and tokens represented as CSS variables.

**MVP: View → Presenter → Model** — one direction, clear responsibilities, and composition over configuration in the View layer.

None of this came from a decision made specifically for Epic Chronicler. These are practices that survived years of projects, refactors, bugs and mistakes. At some point, they stopped being things I was experimenting with and became things I wanted to carry forward.

But writing down a standard is the easy part. The real test is what happens after you put it into a real project — it makes the code easier to grow, it holds up as the product gets more complicated, and the decisions keep proving themselves, sharper with every iteration. That's what this project is proving out.

I don't want the standard to be a frozen document sitting in a repo. I want the project to put pressure on it, and for that pressure to make it better. So the frontend isn't just built with years of experience behind it, it's becoming the next place that experience gets tested, refined, and turned into something worth carrying forward.

Now that the foundation is there, I'm bringing in a different kind of input: AI design tools, layered onto a frontend backbone built on standards battle-tested over years. Those standards aren't just there to keep the code tidy, they give the process direction and the project a strong base to grow on. That base is what lets AI push the development process further, without compromising it.

For now, the result is live at **epicchronicler.com**. No account, no setup. Record a voice memo, pick a narrator, and hear your story retold as a legend.

Go break it. I'd like to know what happens.

#frontend #softwareengineering #typescript #tailwindcss #softwarearchitecture #buildinpublic

---

## Notes for editing

- This is the version to publish as-is — verified against the actual codebase (Phase 0 test rig history, the four stack claims, the live flavour picker) on 2026-09-15, nothing found to correct.
- Earlier drafts (the `@theme` bug hook, then the compound-components vulnerability beat) are superseded — kept only in this file's git history if ever worth revisiting for a different post.
- Publish this one before or close to Post 6, since its closing line explicitly teases it — a long gap between them weakens that continuity.
- No previous-post link pasted in yet — fill in before publishing.
