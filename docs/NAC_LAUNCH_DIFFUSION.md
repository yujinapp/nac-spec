# NAC3 launch diffusion plan

A practical playbook for getting NAC3 in front of the people who
should be using it. Written 2026-05-10 for the v2.2 / v2.3-preview
launch.

## What we're shipping

- **Spec:** v2.2 stable, v2.3 preview (field editor primitive).
- **Runtime:** `@nac3/runtime@2.2.0` on npm (ESM + CJS + d.ts + CLI).
- **Demos:** four live demos at yujin.app/nac-spec/.
- **Adoption guides:** React + Angular + LLM-wiring.
- **Study cases:** working Vite + React 18 and Angular 17 apps in
  `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **Brownfield migration story:** the Yujin CRM itself, documented
  in pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **NAC-3 conformance:** the landing page itself is NAC-3
  compliant (manifest + chat + autopilot + isTrusted-aware).

## Messaging

### One-liner

> **NAC3 -- the small public spec that lets web UIs be driven by AI
> agents, voice runners, and accessibility tools without per-app
> glue code.**

### Three-liner

> NAC3 is what ARIA would have been if it had been designed in
> 2026 with LLMs in mind. Decorate your existing UI with three
> HTML attributes; the runtime resolves names + dispatches clicks
> + emits completion events + handles localisation + provides
> provenance. Apache-2.0, npm install, no build-step changes.

### 30-second pitch

> Voice assistants, LLM chat agents, and accessibility tools all
> face the same problem: they need stable names for the things
> they want to act on. CSS selectors break. ARIA stops at "this
> is a button". Every team builds the same plumbing from scratch.
>
> NAC3 is the small contract that fixes this. You add `data-nac-id`,
> `data-nac-role`, `data-nac-action` to the elements an agent
> should drive; the runtime takes care of the rest. There's a
> working v2.2 spec, a stable npm package, React + Angular
> guides, and four live demos including one wired end-to-end to
> a Claude Sonnet chat backend that you can talk to right now.
>
> It's Apache-2.0. We made it because we run a CRM that needed
> it. Now you can use it too.

## Target audiences

| Audience | Channel | Hook |
|----------|---------|------|
| React + Vue + Svelte + Angular devs | dev.to, Hashnode, r/javascript, r/webdev | "Drive your existing React app with voice in 80 lines" |
| Voice + agent builders | r/LocalLLaMA, r/ChatGPTCoding, agent-builder Discords | "A standard the user-facing side of voice apps has been missing" |
| Accessibility advocates | r/Accessibility, a11y mailing lists, A11y meetup speakers | "ARIA designed in 2026 with LLMs in mind" |
| Test/QA engineers | r/qualityassurance, Selenium / Playwright communities | "Stable selectors that survive UI redesigns" |
| HN | news.ycombinator.com | the canonical Show HN |
| Tech leads + CTOs | LinkedIn, Mastodon | the "you'll add this in 12 months anyway" angle |
| Yujin CRM users | direct email + in-product banner | "your CRM speaks NAC3; here's what that means" |

## Channels + sample posts

### Show HN

- **Title:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **First line:** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **Body:** explain the contract (3 attrs + manifest + events), link the live demo, link the spec, link the npm package, link the React study case. Keep it under 200 words. Comment threads pull more attention than long posts.
- **Day:** Tuesday or Wednesday US morning. Avoid Mondays + Fridays.
- **Follow-up:** be in the comments for at least 4 hours; respond to every technical question; do not respond to flame.

### r/javascript

- **Title:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Body:** focus on "what does the React adopter do" -- code examples from `guides/REACT.md`. Link the study case GitHub directory.

### r/Accessibility

- **Title:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Body:** lead with "this is NOT a replacement for ARIA, this is a sibling" -- accessibility folks are protective, justifiably. Show how `data-nac-role="action"` and `role="button"` coexist.

### dev.to

- **Title:** `Drive any web UI by voice with @nac3/runtime`
- **Hook:** the React study case repo. Inline screenshots/gifs of the chat panel + the autopilot tour.
- **Length:** 1500-2000 words. Step-by-step.

### Twitter / X

A 6-tweet thread:

1. "We just shipped NAC3 v2.2 -- a public spec + npm package that lets web UIs be driven by AI agents. Apache-2.0. (gif of the demo)"
2. "Why: every team building voice/agent UX rebuilds the same plumbing. CSS selectors break. ARIA isn't agent-shaped. We needed a small contract."
3. "How small: 3 HTML attributes per element. (code screenshot)"
4. "What you get: stable names, deterministic completion events, 10-locale i18n out of the box, provenance via HMAC + isTrusted, auto-validation."
5. "Live demo at yujin.app/nac-spec -- four demos, one wired to a Claude Sonnet chat backend. Talk to it."
6. "React + Angular adoption guides + working study cases at github.com/yujinapp/nac-spec. Spec at yujin.app/nac-spec/SPEC.md."

### LinkedIn

Long-form post (~600 words). Lean on the "you'll add this in 12 months anyway" angle; appeal to CTOs evaluating their agent strategy. Include a screenshot of the BPMN-shaped autopilot tour.

### Mastodon

Crosspost the Twitter thread, keep it terse. Include alt-text on every image (matters there).

## Demo gif/video plan

### Gif (15 seconds, looping)

Scene 1 (4s): user types "agrega tomar agua" in the chat input on
the React demo.
Scene 2 (3s): the LLM resolves; the todo gets added with a
flash highlight.
Scene 3 (4s): user clicks "tour"; autopilot walks the page,
narrating.
Scene 4 (4s): user holds the mic, says "remove all done", todos
clear.

Hosted as a 8MB MP4 + a 4MB WebP fallback at
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Used as the README
hero gif, OG image, Twitter card, dev.to header.

### Video (90 seconds, voiceover)

Posted to YouTube + Vimeo.
- 0:00-0:10 -- the problem ("voice + agents need stable names").
- 0:10-0:25 -- the contract (3 attrs).
- 0:25-0:45 -- adoption demo (React study case, 5 lines added).
- 0:45-1:05 -- driving via chat + voice + autopilot.
- 1:05-1:20 -- Yujin CRM brownfield example.
- 1:20-1:30 -- "Apache-2.0, npm install @nac3/runtime, links below."

## Follow-up cadence

| Time | Action |
|------|--------|
| Day 0 | Show HN + r/javascript + Twitter thread + dev.to article. Respond to comments for 4-8 hours. |
| Day 1 | LinkedIn post. Respond to dev.to comments. Add any easy issues raised to the GitHub backlog. |
| Day 3 | r/Accessibility post + Mastodon crosspost. |
| Day 7 | "Week 1 reflection" blog post: what feedback we got, what we changed, top GitHub issues filed. |
| Day 14 | Reach out to specific accessibility / agent-builder folks who engaged on day 0 with a "want to chat?" DM. |
| Day 30 | Ship a v2.2.x patch with the top community-requested fixes. Announcement post: "what 30 days taught us about NAC3". |
| Day 90 | NAC3 v2.3 ships (field editor canonical, STRICT_VALIDATION default true). New launch pulse, smaller footprint. |

## Metrics to track

- npm downloads of `@nac3/runtime` weekly.
- GitHub stars + forks on `yujinapp/nac-spec` and
  `pkuschnirof/yujin`.
- Demo page views at yujin.app/nac-spec/ (server access logs).
- Number of GitHub issues opened (proxy for engagement).
- Number of unique commenters across the channels above.
- Search trend for "Native Agent Contract" (Google Trends).

Targets, week 1:
- 200 npm downloads
- 100 GitHub stars across both repos
- 5000 demo page views
- 10 issues / discussions opened
- 1 unsolicited blog post by an outsider

If we miss those by 50%+, the messaging needs work; iterate the
LinkedIn + dev.to post copy and try again at day 14.

## Pre-flight checklist (before clicking post)

- [ ] `npm publish @nac3/runtime@2.2.0` complete (this is **manual**;
      requires owner npm token).
- [ ] `npm install @nac3/runtime` works from a fresh tmp dir.
- [ ] Live demos load without console errors in Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` returns `[]` on the landing.
- [ ] Demo gif renders in dev.to + Twitter preview cards.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` all in place.
- [ ] At least one open GitHub issue labelled "good first issue"
      so contributors who arrive day 1 have somewhere to start.
- [ ] Pablo is awake + ready to answer comments for 4 hours.

## Anti-goals

What we will NOT do:

- Pay for ads (until at least week 4 metrics are in).
- Trash-talk ARIA, Selenium, Playwright, or any agent vendor.
  NAC3 is additive, not adversarial.
- Promise enterprise support contracts at launch (those come
  after we know the support load).
- Open-source-wash: the code IS Apache-2.0, AND the chat-backend
  reference impl is too. We don't separate "core" from "premium"
  features as a moat -- the moat is hosting + LLM credits + ops.

## Day-of-launch playbook

Time-boxed because Pablo runs this solo:

| Time | Action |
|------|--------|
| 06:00 (US ET) | Final smoke: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + open all demos in incognito. Fix what's broken. |
| 09:00 | Show HN posted. |
| 09:05 | Twitter thread posted. |
| 09:15 | r/javascript posted. |
| 09:30 | dev.to article posted. |
| 09:30-13:30 | Live in HN comments. Pin a top-comment with quick links. |
| 14:00 | LinkedIn post. |
| 14:00-18:00 | Live in dev.to comments + Twitter mentions. |
| 18:00 | Stop. Decompress. |
| Day 1 09:00 | r/Accessibility + Mastodon. Triage GitHub issues. |
