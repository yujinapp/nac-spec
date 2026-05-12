# NAC3 v2.2 -- Tester checklist: visual / front-end layout

**For:** the human tester evaluating the visual look + feel.
**Time:** ~30 minutes.
**Pre-requisite:** any modern browser (Chrome recommended).

## How to use this checklist

For each task:

1. Open the URL listed.
2. Look at the page calmly. Take 30-60 seconds before judging.
3. Compare with the "What to evaluate" list.
4. Mark `[X]` in **OK** if everything looks good.
5. Mark `[X]` in **NEEDS FIX** if something looks bad / broken / amateurish.
6. ALWAYS write at least 1 sentence in the Comments box, even if marking OK -- describe what you saw and how it felt.
7. If you notice anything not on the evaluation list, write it in Comments too. The Comments box is the most important part of this checklist.

Be honest, not polite. A "needs fix" with a real comment is more useful than 10 reflexive "OK" boxes.

---

## Section 1 -- Landing page (the front door)

### Task V1 -- First impression of the landing

a) Open Chrome incognito, go to `https://yujin.app/nac-spec/`.
b) Look at the page for 30 seconds without scrolling.
c) Imagine you arrived from Twitter for the first time.
d) **What to evaluate:**
- Does the hero area (top of the page) clearly say what NAC3 is in less than 10 seconds of reading?
- Is the sumi-e Japanese branding visible without being overwhelming?
- Is the font readable? Is the contrast good?
- Are there obvious places to click next (Demo, Docs, etc.)?
- Does it look professional or amateur?

- [ ] OK -- looks professional, message clear
- [ ] NEEDS FIX
Comments (mandatory): _______________________________
_______________________________

### Task V2 -- Spacing and rhythm

a) Slowly scroll down the landing from top to bottom.
b) Pay attention to vertical rhythm: are sections separated cleanly, or do they crash into each other?
c) **What to evaluate:**
- Adequate whitespace between sections (not too tight, not too sparse)?
- Section headings stand out from body text?
- Lines of text are comfortable to read (not too wide, not too narrow)?
- No element looks like it "leaked" out of its container?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V3 -- Made with NAC3 section

a) Scroll until you reach the "Made with NAC3" section.
b) Look at the 4 cards in the grid.
c) **What to evaluate:**
- Are all 4 cards the same visual size?
- Do the Japanese characters at the top of each card look intentional or random?
- Is each card readable -- title, description, link arrow all clear?
- Does the section feel like prestigious adopters, or filler content?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V4 -- Forge + Pilot waitlist section

a) Scroll to "Coming Q3 2026: Yujin Forge + Pilot".
b) Look at the 2 product cards + the email form below.
c) **What to evaluate:**
- The two pricing levels ($19 and $5) are visually distinct?
- The product feature lists (bullets) are scannable?
- The email form is clean -- not cluttered?
- The disclaimer text about BYOK is readable but not screaming?
- The "Notify me" button is obvious and looks clickable?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V5 -- Governance + footer

a) Scroll to the bottom of the page.
b) Look at the "Open standard, open governance" section + the footer.
c) **What to evaluate:**
- The governance text is readable + reassuring?
- The footer is minimal (kanji, license, GitHub link, Yujin link, version)?
- Nothing in the footer looks broken or misaligned?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

---

## Section 2 -- Demos visual

### Task V6 -- Vanilla demo (example.php)

a) Go to `https://yujin.app/nac-spec/example.php`.
b) Look at the page without interacting.
c) **What to evaluate:**
- The 27 widgets fit together coherently or look thrown together?
- Colors are consistent (sumi-e palette or chaotic)?
- Buttons look clickable (raised, colored, well-spaced)?
- Inputs look enterable (cursor would clearly land in them)?
- Tabs (if any) look like tabs?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V7 -- v20-full demo

a) Go to `https://yujin.app/nac-spec/example-v20-full.php`.
b) Pay special attention to the "v20-panel" usually top-right.
c) **What to evaluate:**
- The v20-panel is visible right away (not hidden, not cut off)?
- The panel's buttons (describe_v2, validate_global_v2, etc.) are readable + distinct?
- The panel doesn't feel "bolted on" -- fits the page visually?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V8 -- Data-table demo (v21)

a) Go to `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Look at the tabs + the data table inside.
c) **What to evaluate:**
- The active tab is visually distinct from inactive tabs?
- Table rows alternate color (zebra) for readability?
- Column headers stand out from data rows?
- The "add row" or similar action buttons are findable?
- The chat panel does not overlap or hide the table?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V9 -- Interop demo (v22)

a) Go to `https://yujin.app/nac-spec/example-v22-interop.php`.
b) Observe the two side-by-side mini-apps.
c) **What to evaluate:**
- The two sides are clearly separated (border, color, or spacing)?
- The 4 CTAs (Export tree, Import remote, etc) are visible at the top?
- After clicking a CTA, the output panel shows feedback clearly?
- The visual feels like "two apps" not "one confusing page"?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V10 -- React + Angular demos

a) Open `https://yujin.app/nac-spec/demos/react/` and `https://yujin.app/nac-spec/demos/angular/` in two tabs.
b) Compare them side by side.
c) **What to evaluate:**
- They look like the same app implemented in 2 frameworks (consistency)?
- Both have a clean Todos UI: input + button + list?
- Both have a working chat panel?
- Neither has obvious visual bugs (overlaps, cut text, wrong colors)?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

---

## Section 3 -- Chat panel visual

### Task V11 -- Chat panel layout

a) On the landing page, open the chat panel (click the bubble if collapsed).
b) Resize your browser window: narrow (phone-like, ~400px wide) and wide (desktop, 1400px).
c) **What to evaluate:**
- On wide: chat panel is anchored right, doesn't squash the content?
- On narrow: chat panel covers the whole width OR floats sensibly?
- The microphone button is always visible (never cut off)?
- The Send button is always clickable?
- Message bubbles (when there are messages) are clearly user vs assistant?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V12 -- Chat readability

a) Type and send 3 messages. Wait for responses.
b) Scroll through the conversation.
c) **What to evaluate:**
- User messages and assistant messages are visually distinct?
- Long responses (multi-paragraph) are paginated / scrollable cleanly?
- Code blocks in responses (if any) are formatted clearly?
- The font size is comfortable (not tiny, not huge)?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

---

## Section 4 -- Mobile / responsive

### Task V13 -- Mobile portrait

a) On a phone (or browser DevTools mobile mode set to iPhone), open `https://yujin.app/nac-spec/`.
b) Scroll the whole page.
c) **What to evaluate:**
- No horizontal scroll bar (the page width fits)?
- All buttons are reachable with a thumb (not too small)?
- Text is readable without zooming?
- Images / GIFs (if any) don't break the layout?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

### Task V14 -- Tablet landscape

a) On a tablet (or DevTools iPad landscape), open the landing.
b) Look at how the layout uses the wider width.
c) **What to evaluate:**
- Multi-column layouts kick in at wider sizes?
- The page does NOT stay narrow (~600px) on a 1024px screen?
- Whitespace is balanced, not awkward?

- [ ] OK
- [ ] NEEDS FIX
Comments: _______________________________
_______________________________

---

## Section 5 -- Subjective feel

### Task V15 -- Overall aesthetic

a) Without thinking too hard, browse the landing + 2 demos.
b) Rate the feel on these dimensions:

| Dimension | 1 (bad) - 5 (great) |
|-----------|---------------------|
| Professional vs amateur | __ |
| Sumi-e branding integrated naturally | __ |
| Visual hierarchy clear | __ |
| Color choices coherent | __ |
| Typography readable + tasteful | __ |
| Trust signal (would you take this product seriously?) | __ |

Comments: _______________________________
_______________________________

### Task V16 -- One thing to change

If you could change ONE visual thing across the whole site to most improve it, what would it be?

Your answer (mandatory, 1-3 sentences): _______________________________
_______________________________
_______________________________

### Task V17 -- One thing to keep

What ONE visual choice on the site impresses you most and should stay?

Your answer (mandatory): _______________________________
_______________________________

### Task V18 -- Trust judgment

a) Imagine you're a CTO seeing this for the first time.
b) Would you trust the company behind this enough to consider adopting NAC3 in production?
c) **Why or why not?**

- [ ] Yes, would trust
- [ ] No, would not trust (yet)
Why: _______________________________
_______________________________

### Task V19 -- Compared to peers

Compared to other open-standard / dev-tool landing pages (e.g. Anthropic, Vercel, Linear, Notion), the NAC3 site looks:

- [ ] Better
- [ ] On par
- [ ] Below
- [ ] Far below

What specifically: _______________________________
_______________________________

### Task V20 -- Free-form feedback box

Anything you noticed that did NOT fit any task above. Bugs, awkward copy, weird spacing, broken links, confusing flows, missed opportunities. Write everything.

_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________
_______________________________

---

## SIGN-OFF (visual evaluation)

```
Release tag:        v____._.___
Tester name:        ______________________________
Date:               ____-____-____
Browser:            [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Device:             [ ] Desktop  [ ] Tablet  [ ] Phone

Overall visual rating (1-10): __

Top 3 visual issues to fix (priority order):
1. _______________________________
2. _______________________________
3. _______________________________

Verdict for launch:
[ ] visual is ready to ship
[ ] visual needs work but not a blocker
[ ] visual is blocking -- do not launch yet

Signature: ______________________________
```

---

## See also

- `TESTER_CHECKLIST_VOICE_CHAT.md` -- voice + chat specific evaluation.
- `TESTER_CHECKLIST_VISUAL.es.md` -- Spanish version.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- general functional checklist.
