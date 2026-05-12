# NAC3 v2.2 -- Tester checklist: voice + chat

**For:** the human tester focused on voice + chat behavior.
**Time:** ~30-45 minutes.
**Pre-requisite:** working microphone + speakers/headphones.

## Instructions

For each task:

1. Read step a, b, c, d in order.
2. Do exactly what step a says, then b, then c.
3. Compare what you see/hear with the "Expected result" in d.
4. Mark `[X]` in **OK** if matches; mark `[X]` in **ERROR** + write what actually happened.
5. Do not skip. If a task fails, continue to the next one.

---

## Section A -- Chat panel basics

### Task A1 -- Open the chat panel

a) Open Chrome incognito (Ctrl+Shift+N).
b) Go to `https://yujin.app/nac-spec/`.
c) Find the chat panel (usually a circular bubble bottom-right; click it to expand). If already expanded, skip this click.
d) **Expected result:** A chat panel opens on the right side of the screen. It has: a header with "Yujin chat" text, a language selector dropdown, a text input box at the bottom, a Send button, and a microphone button next to the input.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task A2 -- Send a text question

a) Click into the chat input box.
b) Type: `que es NAC3?`
c) Click the Send button (or press Enter).
d) **Expected result:** Within 5-15 seconds, the chat shows a response in Spanish (because the message was in Spanish). The response explains what NAC3 is. The response is at least 2 sentences long. No red error message appears.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task A3 -- Send another question in English

a) In the same chat, type: `how do I install NAC3?`
b) Press Enter.
c) Wait for response.
d) **Expected result:** The response comes back in English. It mentions `npm install @nac3/runtime` or a similar install command.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section B -- Voice input (microphone)

### Task B1 -- First mic activation (permission grant)

a) Click the microphone button next to the chat input.
b) The browser will ask for microphone permission. Click "Allow".
c) Notice the button visual state.
d) **Expected result:** The microphone button changes appearance (color, animation, or icon) to indicate it is actively listening. There may be a visible "recording" indicator.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task B2 -- Speak in Spanish

a) With the microphone active, speak clearly: **"hola"** (just one word).
b) After ~2 seconds of silence, the recording auto-stops (or click the mic button again to stop).
c) Wait 3-5 seconds.
d) **Expected result:** The chat panel shows the transcribed word "hola" (or close to it). A response from the chat appears in Spanish within 10 seconds.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task B3 -- Voice in English

a) Click the microphone button again.
b) Speak clearly: **"what is NAC3"**.
c) Wait for response.
d) **Expected result:** Transcription shows "what is NAC3" (or close). Response in English.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task B4 -- TTS (text-to-speech) audio playback

a) After Task B3's response appears, listen carefully to your speakers.
b) Pay attention during the 5 seconds after the response appears in the chat.
d) **Expected result:** A clear English voice reads the response aloud through your speakers. The voice is natural-sounding (not robotic-broken).

- [ ] OK
- [ ] ERROR
- [ ] No audio heard
Comments: _______________________________

---

## Section C -- Voice dispatch on data-table demo

### Task C1 -- Load the data-table demo

a) Go to `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Wait 5 seconds for full load.
c) Locate the chat panel and the tabs across the top of the data table.
d) **Expected result:** The page shows multiple tabs (at least "Lines (collection)" and "Permissions"). Chat panel is visible.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task C2 -- Tab switch by voice (Spanish)

a) Click the microphone button.
b) Speak: **"ve a permisos"**.
c) Wait up to 5 seconds.
d) **Expected result:** The tab "Permisos" (or "Permissions") becomes active. The visible content area changes.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task C3 -- Tab switch by voice (English)

a) Click the microphone.
b) Speak: **"go to lines"**.
c) Wait.
d) **Expected result:** The "Lines (collection)" tab activates.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task C4 -- Add a row by voice

a) Click microphone.
b) Speak slowly: **"agrega una linea con concepto leche cantidad dos precio cien"**.
c) Wait up to 10 seconds.
d) **Expected result:** A new row appears in the data table with: concept = "leche" (or "milk"), quantity = 2, price = 100 (or similar parsing).

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task C5 -- Read aggregate by voice

a) Click microphone.
b) Speak: **"cuanto total hay?"** (or "what is the total?").
c) Wait for response.
d) **Expected result:** The chat responds with a numeric value matching the sum of the visible rows. The TTS reads the number aloud.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section D -- Voice dispatch on React + Angular demos

### Task D1 -- React demo: voice-add

a) Go to `https://yujin.app/nac-spec/demos/react/`.
b) Wait 5 seconds.
c) Click microphone in the chat panel.
d) Speak: **"agrega leche"**.
e) Wait 5 seconds.
d) **Expected result:** A todo item "leche" (or "milk") appears in the todo list.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task D2 -- React demo: voice-delete

a) In the same demo, click microphone.
b) Speak: **"borra leche"**.
c) Wait 5 seconds.
d) **Expected result:** The "leche/milk" item disappears from the list.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

### Task D3 -- Angular demo: same flows

a) Go to `https://yujin.app/nac-spec/demos/angular/`.
b) Repeat Task D1 and D2 on this demo.
c) Compare behavior to React demo.
d) **Expected result:** Identical behavior -- voice-add works, voice-delete works.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## Section E -- Multi-language voice (only test languages you speak)

For each language you actually speak, do the test below. Skip otherwise.

### Task E1 -- Portuguese

a) Go to `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Change the chat language to "pt" (Portuguese) via the dropdown.
c) Click microphone, speak: **"vai para permissoes"**.
d) **Expected result:** Permissions tab activates. Chat response in Portuguese.

- [ ] OK
- [ ] ERROR
- [ ] Skipped (don't speak Portuguese)
Comments: _______________________________

### Task E2 -- French

a) Change language to "fr".
b) Speak: **"va aux permissions"**.
c) Observe.
d) **Expected result:** Permissions activates. Response in French.

- [ ] OK
- [ ] ERROR
- [ ] Skipped
Comments: _______________________________

### Task E3 -- German

a) Change language to "de".
b) Speak: **"gehe zu berechtigungen"**.
c) Observe.
d) **Expected result:** Permissions activates. Response in German.

- [ ] OK
- [ ] ERROR
- [ ] Skipped
Comments: _______________________________

### Task E4 -- Other (it / ja / zh / hi / ar)

For any other language you speak from {Italian, Japanese, Chinese, Hindi, Arabic}, run the same test with the equivalent "go to permissions" phrase.

- [ ] OK
- [ ] ERROR
- [ ] Skipped
Language tested: ______________
Comments: _______________________________

---

## Section F -- Locale-switch trap (regression guard)

### Task F1 -- The "de" preposition trap (Spanish)

a) Go to `https://yujin.app/nac-spec/example-v21-data-table.php`.
b) Make sure chat is in Spanish ("es") in the language dropdown.
c) Click microphone, speak: **"cambia de pestana"** (Spanish for "switch tab" -- "de" is the Spanish preposition, NOT German).
d) Wait for response.
d) **Expected result:** The chat does NOT switch to German. The language dropdown stays at "es". The chat may answer in Spanish asking for clarification, or it may switch tabs -- both are OK. The forbidden outcome is "language switched to German".

- [ ] OK (stayed in Spanish)
- [ ] ERROR (switched to German -- regression!)
Comments: _______________________________

### Task F2 -- Explicit language switch (allowed)

a) Click microphone.
b) Speak: **"cambia el idioma a aleman"** (explicit "change the language to German").
c) Wait.
d) **Expected result:** The chat language switches to "de" (German). This IS the legitimate trigger.

- [ ] OK
- [ ] ERROR
Comments: _______________________________

---

## SIGN-OFF (voice + chat)

```
Release tag:        v____._.___
Tester name:        ______________________________
Date:               ____-____-____
Browser:            [ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge
Mic + speakers OK:  [ ] yes  [ ] no
Languages tested:   __ , __ , __ , __ , __ , __
Tasks walked:       __ of 23
Tasks marked OK:    __
Tasks marked ERROR: __
Overall verdict:    [ ] ready  [ ] needs fixes  [ ] blocking issues

Top 3 issues (if any):
1. _______________________________
2. _______________________________
3. _______________________________

Signature: ______________________________
```

---

## See also

- `TESTER_CHECKLIST_VISUAL.md` -- visual layout evaluation.
- `TESTER_CHECKLIST_VOICE_CHAT.es.md` -- Spanish version of this file.
- `HUMAN_OK_CHECKLIST_TESTER.md` -- general functional checklist.
