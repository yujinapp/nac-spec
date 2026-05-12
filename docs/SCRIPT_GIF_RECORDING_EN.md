# How to record the NAC3 hero GIF -- English script

**For:** someone with marketing/image experience but no technical background.
**Total estimated time:** 30 to 45 minutes (includes install + multiple recording attempts).
**Output:** a `.gif` file 10 to 15 seconds long, smaller than 2 MB.
**Where it will be used:** as the main image of the public launch announcement (Show HN, X, LinkedIn).

---

## Part A -- Preparation (10 minutes)

### A1. Install the recording tool (ScreenToGif)

ScreenToGif is a free Windows application for recording the screen as a GIF.

1. Open your browser (Chrome, Firefox, whatever you use).
2. Go to: `https://www.screentogif.com/`
3. Find the blue **"Download"** button in the middle of the page and click it.
4. The page offers several formats. Pick the one that says **"Installer"** (the `.exe` file). If it offers "Portable", that works too, but Installer creates a desktop shortcut for you.
5. Wait for the download to finish (approximate size 13 MB).
6. Find the downloaded file in your Downloads folder. It is called something like `ScreenToGif.X.Y.Setup.exe`.
7. Double-click the file.
8. Windows may ask **"Do you want to allow this app to make changes?"**. Click **"Yes"**.
9. The installer opens. Click **"Install"** and then **"Next"** until the end.
10. At the end, check the **"Launch ScreenToGif"** option and click **"Finish"**.

ScreenToGif opens. You will see a small window with 4 big buttons: **Recorder**, **Webcam**, **Board**, **Editor**. Leave it open.

### A2. Open Chrome with the NAC3 demo

1. Open Google Chrome. **Important:** it must be Chrome (not Firefox, not Safari). The browser with the best compatibility for this recording.
2. Press the keys **Ctrl + Shift + N** together. That opens a Chrome window **in incognito mode** (this is so no browser extensions interfere).
3. In the address bar of the incognito window, type exactly this address:
   ```
   https://yujin.app/nac-spec/example-v21-data-table.php
   ```
4. Press Enter.
5. Wait 5 seconds for everything to load.

What you should see on screen:
- Top left there is a Japanese sumi-e drawing + the text "NAC".
- In the middle there is a white box with text + a blue button that says **"Edit invoice #INV-001"**.
- On the right side there is a chat panel with several buttons (mic, hands-free, send, etc).

If the screen does not look like this, refresh with **Ctrl + F5** and wait again.

### A3. Configure the demo before recording

1. Look at the chat panel (right side of the screen). At the top of the panel there is a tiny dropdown menu with a 2-letter code (it may say "en" or "es"). Click that dropdown.
2. **Choose the "en" code** (English).

   **Note for the recorder:** we will record while saying a sentence in ENGLISH because the video will travel internationally (Hacker News, X). It must be in English even if your native language is Spanish.

3. Click the blue **"Edit invoice #INV-001"** button in the center of the page.

   After the click, a large window will appear in the middle of the screen with a table inside and two tabs at the top that say "Lines (collection)" and "Permissions (matrix)".

4. **Important:** note mentally how many rows the table has right now. For example: "it has 3 rows". We need this for the expected result of the recording (the table should have ONE more row after speaking to the microphone).

### A4. Arrange the window for recording

1. Resize the Chrome window to a comfortable size: approximately 1280 pixels wide by 800 pixels tall. It does not need to be exact, what matters is that the window + modal + chat panel are visible without the browser being maximized.
2. Position the window in the center of the screen. The tab bar + address bar of the browser stay visible at the top.
3. **DO NOT maximize** the Chrome window. It must be in "windowed" mode, not full-screen.

---

## Part B -- Recording (15 minutes, multiple attempts expected)

### B1. Open ScreenToGif and position the capture rectangle

1. If you closed ScreenToGif, open it again (it should be in the Start menu or on the desktop).
2. In the main ScreenToGif window, click the first big button: **"Recorder"**.
3. A semi-transparent rectangle with a red border appears over the screen. That is the area that will be recorded.
4. Adjust that rectangle by dragging the edges and corners. It must cover:
   - The modal with the table and tabs
   - The complete chat panel on the right
5. **DO NOT include** inside the rectangle:
   - The browser tab bar
   - The address bar
   - The bookmarks bar
   - The Windows Start menu bar
6. The ideal rectangle covers only the relevant content: table + chat. Imagine it is a "frame" around what you want to show.

### B2. Configure FPS and format

1. In the bottom bar of ScreenToGif (inside the capture rectangle) there is a numeric field that says **"FPS"** or **"Frames per second"**.
2. Change that number to **15**. It is the ideal: smooth enough to look good, but small files.

### B3. The recording (attempt 1)

**Important:** you will have 12-15 seconds to do everything. Practice once without recording first.

1. Click the **"Record"** button (red, bottom right of the capture rectangle).
2. ScreenToGif gives you a **3-second countdown** before it starts recording (3... 2... 1...).
3. **When it starts recording** (you will see the counter rising in 0, 1, 2, ... seconds), do EXACTLY in this order:
   a. **Second 0-1:** stay still, just let the modal with the table be visible.
   b. **Second 1-2:** move the mouse toward the **"mic"** button of the chat panel (it is the first button above the chat text field).
   c. **Second 2-3:** click on **"mic"**. The button will change color or a recording indicator will appear.
   d. **Second 3-8:** **say the following sentence clearly in ENGLISH**:
      > **"Add a monitor, quantity one, price two hundred fifty."**
      
      Speak calmly, clearly, without rushing. If you stumble, let it record anyway and do a second attempt later.
   e. **Second 8-10:** stay still. The microphone will turn off by itself, or click "mic" again if it is still recording. The transcript of what you said will appear in the chat.
   f. **Second 10-12:** look at the table. A new row should appear at the end that says something like "Monitor / 1 / 250".
   g. **Second 12-15:** stay still for one more second showing the new row.

4. Click **"Stop"** (square, where "Record" was before) to end the recording.

5. ScreenToGif automatically opens the **Editor** with the recorded video in frames format.

### B4. Review the recorded video

1. In the editor, you will see a timeline with all the frames.
2. Click **"Play"** (triangle at the top left) to see the result.
3. If:
   - **It is perfect** (the sentence is understood, the row appears): proceed to step B5.
   - **Something went wrong** (the transcription does not add the row, you stumbled, the row did not appear, the chat did not respond): close the editor without saving and go back to step B3 to try again. It is normal to make 3-5 attempts. Do not get frustrated.

### B5. Trim the video if it ended up too long

1. If the video lasted more than 15 seconds, trim the initial or final seconds that are redundant.
2. In the timeline below, select the frames you want to delete by dragging.
3. Press the **Delete** key to remove them.
4. Press Play again to verify that the result looks good.

---

## Part C -- Export (5 minutes)

### C1. Export as GIF

1. In the editor top menu, click **"Save as"** or **"File" -> "Save as"**.
2. Choose format **"Gif"** (not MP4, not WebM, not APNG -- it must be GIF).
3. Fill in:
   - **File name:** `nac3-hero-voice-en.gif`
   - **Save to:** Desktop (easier to find later).
4. Click **"Save"**.
5. Wait a few seconds for the export to finish.

### C2. Verify the file size

1. Go to the Desktop.
2. Find `nac3-hero-voice-en.gif`.
3. Right-click on the file -> **"Properties"**.
4. Look at the **"Size"** of the file.
5. If it is LESS THAN 2 MB: perfect, we are done.
6. If it is MORE THAN 2 MB: proceed to step C3 (compression).

### C3. Compress if it is more than 2 MB

There are 2 options to reduce the size:

**Option A: Recompress in ScreenToGif**

1. Go back to the ScreenToGif editor (with the original GIF loaded).
2. In the top menu: **"Image" -> "Reduce frame count"**.
3. Adjust the slider to remove half of the frames.
4. Click "Apply" + Save as GIF again with the same name.

**Option B: Compress online with gifski**

1. Open https://gif.ski
2. Drag your GIF file onto the page.
3. Wait for it to process (15-30 seconds).
4. Download the result.
5. Replace the original file on your Desktop.

---

## Part D -- Delivery

1. Send the `nac3-hero-voice-en.gif` file by email to `pablo.kuschnirof@gmail.com` with the subject **"NAC3 hero GIF -- ready"**.
2. If the file weighs more than 25 MB and email does not let you attach it (strange, should not happen): upload it to Google Drive and share the link.

---

## Final checklist before delivery

- [ ] The GIF lasts between 10 and 15 seconds.
- [ ] The voice is clearly heard saying the sentence.
- [ ] The moment when the new row appears in the table is visible.
- [ ] The file size is less than 2 MB.
- [ ] The filename is `nac3-hero-voice-en.gif`.

If all that is checked, you are done. Thanks!
