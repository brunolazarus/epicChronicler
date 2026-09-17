# LinkedIn Post — The Frontend as a Seed

Working on the frontend of Epic Chronicler has had me thinking about frontend architecture.

I keep coming back to the idea of a crystal seed, and to what that means as AI-assisted development moves more of the implementation and technical decision-making away from the engineer.

After enough years working on frontend systems, you accumulate a lot of opinions. Not just about which tools you like, but about how they should fit together, where complexity tends to show up, and which shortcuts tend to come back later. Eventually, some of those opinions stop being opinions and become standards.

A well-placed seed carries structure into every layer that forms after it. It doesn't guarantee a perfect crystal — growth still answers to pressure, heat, and whatever it's actually exposed to. What it gives you is direction instead of chaos.

That maps closely to some ideas I've liked in Neal Ford's writing on evolutionary architecture, published alongside Martin Fowler's own work in his Signature Series: architecture isn't just a description of what a system looks like today; it needs to support the system as it changes.

There's also Fowler's own Design Stamina Hypothesis — the idea that investing in design and structure early can reduce the cost of change later. That's a big part of what these standards are trying to do: make the next change easier, not just make today's code cleaner.

And then there's fitness functions, another piece of Ford's thinking. Instead of assuming an architectural decision was correct once and leaving it alone, you establish ways to continuously check whether the system is still exhibiting the properties you care about.

That's basically how I want this project to work.

The standards came from previous projects. This project is where they get tested. Some decisions will hold, some will change, and some will become more precise as the system grows.

I think that's one of the less obvious benefits of experience in software engineering. A lot of it isn't knowing more things. It's knowing which things are worth carrying forward.

And I think that matters even more with AI-assisted development.

The more AI takes on implementation, the further we can get from the individual pieces of code — and from some of the technical decisions being made along the way. That's incredibly powerful, but it also changes where architectural judgment lives.

That's where I think a good seed matters.

The standards, boundaries and patterns become a kind of structural memory for the project. They give AI somewhere to grow from, and they give the output something to grow around.

You can copy the stack. You can copy the patterns. You can copy the document. You don't automatically get the years of feedback that made those things worth standardizing.

As AI takes on more implementation, the seed becomes more important, not less. The more distance there is between the engineer and individual technical decisions, the more those decisions need something consistent to grow around.

That's the foundation I'm taking into the next phase of Epic Chronicler: AI-assisted development built on a backbone that already knows how to grow.

---

**Status:** Draft, content settled. Went through several rounds with Claude on the opening: the original "I've been thinking about the frontend... a little differently lately" opener was rejected as weak/try-hard, then two Claude-suggested crystal-growth openers were rejected for reading as crafted LinkedIn aphorisms. Bruno's own two-line preview opener ("Working on the frontend... has had me thinking about frontend architecture. / I keep coming back to the idea of a crystal seed...") is what's live now — Claude flagged it as its own mild throat-clear risk, Bruno disagreed and kept it; not revisiting that call again unless asked. Everything from "After enough years working on frontend systems" onward, including the closing, is Bruno's own full rewrite — the Fowler/Ford citations were corrected 2026-09-15 (see below), rest is untouched.
**Previous post:** [2026-09-10-frontend-standard-linkedin-post.md](2026-09-10-frontend-standard-linkedin-post.md) (Post 5) — this is a shorter, faster-turnaround expansion of it, not a new topic.
**Next post:** [2026-09-10-claude-design-linkedin-post.md](2026-09-10-claude-design-linkedin-post.md) (Post 6) — the earlier conflict (both posts ending on the identical "AI is coming next" tease) is resolved: this post now closes on its own self-contained claim instead of a cliffhanger, so publish order relative to Post 6 is no longer constrained.

**Other notes:**

- Citation fixed 2026-09-15: evolutionary architecture and fitness functions are Neal Ford's terms (*Building Evolutionary Architectures*, with Rebecca Parsons and Patrick Kua, O'Reilly), not Martin Fowler's — the post previously credited all three ideas to Fowler. Fowler is still mentioned, accurately: the book is published in his Signature Series, and the Design Stamina Hypothesis right after it genuinely is his own (2007 bliki post).
- "Frontend" spelled as one word throughout — line 3 briefly drifted to "front end" (two words) and was corrected to match the rest of the post.
- No hashtags drafted yet.
