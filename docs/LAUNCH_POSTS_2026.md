# NAC3 launch posts -- drafts (v4.0: v2.3 stable, voice-ads-first)

**Released version at launch:**
- **NAC3 v2.3.0** -- stable, current release. The everyday
  contract: 5 HTML attributes + click/fill/tab/select verbs
  (carried over from v2.2) + new payload-bearing actions
  (`NAC.invoke` + `NAC.utter`) + open Shadow DOM resolution +
  closed Shadow DOM voluntary exposure API +
  auth-aware `requires_capability` gate + strict validation by
  default. Three reference adopters: Atlas Pro voice ad
  (production), React demo, Angular demo. Live multi-language
  E2E verified across en/es/zh on 2026-05-13.

**Target launch date:** TBD (after Atlas Pro voice ad videos done + key rotation + GitHub org transfer).
**Time-of-day:** 9:00 AM US East (peak HN traffic).
**Coordinate:** HN -> X 30min -> LinkedIn same time -> Reddit 2hr after -> dev.to/Hashnode day +1 -> Discord cross-posts after HN tracks.

**Primary use cases at launch (Pablo locked 2026-05-12, in priority order):**

1. **Voice ads that listen + close sales** -- a new ad category. Atlas Pro is the live reference: visitor speaks, agent fills the order form against a NAC3 manifest, lead lands in CRM in <3 seconds, ten languages. Three demo videos (EN/ES/ZH) embedded in landing.
2. **Voice as input medium for humans, universally** -- hands-busy, eyes-busy, non-typers, kids, elderly, factories. The web becomes voice-operable without per-site Alexa Skill code.
3. **Accessibility as first-class citizen** -- the screen reader IS a NAC3 agent. No "accessible version" parallel UI.
4. **Multilingual without rewrites** -- payloads are locale-independent; the page accepts intent in any of the 10 supported locales without re-templating the UI.

**Secondary (cascade) capabilities:**

5. Asynchronous agents acting on behalf of humans (Forge/Pilot, Q3 2026 roadmap).
6. RPA + E2E test runners without screen-scraping.
7. **Agent-to-agent commerce** -- the "wow" demo: two AI agents (one buyer = Claude Opus injecting `@nac3/runtime@2.3.0` from npm, one seller = Atlas Pro's own backend) transacting a purchase end-to-end via voice, in three languages, with no clicks. **Recorded and embedded as headline showcase** -- but it is the N-th derivative of (1)-(4), not the tesis.

**Editorial principles (v3, locked 2026-05-11; refined 2026-05-12):**

1. **Voice ad is the hook, not the product.** The Atlas Pro demo is the
   most visceral proof of NAC3 -- so we lead with it. But every post
   pivots within 60 seconds to the bigger story: NAC3 lets agents,
   voice runners, RPA bots, screen readers, Playwright specs drive
   ANY web UI. The ad is one of many use cases, not THE use case.
2. **Captain Picard stays.** The sci-fi anchor is what makes the
   abstract case concrete. The captain talks, the ship executes,
   because they share a contract. NAC3 is that contract for web UIs.
   Keep the reference -- it lands in every audience that grew up on
   Star Trek (which is most of HN and LinkedIn).
3. **Demo first, primer within 60 seconds, breadth within 90.**
   Code shows up by paragraph 3-4. Use cases beyond the ad show up
   by paragraph 4-5: meeting schedulers, ERP forms, dashboards,
   accessibility, RPA. HN crucifies narrow demos pretending to be
   standards.
4. **No false claims.** No "8 months in production", "extensively
   tested", "battle tested", customer numbers, third-party traction.
   Only verifiable: tests pass, code open, demos live, npm published,
   Apache 2.0.
5. **No social proof apologetics.** This is a disruptive standard, not
   a startup looking for validation. The visionaries will join. We
   do not chase the late adopters.
6. **Accessibility as side effect.** One paragraph, framed as "we did
   not design for this but it falls out for free."
7. **Tone: invitation, not announcement.** Last paragraph asks the
   reader to adopt, fork, improve.
8. **Yujin as company, NAC3 as product.** Yujin is the company
   shipping frontier tech. NAC3 is the first open-source release.
   Forge / Pilot are teased only as "what's next".
9. **Voice ads are the commercial play, not "AI demos."** (2026-05-12.)
   Atlas Pro is the productized first-customer case. The agent-to-
   agent transaction video is showcase-grade but the wedge for
   monetization is replacing low-CTR display advertising with
   high-conversion voice conversations. Lead every channel with
   the voice-ad use case, NOT with "two AIs talking to each other"
   (that lands as gimmick to non-technical readers).
10. **v2.3 is the product.** (2026-05-13.) Stable cut shipped.
    Payload-bearing actions (`NAC.invoke`, `NAC.utter`), Shadow
    DOM open + closed exposure, auth-aware capabilities, strict
    validation by default. Three reference adopters (Atlas Pro
    + React + Angular). Multi-language E2E verified live across
    en/es/zh. No "preview" or "alpha" framing in any post.

---

## 1. Show HN

### Title (max 80 chars)

```
Show HN: NAC3 -- 80 lines of HTML to make a UI driveable by humans and AI
```

Alternatives if "AI" feels overdone the day-of:

```
Show HN: NAC3 -- a contract between web UIs and the things that drive them
Show HN: An ad that closes the sale itself -- and the open standard behind it
```

### Body

```
NAC3 is an open standard (Apache 2.0) that puts humans and AI on
equal footing on the same web surfaces. Five HTML attributes. The
button a human clicks is the same button an agent, a voice
runner, a screen reader, an RPA bot, or a Playwright spec calls
by name -- one contract, five callers.

Why this primitive was missing:

Human communication is rich, layered, ambiguous. Frontends were
built to absorb that ambiguity -- and inherited it. Every label,
every tooltip, every form field is interpretable five different
ways. We rely on context and intuition to disambiguate; the
system does not help us, we help the system.

That is the structural reason bots, autotests, AI agents, and
code-writing LLMs are great at backends and bad at frontends.
Backends got explicit contracts decades ago: schemas, types,
REST, GraphQL. A non-human can reason about an API without
guessing. Frontends never got that treatment. The "schema" of a
button today is that it says "Save" in 14px gray, three divs
deep.

NAC3 closes that gap. Think of what Captain Picard's interface
has that ours does not: a contract between the operator and the
ship, on shared ground. "Warp speed" works not because of voice
magic, but because the ship's surface is contractually
addressable. NAC3 is that surface for web UIs.

The whole spec is five HTML attributes:

  <button data-nac-id="invoice.save"
          data-nac-role="action"
          data-nac-action="save">Save</button>

  // Any caller, any locale, any device:
  await NAC.click('invoice.save')
  // emits 'nac:action:succeeded' when the side effect completes.

About 80 lines of HTML attributes for a non-trivial app. A human
clicks it. An LLM calls it by name. A screen reader announces it.
A Playwright spec dispatches it. An RPA bot automates it. They
all see the same surface.

Concrete proof, an ad that closes its own sale:

  https://yujin.app -- video embed at the top
  https://yujin.app/nac-spec/ads-demo/atlas-pro/ -- live demo

Atlas Pro running shoes. Visitor speaks. The agent listens in any
of 10 languages, fills the order form against a NAC3 manifest,
submits the lead to the seller's CRM in under three seconds.
Zero typing, zero clicking.

Three recorded conversations (different agents driving the same
NAC3 surface, three languages, all unedited):

  https://yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4   1:55 -- English
  https://yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4   2:21 -- Spanish (rioplatense)
  https://yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4   1:57 -- Mandarin

The buyer is Claude Opus 4.7 injected as an external agent that
imports @nac3/runtime@2.3.0 from npm and drives the page via
NAC.utter (v2.3, new in this release -- see below). The seller's
brain is Atlas Pro's own backend. Two LLMs negotiate a purchase
through the NAC3 contract -- different vendors, different
prompts, one protocol. Voice ad is the wedge; agent-to-agent
commerce is the cascade.

v2.3 ships today as the **stable** release. It adds:

  await NAC.utter('atlas_pro_ad.mic', { text: 'size 42 in midnight' })
  // host listens for nac:action:requested, processes the payload
  // with whatever logic it wants (its own LLM, regex, lookup table)
  // emits nac:action:succeeded echoing the request_id back.

  // Generic version is NAC.invoke(id, payload). 'utter' is just
  // the first concrete adopter. The same primitive carries search
  // queries, file uploads, image/video analysis requests, schedule
  // dates -- anything the host declares an interest in receiving.

The voice ad is the most visceral commercial demo -- a new
ad format where the agent talks the visitor into the purchase
without the visitor ever typing. But the same five attributes
unlock the broader voice-first web for any human:

  - Hands-busy: kitchen, car, factory floor, gym, surgery,
    field service. The web becomes a microphone away.
  - Eyes-busy: drivers, line cooks, electricians up a ladder.
    No glance at the screen required.
  - Non-typers: kids who can't keyboard yet, elderly with
    arthritis, low-literacy users in emerging markets, anyone
    in a language whose keyboard layout is awkward.
  - Accessibility: blind users via screen reader, motor-impaired
    users via switch-controlled agent. Same web page, same
    contract, no parallel "accessible version."
  - Multilingual: the visitor speaks Hindi, the page accepts
    structured intent in any of the 10 supported locales without
    re-templating the UI.

And in the cascade, the same surface is also operable by:

  - An LLM tool-call from a chat product -- "book me the
    nearest slot," and the agent flips the calendar.
  - An RPA bot -- the daily reconciliation runs without a
    seat license per worker.
  - A Playwright spec -- the E2E test calls the same names
    the screen reader announces.
  - A second AI agent -- which is what the three demo videos
    above prove end-to-end.

If a human can click it, a non-human can call it. Same protocol.

Five attributes total:

  data-nac-id        stable id, the only thing callers reference
  data-nac-role      action | field | region | event
  data-nac-action    save | submit | listen | open | ...
  data-nac-plugin    compose multi-tenant surfaces
  data-nac-context   locale, identity, anything contextual

Apache 2.0. The runtime (~20kb gzipped) is on npm as @nac3/runtime,
zero deps. The runtime is optional -- the attributes ARE the
standard. Server-rendered HTML with the attributes is conformant.

Examples in the repo: React, Angular, server-rendered PHP, vanilla
JS, static page. Adoption guides for each.

Three reasons we built it:

  1. Web UIs are about to be driven by more than humans, at scale.
     The contract our UIs ship today still assumes a human in
     front of a screen. That does not scale to the world coming.
  2. Five primitives are enough for 99% of UI interaction. We
     tried larger surfaces. They collapse to these five.
  3. The standard belongs to nobody. We work at Yujin and publish
     it; if anyone wants to fork it, run a counter-implementation,
     improve it -- please. Standards win by adoption, not by
     control.

Accessibility falls out for free. The same attributes that let an
agent dispatch a save button let a screen reader announce it
correctly with no extra ARIA. We did not design for this. It
emerges.

Try the demo, read the spec, install the runtime:

  yujin.app                                  -- company + landing
  yujin.app/nac-spec                         -- spec + adoption guides
  yujin.app/nac-spec/ads-demo/atlas-pro/     -- voice ad demo
  npm i @nac3/runtime                        -- runtime
  github.com/yujinapp/nac-spec               -- source + governance
  discord.gg/FH3xEmGm                           -- community

Fork it, break it, improve it. AMA in the comments.
```
https://hn.algolia.com/?query=Show%20HN%3A%20NAC3%20%E2%80%93%2080%20lines%20of%20HTML%20to%20make%20a%20UI%20driveable%20by%20humans%20and%20AI&type=story&dateRange=all&sort=byDate&storyText=false&prefix&page=0
### Pre-emptive reply drafts (top expected HN objections)

**"This is just ARIA / WAI-ARIA repackaged."**

> Fair question. ARIA tells assistive tech what an element IS.
> NAC3 declares what it ACCEPTS and what it EMITS. Different layer.
> A button can have aria-label="Save invoice" and zero way to be
> dispatched programmatically without scraping. NAC3 gives it a
> stable id and a verb contract. The two stack: NAC3 + ARIA, not
> NAC3 vs ARIA. (And yes, the same attributes feed the screen
> reader -- which is the accessibility win that falls out for free.)

**"Why not just use OpenAI function calling / OpenAPI / GraphQL?"**

> Those describe backends. NAC3 describes the UI surface itself --
> the buttons, the fields, the events. An LLM with NAC3 does not
> need a backend at all to interact with your app; it interacts
> with the same elements a human does. That's the point. It also
> means the same NAC3 contract works for screen readers, RPA bots,
> and Playwright -- none of which speak function-calling.

**"Won't this fragment? Everyone will define their own attributes."**

> The whole spec is five attributes. There's no Turing-complete
> extension point. Companies can add their own values (action
> types, role names) via the registry pattern, but the surface
> stays five attributes. Hard to fragment a surface that small.

**"What happens when the agent gets it wrong?"**

> NAC3 ships three guard rails: actions are typed (a `submit` can
> only be dispatched against an element that declared
> `data-nac-action="submit"`); state events are emitted
> synchronously so the caller knows if the side effect completed
> or failed; and the runtime exposes a dry-run mode for testing.
> The Atlas Pro voice ad shows this end to end: the LLM proposes
> a click, the runtime dispatches it, the form validates, the
> result fires `nac:action:succeeded` -- which the agent reads
> back to the visitor.

**"Show me a real adopter."**

> Live demos run from the landing. The runtime is on npm. Eight
> reference examples (React, Angular, server-rendered PHP, vanilla,
> data-tables, cross-page interop, voice ad, editor widget) ship
> with the repo and are live at yujin.app/nac-spec/. If those are
> not enough proof, the standard is not for you yet. Come back in
> six months. Or, better, fork the demos and become the first
> non-trivial adopter on the registry.

**"Voice in browsers is unreliable."**

> Correct. That's why the Atlas Pro demo doesn't rely on Chrome's
> webkitSpeechRecognition for the production path -- it uses
> MediaRecorder to capture audio and a thin server proxy to
> Google Cloud Speech-to-Text. The webkit path is the fallback.
> All client code is in the repo. Both paths are open. But that's
> not what NAC3 itself is about -- voice is one of many callers.
> NAC3 also works fine when the caller is text-based (an LLM
> tool-call), Playwright, or a screen reader.

**"What's the business model?"**

> The standard is free. Yujin (the company shipping it) is
> working on developer tools, distribution, and a registry --
> announced separately when ready. We are not chasing adopters
> by gating the protocol. Adoption wins.

---

## 2. Twitter/X thread (12 tweets)

**Tweet 1 -- the video:**

```
This ad closes the sale by voice.

The visitor speaks. The agent fills the form, validates the
order, drops the lead in the seller's CRM. Zero typing.

Three seconds.

[video: atlas-pro-en.mp4]

You're seeing the first public demo of NAC3, an open standard.
(1/12)
```

**Tweet 2 -- the bigger frame:**

```
But the ad is just the smallest demo.

NAC3 is what Captain Picard's interface has and ours does not:
a contract between the operator and the machine, on shared
ground.

Say "warp speed", the ship executes -- not because of voice
magic, but because the ship's surface is contractually
addressable. (2/12)
```

**Tweet 3 -- the code:**

```
The entire spec is five HTML attributes:

  <button data-nac-id="invoice.save"
          data-nac-role="action"
          data-nac-action="save">Save</button>

Any caller -- human, LLM, screen reader, RPA bot, Playwright
spec -- sees the same button.

  await NAC.click('invoice.save')

Apache 2.0. Eighty lines for a non-trivial app. (3/12)
```

**Tweet 4 -- the same primitive at other scales:**

```
Voice ads are the commercial wedge. The same five attributes
unlock voice-first web for any human:

- Hands-busy: cars, kitchens, factories
- Eyes-busy: drivers, line cooks, climbers
- Non-typers: kids, elderly, low-literacy
- Accessibility: screen reader = NAC3 agent
- Multilingual: payload-level, not template-level

If a human can click it, a non-human can call it. (4/12)
```

**Tweet 5 -- accessibility:**

```
We did not design for screen readers.

But every NAC3-declared element exposes what it accepts and
what it emits -- which is exactly what a screen reader needs
to announce it. Same primitive.

Accessibility falls out of the protocol for free. Two birds,
one declarative pass. (5/12)
```

**Tweet 6 -- RPA + Playwright:**

```
The same surface that an LLM tool-calls is the surface that
a Playwright spec exercises, that an RPA bot automates, that
a screen reader reads.

One contract. Five callers. No SDK per caller.

The era of brittle CSS selectors and screenshot-OCR is
ending. (6/12)
```

**Tweet 7 -- the philosophy:**

```
NAC3 in one line: humans and AI on equal footing, same web
surfaces.

Why this primitive was missing: frontends inherited the
ambiguity of human language. Backends got explicit contracts
decades ago -- schemas, types, REST. A bot can reason about an
API without guessing. Frontends never did.

NAC3 ends the guessing. (7/12)
```

**Tweet 8 -- the surface:**

```
Five attributes:

  data-nac-id        stable id
  data-nac-role      action | field | region | event
  data-nac-action    verb (save, submit, listen, ...)
  data-nac-plugin    compose surfaces
  data-nac-context   locale, identity

That is the standard. No Turing-complete extension point.
Hard to fragment a surface that small. (8/12)
```

**Tweet 9 -- where to start + the agent-to-agent cascade:**

```
The wow cascade: two AI agents transacting a purchase by voice,
end-to-end, three languages, no clicks.

EN:  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4 (1:55)
ES:  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4 (2:21)
ZH:  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4 (1:57)

Runtime: npm i @nac3/runtime
Spec: yujin.app/nac-spec
Source: github.com/yujinapp/nac-spec
Discord: discord.gg/FH3xEmGm

Apache 2.0. ~20kb gzipped. No deps. (9/12)
```

**Tweet 10 -- the invitation:**

```
This is the smallest possible spec we could ship.

Five attributes. No SDK lock-in. No central authority. No
licensing model.

If you ship a web app -- agency, indie, hobbyist, enterprise
-- fork it, break it, improve it. Send PRs. Run a counter-
implementation. (10/12)
```

**Tweet 11 -- the long term + v2.3 stable:**

```
Standards win by adoption, not control.

Publishing today: NAC3 v2.3.0 stable. Adds NAC.invoke + NAC.utter
(payload-bearing actions: search, upload, image, video, schedule
all plug into the same event protocol), open Shadow DOM walks
automatically, closed Shadow DOM has a voluntary exposure API,
auth-aware capability gates. Three reference adopters: Atlas Pro
(voice ad), React demo, Angular demo. Open registry, open Discord,
governance doc explains how changes get made.

If you ship a web app, fork it. We'll list it. (11/12)
```

**Tweet 12 -- the company:**

```
Yujin is the company shipping this. We build frontier tech
for the next decade of human-computer interaction.

NAC3 is the first release. Developer tools and distribution
ship next.

For now: try the demo. Fork the spec. Join the Discord.

discord.gg/FH3xEmGm (12/12)
```

---

## 3. LinkedIn (450-600 words)

**Title / first line:**
> What if the ad did the work, instead of the visitor?

```
For 40 years, every ad has worked the same way: you read it, you
decide, you fill a form. The visitor does the translation work.

Watch what happens when the ad does the work instead:

[VIDEO -- Atlas Pro voice ad, 60 seconds]

That is Atlas Pro premium running shoes. The visitor speaks. The
agent listens in any of 10 languages, parses the order, fills the
form against a structured contract, validates it, and drops the
lead in the seller's CRM. The lead lands as a record + a testimonial
email at the seller within three seconds.

This is not a chatbot bolted onto a landing page. The button you'd
normally click is the SAME button the AI calls. The form field you'd
normally type into is the SAME field the agent fills. Voice agent,
screen reader, RPA bot, human cursor -- all driving the same
surface through the same protocol.

What this is, in one line: NAC3 (Native Agent Contract) is an
open standard that lets humans and AI agents drive the same web
surfaces, on equal footing.

Now the why:

Human communication is rich, layered, ambiguous. Frontends were
built to absorb that ambiguity -- and inherited it. We
disambiguate labels and layouts from context; the system does
not help us, we help the system. That is why current AI-in-the-
browser is screenshot-OCR and brittle CSS selectors. They guess
from pixels.

Backends got explicit contracts decades ago -- schemas, types,
REST. A bot reasons about an API without guessing. Frontends
never got the same treatment. NAC3 closes that gap.

Think of what Captain Picard's interface has that ours does not:
a contract between operator and machine, on shared ground.
"Warp speed" works not because of voice magic, but because the
ship's surface is contractually addressable. NAC3 is that
surface for web UIs.

Three lines of HTML to make any element agent-addressable:

  <button data-nac-id="invoice.save"
          data-nac-role="action"
          data-nac-action="save">Save</button>

That is the whole surface. About 80 lines for a non-trivial app.
Apache 2.0. The runtime (~20kb gzipped) is on npm as
@nac3/runtime. The spec, adoption guides, and reference
implementations are at yujin.app/nac-spec.

The voice ad is the commercial wedge. The bigger story is what
the same surface unlocks for any human in any context:

  - Hands-busy work -- a field-service tech dictates an inspection
    while installing equipment, a chef adds an item to the next
    delivery order without putting down a pan, a driver books a
    meeting at red lights without taking eyes off the road.
  - Multilingual conversion -- the same UI accepts intent in 10
    languages without re-templating. The visitor speaks Hindi,
    the page understands.
  - Accessibility as first-class -- the screen reader is a NAC3
    agent. Blind users get the same product as everyone else, no
    parallel "accessible version". We did not engineer for this.
    It falls out of the protocol.
  - Async agents on behalf of humans -- an LLM books the meeting
    while you're in another tab. An RPA bot replaces the nightly
    reconciliation. A Playwright spec exercises the same names.

And, as a cascade -- this is the wow but not the wedge -- two AI
agents transacting an entire purchase by voice, in three
languages, with no clicks. Recorded end-to-end:

  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4   1:55 English
  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4   2:21 Spanish (rioplatense)
  yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4   1:57 Mandarin

The buyer is an external agent driven by Claude Opus 4.7 importing
@nac3/runtime@2.3.0 from npm and calling the new
NAC.utter('atlas_pro_ad.mic', { text, lang }) primitive. The
seller's brain is Atlas Pro's own backend. Different vendors,
different prompts, one open protocol carrying the dialogue
between them.

Three reasons this matters at scale.

1) Web UIs are about to be driven by more than humans. Every AI
agent currently interacting with a website is reverse-engineering
meaning from DOM trees and screenshots. That is brittle, expensive,
and slow. NAC3 lets the UI declare itself so the agent stops
guessing.

2) The same primitive serves five callers. One contract drives
humans, agents, voice runners, screen readers, Playwright. No SDK
per caller. No model-specific tool-calling format. The era of
brittle CSS selectors and screenshot-OCR is ending.

3) The standard belongs to nobody. We work at Yujin and publish
it. Anyone can fork it, run a counter-implementation, improve it,
send PRs. Standards win by adoption, not control.

This is the first concrete release of what Yujin works on:
frontier tech for the boundary where AI meets the user interface,
designing software that talks back, listens, and acts on what it
hears, instead of asking humans to translate themselves into
clicks.

Try the live demo:
yujin.app/nac-spec/ads-demo/atlas-pro/?lang=es

Read the spec + adoption guides:
yujin.app/nac-spec

Source + governance:
github.com/yujinapp/nac-spec

Join the community:
discord.gg/FH3xEmGm

The reader verifies, does not trust. The code is open. The demo is
live. Try it. Break it. Improve it.

What comes after the form? This.
```

---

## 4. Reddit (r/programming + r/webdev + r/javascript)

### Title

```
We published an open standard that lets web UIs be driven by humans and AI agents through the same contract. Five HTML attributes. Apache 2.0.
```

### Body

```
**TL;DR**: NAC3 is an open standard that lets humans and AI
agents drive the same web surfaces, on equal footing. Five HTML
attributes. Apache 2.0.

Backends got explicit contracts (schemas, types, REST) decades
ago. Frontends inherited the ambiguity of human language and
never did. NAC3 closes that gap -- the button a human clicks is
the same button an LLM, a screen reader, a Playwright spec, or
an RPA bot calls by name. One contract, five callers. ~20kb
runtime on npm, optional (the attributes ARE the standard, the
runtime is convenience).

Spec: yujin.app/nac-spec
Source: github.com/yujinapp/nac-spec
Runtime: npm i @nac3/runtime
Discord: discord.gg/FH3xEmGm

The most visceral demo:
yujin.app/nac-spec/ads-demo/atlas-pro/?lang=es

A voice-driven running-shoe ad. Visitor speaks ("size 43, beige,
two pairs, delivery to home"), the agent parses the order
against a NAC3 manifest, fills the form, validates, submits the
lead to a CRM. Three seconds. Ten languages. Live.

Three recorded conversations across the same surface (different
agent vendor each, three languages):

- yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4 (English, 1:55)
- yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4 (Spanish, 2:21)
- yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4 (Mandarin, 1:57)

Voice ad is the commercial wedge. The same five attributes also
unlock:

- Voice as input medium for any human in any context
  (hands-busy, eyes-busy, non-typers, accessibility, multilingual)
- Async agents that act on behalf of humans
- RPA bots + Playwright + screen readers driving the same names
- Agent-to-agent commerce (the videos above show two AIs
  transacting via voice, end-to-end, no clicks)

**v2.3.0 stable (shipping today):**
adds payload-bearing actions via NAC.invoke / NAC.utter so
agents can pass STRUCTURED data with their requests (utterances,
search queries, file uploads, image/video references, schedule
dates). The host's nac:action:requested listener processes the
payload with whatever logic it wants and emits succeeded/failed
echoing the request_id back. Plus: open Shadow DOM walks
automatically (Web Components are now first-class), closed
Shadow DOM has a voluntary `el.nac3` exposure contract, and
auth-aware capability gates short-circuit unauthorised calls
before they hit the host. Backwards-compatible with v2.2.

**Why post here:** I expect this community to be skeptical, which
is what I want. The standard wins or loses based on whether
people who ship code think the surface is the right surface. If
something is missing, please tell me here, on GitHub issues, or
in the Discord.

**Anti-FAQ:**

- It's not ARIA repackaged. ARIA says what something IS.
  NAC3 says what it ACCEPTS and EMITS. The two stack.
- It's not OpenAI function calling. Those describe backends.
  NAC3 describes the UI itself.
- The runtime is optional. Server-rendered HTML with the
  attributes is conformant.
- Yes the voice ad demo uses Google Cloud STT server-side.
  The webkit fallback is in the repo. Both paths are open.
- Yes I work at the company shipping this (Yujin). The spec
  is governed openly and Apache 2.0. Forks welcome.

Fork it, break it, improve it. PRs open.
```

---

## 5. dev.to / Hashnode / Medium (long-form, ~2000 words)

### Title

```
Five HTML attributes to make your web UI driveable by AI agents
(and screen readers come along for free)
```

### Body (skeleton -- to be extended day-of)

```
## Part 0 -- What you're seeing (open with the three videos)

Three recorded conversations. The same NAC3-compliant page
(Atlas Pro voice ad). Three languages. Three different "buyer"
agents. One protocol.

- EN: yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4  (1:55)
- ES: yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4  (2:21)
- ZH: yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4  (1:57)

In each one, the visitor (whose voice was synthesised with Google
Neural2 TTS for this article -- a real human would sound the
same to the protocol) speaks. The agent listens, disambiguates,
fills the order form, handles interruptions ("una... no, dos
zapatillas"), confirms, and submits the lead. Three primary use
cases compressed into a single video:

1. **Voice ads that close sales** -- a new ad category. The
   visitor never types. The wedge for monetization is replacing
   low-CTR display advertising with high-conversion voice
   conversations.
2. **Voice as input medium for humans** -- hands-busy, eyes-
   busy, non-typers, multilingual. The web becomes a microphone
   away.
3. **Agent-to-agent commerce** -- the "wow" cascade. Two AI
   agents transacting end-to-end via voice with no clicks. This
   is the headline but NOT the primary commercial play.

The contract carrying all three is **NAC3** (Native Agent Contract).
Apache 2.0. v2.3.0 stable shipping today.

## Part 1 -- Humans and AI on equal web surfaces

NAC3 (Native Agent Contract) is an open standard, Apache 2.0,
that lets humans and AI agents drive the same web surfaces, on
equal footing.

[Open with the Atlas Pro voice ad demo embed -- the visceral
proof. Then the structural argument:]

Human communication is rich, layered, ambiguous. Frontends were
built to absorb that ambiguity -- and inherited it. Every label,
every tooltip, every form field is interpretable five different
ways. We disambiguate from context; the system does not help us,
we help the system.

That is the structural reason bots, autotests, AI agents, and
code-writing LLMs are great at backends and bad at frontends.
Backends got explicit contracts decades ago: schemas, types,
REST, GraphQL, OpenAPI. A non-human can reason about an API
without guessing. Frontends never got that treatment. The
"schema" of a button today is that it says "Save" in 14px gray,
three divs deep. AI-in-the-browser approaches involve screenshot-
OCR, brittle CSS selectors, DOM scraping, accessibility-tree
heuristics. None of those scale.

NAC3 is the missing primitive. End with the Captain Picard
anchor: the ship's surface has to be addressable for "warp speed"
to work. NAC3 is that surface for web UIs.

## Part 2 -- The standard, five attributes

[Each attribute in detail. Show before/after of a typical button.
Show the manifest a page exposes. Show how a caller -- voice,
RPA, LLM, Playwright, screen reader -- consumes the same
manifest.]

## Part 3 -- Five callers, one surface

[A non-trivial section on each of the five caller types:
  1. Human (cursor) -- the baseline. NAC3 doesn't change this.
  2. AI agent -- LLM tool-calling against the manifest.
  3. Voice runner -- the Atlas Pro case.
  4. Screen reader -- the accessibility-for-free case.
  5. RPA / Playwright -- the test + automation case.
For each: a code snippet of the caller dispatching the same
button.]

## Part 4 -- Why this is harder than it looks

[Trade-offs the spec made. Stable ids. Verb taxonomy. State
events. Why the surface is five attributes and not fifty. Why
it's not a JSON schema. What got cut on the way to v2.2.]

## Part 5 -- Adopting NAC3 in a real app

[Walk through retrofit on a typical SaaS form (any chosen
reference example -- v23 editor, v22 interop, or v21 data-table).
Show the diff before/after. Show the manifest that emerges. Show
an LLM driving the flow end to end.]

## Part 6 -- Accessibility, the free win

[Two paragraphs. The same attributes that drive agents drive
assistive tech. Demo with VoiceOver or NVDA. Show why it matters
that nobody had to write extra code for this.]

## Part 7 -- What's next

[Yujin's roadmap, sober:
  - v2.3.0 stable ships today (this release). Adds
    `NAC.invoke(id, payload)` and `NAC.utter(id, {text, lang})`
    -- payload-bearing actions. The first concrete use is
    conversational input (Atlas Pro `utter` verb). The same
    protocol carries search queries, file uploads, image and
    video references, schedule dates -- anything a host
    declares an interest in receiving. Plus Shadow DOM
    (open + closed via voluntary exposure), auth-aware
    capability gates, and a strict-validation default.
  - Forge (BYOK developer tools) and Pilot (registry browser +
    agent runtime) are in design, Q3 2026 target.
  - Public registry at yujin.app/registry once D1-D6 land.
  - Spec governance is open (GOVERNANCE.md); contributors
    welcomed via PR. No prices, no signups, no platform tax.]

## Part 8 -- The invitation

[Ship NAC3 on your app. List it in the registry. Open issues.
Send PRs. Fork if you want a counter-implementation.]
```

---

## 6. Assets needed (Pablo to produce / approve)

### a) Hero videos (DELIVERED 2026-05-12 via the video-gen pipeline)

The three videos that ship with the launch were generated by
`tools/video-gen/` -- a Playwright-driven recorder that has an
external agent (Claude Opus 4.7) inject @nac3/runtime from npm
and drive Atlas Pro via NAC.utter calls in three languages, with
overlay tracing each NAC3 verb in real time. ffmpeg burn-in adds
visitor-side subtitles. Sources, scripts, and the report are in
`tools/video-gen/REPORT.md`. To regenerate, see that README.

- EN: `yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-en.mp4`  (1:55, 5.9 MB)
- ES: `yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-es.mp4`  (2:21, 7.4 MB)
- ZH: `yujin.app/nac-spec/ads-demo/atlas-pro/videos/atlas-pro-agent-zh.mp4`  (1:57, 6.0 MB)

Each video shows:
- Surface discovery via `[data-nac-id]` (14 elements).
- Agent injects `@nac3/runtime@2.3.0` from unpkg.
- 8 visitor turns with disambiguation (vague size, ambiguous
  color among 3 options) and mid-flow interruption (qty change).
- Real-time overlay showing `NAC.utter -> nac:action:requested
  -> /parse -> /tts -> nac:action:succeeded` for each turn.
- Final `NAC.click_by_verb('atlas_pro_ad','submit')` succeeds.
- Slots filled correctly: 42.5 / midnight / 2 / pickup.

Tamara recordings remain on the table as a human-narrated variant
once available; the agent-driven versions ship as the day-1
artefact.

### b) Code diff "before / after" (Carbon.now.sh screenshot)

```
// BEFORE -- generic form
<form action="/submit-lead" method="POST">
  <input name="size" />
  <input name="color" />
  <button type="submit">Submit</button>
</form>

// AFTER -- NAC3-compliant
<form data-nac-id="atlas_pro_ad.form"
      data-nac-role="region"
      action="/submit-lead" method="POST">
  <input data-nac-id="atlas_pro_ad.size"
         data-nac-role="field"
         name="size" />
  <input data-nac-id="atlas_pro_ad.color"
         data-nac-role="field"
         name="color" />
  <button data-nac-id="atlas_pro_ad.submit"
          data-nac-role="action"
          data-nac-action="submit"
          type="submit">Submit</button>
</form>
```

Same form. Five attributes added. Now driveable by voice + screen
reader + agent + Playwright + RPA.

### c) Architecture sketch (1 SVG, optional)

> Optional. The five-attribute table renders cleanly as text in
> all the posts. SVG is nice-to-have, not blocker.

---

## 7. Cross-post plan

| Hour 0 | Channel | Action |
|---|---|---|
| 0 | HN | Submit. Watch first 30 min for ranking. |
| +30 min | X | Tweet 1 (video). Drip 2-12 over the next 2 hours. Reply to mentions ASAP. |
| +30 min | LinkedIn | Pablo posts from personal profile. |
| +2 hrs | Reddit r/programming | Submit. Cross-post to r/webdev + r/javascript after 30 min. |
| +2 hrs | Discord (own server) | Pin announcement in #announcements. Welcome new joiners. |
| +3 hrs | Indie Hackers Discord | Cross-post to #show channel. |
| +3 hrs | AI Builders / dev-tool Discords | Light cross-post (max 2-3 servers, respect culture). |
| Day +1 AM | dev.to / Hashnode | Long-form. Drives slower-burn traffic over the week. |

---

## 8. Post-launch monitoring (first 72 hours)

- HN front page rank every 15 min for first 4 hours.
- npm install count daily.
- GitHub stars + issues + PRs.
- Discord member count + #nac3-help volume.
- Top 3 objections in HN comments -> reply within 1 hour.
- yujin.app analytics: demo CTA click-through rate, video plays.
- Voice ad demo lead capture rate (real conversions if any).

---

## See also

- yujin.app -- launch landing (videos auto-embed when delivered).
- yujin.app/nac-spec -- full NAC3 spec + adoption guides.
- yujin.app/nac-spec/ads-demo/atlas-pro/ -- live voice ad.
- github.com/yujinapp/nac-spec -- source.
- @nac3/runtime on npm -- runtime.
- discord.gg/FH3xEmGm -- community (Pablo creates day-of).

---

## Changelog

- v4.0 (2026-05-13): NAC3 **v2.3.0 stable** ships. NAC.invoke +
  NAC.utter (payload-bearing actions), open + closed Shadow DOM,
  auth-aware capabilities, strict validation by default,
  edit_field GA. Three reference adopters: Atlas Pro (production
  voice ad), React demo, Angular demo. Multi-language E2E
  39/39 GREEN against live deploy (en/es/zh). Posts updated to
  drop all alpha/preview framing; runtime version stamp 2.3.0.

- v3.4 (2026-05-12, late): NAC3 v2.3.0-alpha.1 preview landed
  alongside v2.2.x stable (NAC.invoke + NAC.utter -- payload-
  bearing actions). Three demo videos delivered (EN/ES/ZH) via
  the tools/video-gen/ pipeline; agent driving via NAC.utter
  end-to-end, with overlay tracing each NAC3 verb in real time.
  Each channel post now references the three video URLs +
  introduces NAC.utter. Editorial principle #9 added: voice
  ads are the commercial play, not "AI demos"; lead each
  channel with the voice-ad use case rather than the agent-to-
  agent gimmick (which lands wrong to non-technical readers).
  Editorial principle #10 added: frame v2.3 as "and v2.3
  preview lands today" -- positive flag without forcing
  adopters off v2.2.
- v3.3 (2026-05-12, early): primary use case order locked by
  Pablo: (a) voice ads that close sales, (b) voice as universal
  human input, (c) accessibility first-class, (d) multilingual,
  THEN as cascade (e) async agents, (f) RPA/test, (g) agent-
  to-agent. Recorded as the new "Primary use cases at launch"
  section at top of this doc.
- v3.2 (2026-05-12): structural reframing. Each post now leads
  with the one-line answer to 'what is NAC3' ('humans and AI on
  equal footing on the same web surfaces') so a reader who
  bounces after line 1 still knows what it is. The philosophical
  argument (frontends inherited the ambiguity of human language;
  backends got explicit contracts; NAC3 closes the gap) is the
  WHY underneath, not the opener. Captain Picard anchor preserved
  as the bridge from why -> what. Replaces the 1984/'one species
  of operator' opener that buried the lede.
- v3.1 (2026-05-11): Cal.com adopter claim removed from every
  channel (migration cancelled / postponed). Use cases now: meeting
  schedulers (generic), ERP forms, dashboards, multi-step
  checkouts, admin panels, field-service forms, screen readers.
- v3 (2026-05-11): rewritten demo-first while preserving Captain
  Picard sci-fi anchor + the breadth message (NAC3 is much more
  than the voice ad). Voice ad video is the hook in every channel;
  each post pivots within 60 seconds to the bigger story. Updated
  all URLs to github.com/yujinapp + Discord.
- v2 (2026-05-10): vision-first rewrite (Captain Picard anchor).
  Removed false-claims, social-proof apologetics, "battle tested"
  language.
- v1 (2026-05-08): initial drafts.
