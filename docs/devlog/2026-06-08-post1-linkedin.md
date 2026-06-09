# LinkedIn Post 1 — Draft

**Date:** 2026-06-08  
**Maps to:** DEVLOG Posts 1–5 (intro + Phase 0 complete)  
**Status:** Draft

---

## Draft

**TLDR:** I'm building a mobile app that turns friend groups' voice stories into AI-narrated chronicles, medieval scribe, sports commentator, fantasy bard, your pick. Documenting every decision in public as I go. This is post kickstarts a serie, follow along if you're curious about AI products, mobile dev, or just want to see how it goes.

---

I've been diving deeper into AI product development and shipping strategies, and I want to document the process here as I go, decisions, tradeoffs, and the things that didn't work.

The project is called **Chronicler**. Friend groups record short voice stories about shared events. AI transcribes them, rewrites them in a chosen style, medieval chronicler, sports commentator, nature documentary narrator, and reads the result back as audio. I'm building it solo and in public.

Before touching any code I wrote a Software Design Document. Not for a team, for me. It forced decisions I would have deferred until they were expensive: who can delete recordings, how long to keep raw audio files, where the narrative style lives in the data model. None of the answers were hard. But without asking the questions upfront I would have shipped the wrong thing on all three.

**The first thing I built was not the app.**

The AI pipeline, voice → transcription → LLM → text-to-speech, is the riskiest part. If it's too slow or too expensive the whole product falls apart. So before spending six weeks on a mobile UI I built a simple web page that drives the full pipeline end to end.

The pipeline works. A few things I found along the way:

- Groq's Whisper endpoint is faster than OpenAI's and free. One-line swap.
- ElevenLabs free tier doesn't allow pre-made voices via API. Landed on Kokoro 82M via OpenRouter, fractions of a cent per narration.
- Provider switching happened twice in the same week, so I built an abstraction layer early. Each capability has an interface; swapping the implementation is one line. Worth it immediately.

**Want to follow along or weigh in?**

I'll keep posting as each phase wraps up. Next: making the pipeline callable from any AI assistant — voice in, narrated chronicle out, no app required. If you've built AI products and have opinions on provider choices, queue architecture, or prompt design I'd genuinely love to hear them.

---

_Chronicler — a mobile app for friend groups to record and relive shared memories through AI-narrated stories._

Code is public: https://github.com/brunolazarus/epicChronicler

#buildinpublic #AI #aiproducts #typescript #nodejs #mobiledev #expo #cloudflare #openrouter #softwareengineering #systemdesign

---

## Notes for editing

- **Horizontal rules (`---`):** these are markdown separators used in this file to organise sections — delete them before pasting into LinkedIn, they'll show up as literal dashes
- Bold text renders on LinkedIn
- Keep paragraphs short — LinkedIn truncates at ~3 lines before "see more"
- The hook ("first thing I built was not the app") should be the first visible line after the TLDR
- Consider adding one screenshot of the test rig UI — visual content gets more reach
- Tagging @Hono, @Cloudflare, @OpenRouter in the post (not just hashtags) can get reshares from their accounts
