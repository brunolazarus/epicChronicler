# LinkedIn Post 2 — MCP Server & Getting to Users Fast

**Date:** 2026-06-22
**Maps to:** DEVLOG 2026-06-09 (MCP server — decisions, Smithery pivot, two surfaces)
**Status:** Draft
**Previous post:** [paste link here]

---

## Title options

1. I skipped the backend. ← (recommended — provocative, earns the read)
2. The most expensive thing you can build is something nobody uses.
3. I had a full backend planned. I shipped something people could try instead.

---

## Angle

Product engineer mindset: the most expensive thing you can build is something nobody uses. Instead of the planned backend (auth, groups, 22 endpoints — all testable only via Postman), we shipped two surfaces that put the core experience in front of real people immediately.

The goal isn't just "ship faster." It's to generate signal. Do people share the output? Do they come back? Which flavour lands? The backend can't answer those questions. Usage can.

---

## Draft

**TLDR:** I skipped the full backend to get the product on users' hands first. Built a web demo anyone can try in 30 seconds, and an MCP server developers can add to Claude or Cursor in one command. This post is about that decision and what I'm trying to learn from it.

---

[Previous post → paste link here]

---

The original plan had a full backend next — auth, groups, recordings, 22 API endpoints.

I skipped it.

As a product engineer, the most expensive thing you can build is something nobody uses. The most valuable thing you can do early is get the product in front of people and learn.

So instead of a backend that lives in Postman, I built two things people could actually try.

**A web demo.** Open epicchronicler.com, hit record, pick a style, hear your story retold as a medieval chronicle or a sports commentator's breakdown. 30 seconds. No account. No setup.

**An MCP server.** For developers: one command in Claude or Cursor and the Chronicler pipeline is callable from inside any AI workflow. Voice in, narrated chronicle out, no app required.

Neither needed the full product. Both put the core experience — voice story in, AI-narrated legend out — in someone's hands today, while the backend waits for the right moment.

The question I was really answering wasn't "what's next on the roadmap?" It was: what's the fastest path to real feedback?

**One decision worth unpacking.**

Halfway through, I had a plan to distribute the MCP server through Smithery — an MCP registry, think npm but for AI tools. Built the OAuth flow, got it working. Then realised their model required users to bring their own API keys. Two accounts required before seeing the product. Wrong funnel.

Cut it. The web demo became the primary surface. Knowing what to stop building matters as much as knowing what to build.

**What I'm listening for now:**

Do people share the output? Do they try more than once? Which narrative style gets the strongest reaction? These questions only usage can answer — not a design doc, not a Postman collection.

The backend comes next. But it'll be built knowing what people actually do with this, not what I assumed they would.

---

_Chronicler — voice stories, AI-narrated legends. Try it at epicchronicler.com_

_Developer? Add Chronicler to Claude or Cursor as an MCP server — link in comments._

#buildinpublic #AI #productengineering #softwareengineering #typescript #mcp #aiproducts

---

## Link in comments (paste as first comment after posting)

```
Add Chronicler to Claude CLI:

claude mcp add --transport http chronicler "https://epicchronicler-production.up.railway.app/mcp" \
  --header "Authorization: Bearer <your-key>"

API key → DM me. I'll generate one for you, takes 30 seconds.
```

---

## Notes for editing

- Delete the `---` horizontal rules before pasting into LinkedIn
- Bold renders on LinkedIn — keep it
- Post the MCP comment immediately after publishing so it appears first
- Consider a screenshot of the web demo — visual content gets more reach
- "Knowing what to stop building" is the sharpest line — don't cut it if you trim
- Tag @Anthropic or @OpenRouter for reshare potential
