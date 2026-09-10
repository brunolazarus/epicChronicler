# Chronicler — Horizons

This is not a roadmap. `docs/ROADMAP.md` tracks the linear sequence of LinkedIn posts; this file
tracks the **non-linear menu of directions the project itself could take next**, now that the MVP
(single-user web app + MCP server) is built and working. Think of it as a skill tree, not a phase
list — picking one branch doesn't commit to the others, and nothing below is sequenced or scheduled.

Some branches overlap existing material:
- `docs/PRD.md` §2 "Backlog (deprioritized, not abandoned)" already names accounts/groups, the TLDR
  generator, push notifications, and retell-in-a-new-flavour as product features shelved during the
  2026-07-28 direction change. Treat that section as the product-feature backlog; this file is the
  broader strategic menu, including things that aren't features at all (tooling, infra, OSS).
- `docs/ROADMAP.md`'s old Posts 5–11 described a mobile/Expo/Supabase sequence written before that
  same direction change. That sequence is marked superseded there, not deleted — the Expo branch below
  is its optional, no-longer-assumed successor.

Origin: captured 2026-09-10 from a conversation working through "what's next" after the
motion-rebuild branch shipped. Update this file as branches get picked up, dropped, or split further —
it's meant to be edited, not archived.

---

## Tooling & workflow experimentation

**Try new dev-tool setups on a "normal" workflow.** Open Design, OpenCode, the Pi harness, Xiaomi
MiMo — evaluated outside the superpowers/subagent-driven-development scaffolding this project has
otherwise used, to see how they hold up without it. Already has a stub post:
[2026-09-10-tooling-experiments-linkedin-post.md](linkedin/2026-09-10-tooling-experiments-linkedin-post.md).
Open before drafting: one comparison axis across all four, or a mini-series with one concrete task per
tool. Remember to credit Joel and Phil (people consulted for reference on this) — confirm how they'd
want to be credited before publishing.

---

## Product depth

- **Expand planned features.** Needs scoping — `docs/PRD.md` §2's Backlog already names the
  specific shelved items (accounts/groups, TLDR generator, push notifications, retell-in-a-new-flavour,
  contributor cap changes). Start there rather than reopening the list from scratch.
- **New AI providers for flavour — Suno.** Adding music/audio texture as a new dimension of a
  "flavour," not just voice. Needs scoping: background scoring under the narration, a separate
  generated "soundtrack" clip, or something else — decide the shape before touching the provider
  abstraction.
- **Accounts + chronicle history.** Turns the no-login/ephemeral demo into something with retention.
  Overlaps the PRD's own unchecked MVP item ("Users can save and revisit their own past chronicles")
  and directly answers the usage question the MCP post said was still open: do people come back?
- **A public gallery of sample chronicles** (with consent), one per flavour — doubles as a growth
  surface and as embeddable content (audio + transcript comparisons) for future posts.

---

## Platform & distribution

- **The actual mobile app, via Expo.** This was the original plan's Phase 3+; it's no longer assumed
  as the next step, just one option among several. If picked up, it's a full re-scoping against the
  current single-user web architecture, not a resumption of the old mobile-first plan.
- **New front-end surfaces on the same backend.** A Slack bot, a Discord bot, a Raycast extension —
  each nearly free given the existing MCP server + provider abstraction, and each a concrete test of
  the frontend standard's own "promotion, not preemption" principle the moment a second real consumer
  shows up.
- **Extract the provider abstraction as a standalone OSS package.** `packages/core`'s
  transcription/LLM/TTS interfaces are already cleanly bounded per the frontend/monorepo architecture
  standard. Publishing it separately is a different kind of portfolio artifact than a feature.
- **A public, documented API + self-serve key dashboard.** Adjacent to the existing MCP server —
  turns Chronicler into something other builders can build on top of, not just an app plus one
  integration point.

---

## Infrastructure & engineering depth

- **More robust infrastructure / system design.** Needs scoping — what specifically (multi-region,
  IaC, better queue observability, something else). Pair this with the two items below rather than
  treating "infra" as one undifferentiated task.
- **Evals for the AI pipeline.** Not just swapping providers — measuring them: an LLM-as-judge or
  rubric score for chronicle quality per flavour, tracked across model swaps, alongside cost/latency.
  Natural extension of the provider-registry pattern that already exists. Current pick for
  highest-leverage given the project's job-search goal: it's a differentiated skill (real evals work),
  not covered by any other branch here, and the infrastructure for it is one step away already.
- **Observability / production maturity.** Structured logging, per-provider cost tracking, queue-depth
  alerting, a dashboard — the complement to "I built it" is "I proved it holds up." Also the natural
  place to finally close two items sitting in memory as deferred: rate-limiter hardening and the
  error-handling backlog.
- **A real security review.** Formalize the existing privacy story (raw audio deleted post-transcription,
  GDPR-reasoned) into an actual threat model, plus a pass on the MCP server's auth/rate-limiting. Rare
  content in this space — most build-in-public series never touch it.

---

## Open decisions

Nothing above is committed or ordered. Revisit this file when ready to pick a branch — at that point
it becomes a `docs/superpowers/specs/` brainstorm (if architectural) or a scoped addition to
`docs/ROADMAP.md` (if it's really about the next post), not before.
