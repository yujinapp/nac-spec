# NAC3 v2.2 -- Tester checklist (English)

**For:** the human tester walking through the release.
**Time:** ~60-90 minutes for a full pass.
**Last updated:** 2026-05-11.

## Instructions for the tester

For each task below:

1. Read step a, b, c, d in order.
2. Do exactly what step a says, then b, then c.
3. Compare what you see/hear with the "Expected result" in step d.
4. If the result matches exactly: mark `[X]` in the **OK** checkbox.
5. If the result does NOT match: mark `[X]` in the **ERROR** checkbox AND write what actually happened in the "Comments" line.

Do not skip tasks. If a task fails, continue to the next one (do not stop). Failed tasks are fixed after the full walk.

When done, sign at the bottom and send the file back.

---

## Section 1 -- Landing page smoke (Chrome)

### Task 1

a) Open Chrome in incognito mode (Ctrl+Shift+N).
b) Type in the address bar: `https://yujin.app/nac-spec/` and press Enter.
c) Wait 5 seconds without clicking anything.
d) **Expected result:** The page loads. The top of the page shows a sumi-e (Japanese brush) icon and the title "NAC -- Native Agent Contract". No red error messages appear on the screen. The page is not blank.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 2

a) Press the F12 key to open the browser developer tools.
b) Click on the "Console" tab inside the developer tools.
c) Wait 3 seconds.
d) **Expected result:** The Console area has no red error lines. (Yellow warnings are OK; only red lines indicate a failure.)

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 3

a) Close the developer tools (F12 again).
b) Scroll down the page until you see a section titled "Made with NAC3".
c) Look at the cards in that section.
d) **Expected result:** You see at least 4 cards in a grid: "Yujin CRM", "Reference demos", "Atlas Pro voice ad", and "Your app". Each card has a Japanese character symbol on top, a title, a short description, and a link with an arrow `->`.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 4

a) Scroll down further until you see a section titled "Coming Q3 2026: Yujin Forge + Pilot".
b) Find the email field that says "you@example.com".
c) Type your real email there.
d) **Expected result:** The two checkboxes "Forge ($19)" and "Pilot ($5)" are both checked by default. There is a blue button labeled "Notify me".

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 5

a) Click the "Notify me" button.
b) Wait 5 seconds.
c) Read any message that appears next to the button.
d) **Expected result:** A message appears saying either "Got it. You will hear from us when Forge + Pilot launch." OR "Submission failed -- email hello@yujin.app instead." Either message is acceptable; both indicate the form is wired up.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 2 -- Voice command on the data-table demo

### Task 6

a) In the same browser, navigate to: `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Wait 5 seconds for the page to fully load.
c) Look at the page.
d) **Expected result:** You see a data-table demo with at least 3 tabs at the top: "Lines (collection)", "Permissions", and one more. There is a chat panel on the right side of the screen.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 7

a) Locate the microphone button at the bottom of the chat panel (usually a circular icon with a microphone symbol).
b) Click it. Your browser may ask for permission to use the microphone; grant it.
c) Speak clearly into your computer's microphone: **"ve a permisos"** (Spanish for "go to permissions").
d) **Expected result:** Within 3-5 seconds, the active tab changes from "Lines (collection)" to "Permisos" or "Permissions". The chat panel shows your transcribed words.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 8

a) Click the microphone button again.
b) Speak clearly: **"go to permissions"** (in English this time).
c) Wait for the system to respond.
d) **Expected result:** The tab "Permissions" remains active or re-activates. The chat reflects the English input.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 9

a) Click the microphone button again.
b) Speak clearly: **"cambia de pestana"** (Spanish for "switch tab" -- the word "de" is the Spanish preposition).
c) Wait for the response.
d) **Expected result:** The locale of the chat does NOT switch to German. The chat panel may switch tabs OR ask a clarification question, but the language stays in Spanish/English -- not German. (This is the regression guard for an older bug.)

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 3 -- React study case

### Task 10

a) Navigate to: `https://yujin.app/nac-spec/demos/react/`
b) Wait 5 seconds.
c) Look at the page.
d) **Expected result:** You see a "Todos" app: input field at top, "Add" button next to it, and an empty list area below. A chat panel exists on the right side.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 11

a) Click into the input field.
b) Type the word **"milk"** (or any short word).
c) Click the "Add" button.
d) **Expected result:** A new todo item appears in the list area, showing "milk" with a checkbox next to it.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 12

a) In the chat panel, find the microphone button.
b) Click it and speak: **"agrega pan"** (Spanish for "add bread").
c) Wait 5 seconds.
d) **Expected result:** A new todo item appears in the list, showing "pan" or "bread". The list now contains at least 2 items.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 13

a) Click the microphone again.
b) Speak: **"borra leche"** (Spanish for "delete milk").
c) Wait 5 seconds.
d] **Expected result:** The "milk" item disappears from the list. Only "pan/bread" remains.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 4 -- Angular study case

### Task 14

a) Navigate to: `https://yujin.app/nac-spec/demos/angular/`
b) Wait 5 seconds.
c) Look at the page.
d) **Expected result:** Same as the React demo (Task 10): "Todos" app with input, Add button, empty list, chat panel.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 15

a) Repeat tasks 11, 12, 13 on this Angular demo (add "milk", then voice-add "pan", then voice-delete "milk").
b) Observe the result of all three actions.
c) Compare with the React demo behavior.
d) **Expected result:** All three actions work exactly the same as in the React demo.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 5 -- Cross-browser smoke

### Task 16

a) Open Firefox (or install it from mozilla.org if you do not have it).
b) Navigate to `https://yujin.app/nac-spec/` in Firefox.
c) Wait 5 seconds.
d) **Expected result:** Same as Task 1: page loads, sumi-e icon visible, no errors.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 17

a) In Firefox, navigate to `https://yujin.app/nac-spec/example-v21-data-table.php`
b) Click each of the visible tabs in turn (Lines, Permissions, and any others).
c) Watch the table content change.
d) **Expected result:** Each tab click changes the content area below the tabs. No errors appear. No tab gets "stuck".

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 18

a) Open Safari (Mac only) OR Edge (Windows).
b) Navigate to `https://yujin.app/nac-spec/`
c) Wait 5 seconds.
d) **Expected result:** Same as Task 1.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 6 -- Keyboard-only navigation (no mouse)

### Task 19

a) Open `https://yujin.app/nac-spec/` in any browser.
b) Set your mouse aside; do NOT touch it for this task.
c) Press the Tab key repeatedly (about 15 times).
d) **Expected result:** A visible blue/colored "focus ring" highlight moves through different elements on the page (links, buttons). The focus is always visible -- it never disappears or gets "stuck" in an invisible spot.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 20

a) Continue Tab navigation until you reach the chat panel area.
b) Press Tab until you reach the chat input box (you should see a focus ring around it).
c) Type "hello" with the keyboard.
d) Press Enter.
d) **Expected result:** The chat sends "hello" and shows a response within 5-10 seconds. No mouse was used at any point.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 7 -- Screen reader (NVDA on Windows, VoiceOver on Mac)

This section is optional if you don't have NVDA or VoiceOver. Skip to Section 8 if not available.

### Task 21 (Windows only)

a) Install NVDA from https://www.nvaccess.org/download/ (it's free).
b) Start NVDA (Ctrl+Alt+N).
c) Open `https://yujin.app/nac-spec/` with your monitor turned OFF (or eyes closed).
d) **Expected result:** NVDA reads the page title and announces a structured outline -- you can navigate by pressing the H key to jump between headings. You can hear what each heading says clearly.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 22 (Mac only)

a) Press Cmd+F5 to start VoiceOver. (Or System Settings -> Accessibility -> VoiceOver.)
b) Open `https://yujin.app/nac-spec/`
c) Press VO+A (Ctrl+Alt+A) to read the page top-to-bottom.
d) **Expected result:** VoiceOver reads the page in a logical order. The reading makes semantic sense (e.g., "heading level 1, NAC", "link, Open vanilla demo", "button, Notify me") -- not "div, div, div, link, link, button".

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 8 -- Multi-locale chat (10 languages)

### Task 23

a) Navigate to `https://yujin.app/nac-spec/example-v21-data-table.php`
b) In the chat panel, find the language dropdown (usually a small flag or "lang" indicator). Change it to Portuguese (pt).
c) Click the microphone button and speak: **"vai para permissoes"** (Portuguese for "go to permissions").
d) **Expected result:** The Permissions tab activates. The chat responds in Portuguese.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 24

a) Change the chat language to French (fr).
b) Click microphone and speak: **"va aux permissions"** (French for "go to permissions").
c) Wait for response.
d) **Expected result:** The Permissions tab activates. Chat responds in French.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 25 (optional, skip if you do not speak any of these)

Repeat task 23/24 for any of: German (de), Italian (it), Japanese (ja), Chinese (zh), Hindi (hi), Arabic (ar). Use the equivalent phrase in that language.

d) **Expected result:** Each language tested triggers the correct tab change.

- [ ] OK
- [ ] ERROR
- [ ] Skipped (don't speak any of those languages)
Comments: which language(s) tested + result _______________________________

---

## Section 9 -- High contrast + zoom

### Task 26

a) Open `https://yujin.app/nac-spec/`
b) Press Ctrl++ (Ctrl and plus key) until the zoom level reaches 200%.
c) Scroll through the entire page.
d) **Expected result:** All text is readable. Buttons remain clickable. No text gets cut off or overlaps with other elements. No horizontal scroll bar appears at any point.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task 27 (Windows only)

a) Press Left Alt + Left Shift + Print Screen to turn on Windows High Contrast mode.
b) Switch to your browser.
c) Look at the page.
d) **Expected result:** The page still works. Text is visible (white on black or similar high-contrast). Buttons have visible borders. Links are visible. Nothing becomes invisible.

After this task, press the same keyboard shortcut to turn high contrast off.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section 10 -- Deploy verification (URLs respond)

### Task 28

For each URL below, open it in the browser. Check that it loads (no 404, no blank page).

| URL | OK? |
|-----|-----|
| https://yujin.app/nac-spec/ | [ ] |
| https://yujin.app/nac-spec/SPEC.md | [ ] |
| https://yujin.app/nac-spec/js/nac.js | [ ] |
| https://yujin.app/nac-spec/js/nac-chat-client.js | [ ] |
| https://yujin.app/nac-spec/example.php | [ ] |
| https://yujin.app/nac-spec/example-v21-data-table.php | [ ] |
| https://yujin.app/nac-spec/example-v22-interop.php | [ ] |
| https://yujin.app/nac-spec/demos/react/ | [ ] |
| https://yujin.app/nac-spec/demos/angular/ | [ ] |

If any URL fails: _______________________________

- [ ] All OK
- [ ] At least one ERROR (see notes above)

---

## SIGN-OFF

```
Release tag tested:   v____._.___
Tester name:          ______________________________
Date tested:          ____-____-____
Browsers used:        [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Operating system:     [ ] Windows  [ ] macOS  [ ] Linux
Screen reader tested: [ ] NVDA  [ ] JAWS  [ ] VoiceOver  [ ] None
Total tasks walked:   ___ of 28
Tasks marked ERROR:   ___

Signature: _______________________________
```

Send this completed file to the maintainer.

---

## See also

- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- the technical version of this checklist for developers.
- [HUMAN_OK_CHECKLIST_TESTER.es.md](HUMAN_OK_CHECKLIST_TESTER.es.md) -- Spanish version.
- [ACCESSIBILITY.md](ACCESSIBILITY.md) -- the accessibility commitment.
