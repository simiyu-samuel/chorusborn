# Chorusborn — OBS setup and recording guide

Use this with the [timed demo script](demo-recording-script.md) and
[clean narration](demo-voiceover.txt). The finished video targets **2:50**; raw
recording can be much longer. These are suggested settings for this demo, not a
claim that OBS has been configured or tested on your computer.

## 1. Set up OBS for a local recording

Open OBS Studio. If it is not installed, use the [official download page](https://obsproject.com/download).
Run **Tools → Auto-Configuration Wizard** and choose the option to optimize just
for recording. You do not need to connect OBS to Twitch to make this YouTube demo.
Use **Start Recording** when filming. [OBS quick start](https://obsproject.com/kb/quick-start-guide).

Create a profile named **Chorusborn Demo** under **Profile → New** and a scene
collection with the same name under **Scene Collection → New**. This keeps your
demo settings and layouts together without replacing another recording setup.

Open **Settings** and use this starting point, then **Apply → OK**:

| Location | Suggested value |
| --- | --- |
| Video → Base (Canvas) Resolution | 1920×1080 for a 16:9 demo |
| Video → Output (Scaled) Resolution | 1920×1080; try 1280×720 if the test stutters |
| Video → Common FPS Values | 30 |
| Output → Output Mode | Simple |
| Output → Recording Path | Create/select a local folder such as `~/Videos/Chorusborn` |
| Output → Recording Quality | High Quality, Medium File Size |
| Output → Recording Format | Matroska Video (.mkv) / MKV |
| Output → Video Encoder | Hardware H.264 if offered and working; otherwise Software (x264) |
| Audio → Sample Rate | 48 kHz |

Use a browser window with a similar 16:9 shape. Enlarging a small source will not
create sharper text; zoom the page until the rule and chat are readable. These
resolution/frame-rate choices favor readable UI and manageable recording load.
[OBS video and encoder settings](https://obsproject.com/kb/obs-studio-overview).

MKV protects more of the recording if OBS closes unexpectedly; convert the
finished capture to MP4 through OBS afterward. The encoder choices depend on your
hardware. [OBS recording formats and remuxing](https://obsproject.com/kb/standard-recording-output-guide).

**For pause to work:** choose a recording quality other than **Same as stream**.
In Advanced output mode, do not use **(Use stream encoder)** for recording.
OBS explicitly warns that those settings prevent pausing.
[Official OBS setting labels and warnings](https://raw.githubusercontent.com/obsproject/obs-studio/master/frontend/data/locale/en-US.ini).

## 2. Set up your microphone once

In **Settings → Audio**, select your actual microphone for **Mic/Auxiliary Audio**.
Disable other unused microphone devices. For the easiest narration take, disable
Desktop Audio too; you can add quiet game audio later. If you want game sound in
the take, enable only the output device you are using and wear headphones.

Speak normally and watch the microphone meter. As a practical starting target,
let speech peak around **−12 to −6 dB**, without hitting red. Listen to the test
file before deciding it sounds right. Keep the microphone in the same position
throughout the take.

With the microphone selected globally, do not add a second source capturing that
same mic in each scene: duplicate capture can produce an echo. Global microphone
capture lets narration continue across your scenes.
[OBS audio-source guidance](https://obsproject.com/kb/audio-sources).

## 3. Prepare your browser and four scenes

A **scene** is the layout you record. A **source** is one item in it, such as a
window, web page, image or text. Use **+** in the Scenes dock to create each scene,
then **+** in Sources to add its capture. Fit the source using its right-click
**Transform → Fit to screen** menu; crop with **Transform → Edit Transform** if
needed. Use the source's lock icon after positioning it.
[OBS source layout controls](https://obsproject.com/kb/sources-guide).

Keep **Studio Mode off** for your first recording: clicking a scene then changes
the recorded layout directly. Choose **Cut** in Scene Transitions for clean changes.

| Scene name | What to put in it | Demo use |
| --- | --- | --- |
| `01 Demo browser` | Capture one dedicated browser window containing the hosted studio, viewer guide, Twitch chat and GitHub checks as tabs | Setup, teaching, proof, adoption and CI |
| `02 Arena` | Browser source using your own read-only **Open overlay** URL, or capture a separate browser window displaying that overlay | Opening action and rivalry |
| `03 Codex build` | Capture the Codex app window, positioned on a safe build turn or relevant code | Actual Codex development evidence |
| `04 End card` | Dark Color source, Text source with the title, live URL, repo and solo credit; optional Image source with the thumbnail | Closing card |

### Capture the browser and Codex windows

For `01 Demo browser`, open a dedicated browser window on
[the hosted studio](https://chorusborn.vercel.app), sign in before filming, and add
the guide, [Twitch chat](https://www.twitch.tv/developersimiyu) and
[green workflow](https://github.com/simiyu-samuel/chorusborn/actions/runs/40832268171)
as tabs. Keep the rival coach in their own browser profile/session or device.

On Linux, use the available **Window Capture (Xcomposite)** for an X11 session or
the **PipeWire** capture option for a Wayland session. If a desktop sharing chooser
appears, select the intended window. Names vary by package and desktop. On
Windows use **Window Capture**; on current macOS use **macOS Screen Capture**.
[OBS window-capture options](https://obsproject.com/kb/window-capture-sources).

The inbuilt Codex browser is part of the Codex app window. Capturing that window
can include the chat, editor and sidebars; OBS does not automatically isolate its
selected embedded tab. Either crop precisely and keep that layout fixed, or use
the dedicated external browser window above for clearer product footage. Capture
Codex separately in scene `03`. Keep this guide on a second screen, phone or paper.

**Tabs versus windows:** changing a tab in the captured window changes what OBS
sees. Switching to another app/window does not retarget that source. To show a
different window, switch to its scene or pause and change the source's Properties.
Two scenes pointing at the same window do not remember separate browser tabs.

### Add the clean arena overlay

In your studio click **Open overlay**. Copy that complete URL privately. In scene
`02 Arena`, add **Browser**, name it `Arena web view`, and paste the URL into its
Properties. Set **Width 1920**, **Height 1080**. Leave **Shutdown source when not
visible** and **Refresh browser source when scene becomes active** off to avoid
unnecessary unloads/reloads between scenes. [OBS Browser source properties](https://obsproject.com/kb/browser-source).

That source has its own browser session; use the read-only overlay URL, rather
than expecting your authenticated coach studio to be logged in there. Keep its
key-bearing URL out of the filmed frame and public notes. If Browser source is
unavailable or the arena appears blank, capture a dedicated regular browser
window showing the working overlay instead. Confirm both champion names and the
lower-third credits fit in the preview before filming.

### Make the end card

In scene `04 End card`, add a dark **Color Source**, then a **Text** source above
it (on Linux the text source may be labeled **Text (FreeType 2)**). Paste:

```text
CHORUSBORN
Raised by chat. Proven in the arena.
chorusborn.vercel.app
github.com/simiyu-samuel/chorusborn
Built by Simiyu Samuel with OpenAI Codex
```

Center it and check the URL is readable. Optionally add the
[project thumbnail](media/chorusborn-devpost-thumbnail.png) as an Image source.
It is 3:2: fit it within the 16:9 canvas rather than stretching it. Keep text above
the image in the Sources list. This artwork is a title/end card, not gameplay.

## 4. Add and test your own hotkeys

Go to **Settings → Hotkeys**, click a field, press the chosen combination, then
**Apply → OK**. These are suggestions you must assign, not OBS defaults:

| Action | Suggested combination |
| --- | --- |
| Start Recording | Ctrl + Shift + F6 |
| Stop Recording | Ctrl + Shift + F7 |
| Pause Recording | Ctrl + Shift + F8 |
| Unpause Recording | Ctrl + Shift + F9 |
| Switch to scene `01` / `02` / `03` / `04` | Ctrl + Shift + F1 / F2 / F3 / F4 |

Separate pause and unpause keys make their intent explicit. Avoid combinations
already used by your desktop or browser. Test while the browser has keyboard
focus as well as while OBS has focus. Scene hotkeys are configurable in OBS.
Some laptop keyboards also require Fn to send function keys.
[OBS hotkey settings](https://obsproject.com/kb/obs-studio-overview).

On some Linux/Wayland setups, OBS hotkeys do not work outside the focused OBS
window. This is a reported limitation, not proof your installation has it. If
your test fails, use the Controls buttons in OBS instead of relying on global
hotkeys. Window capture helps keep OBS controls outside your video.
[OBS issue tracking the Wayland behavior](https://github.com/obsproject/obs-studio/issues/13169).

## 5. Start, pause, change screen, resume

Use this exact practice sequence before the real take:

1. Select `01 Demo browser` and put the studio on the intended page. Check preview
   framing and the microphone meter.
2. Click **Start Recording**. Confirm OBS shows recording activity. Return to the
   browser, leave a short beat, then speak or demonstrate the first action.
3. Finish the sentence. In OBS click the small **pause** button beside **Stop
   Recording**, or use your tested **Pause Recording** hotkey. Confirm the paused
   indicator; do not assume the key worked.
4. While paused, change the browser tab, prepare the next page, scroll to the
   right position, or select another OBS scene. Check the preview again.
5. Click the pause/resume control again, or use your **Unpause Recording** hotkey.
   Confirm recording has resumed, return to the captured window, leave a beat,
   and continue. Trim any extra lead-in later.
6. Repeat between sections. At the very end click **Stop Recording**, wait for
   completion, then choose **File → Show Recordings** and play the file.

Pause keeps the current file open and omits that interval's recorded audio/video;
it does not insert a black waiting screen. Stop ends the take; the next Start
normally creates a new file. Pausing does not erase a mistake already recorded.
Repeat the sentence and remove the earlier attempt in editing.

**Chorusborn and Twitch continue while OBS is paused.** OBS is pausing the recorder,
not the match, browser, chat intake or compiler. Resume before the action you need.
Record a complete rivalry round without pausing, then cut highlights afterward.
Keep the script's **Match highlights · cuts** label over compressed action.

You can also switch prepared scenes while recording continuously; pause is only
needed when you want to leave preparation/navigation out of the file. In a
window-capture scene, Alt+Tab alone does not change which window is recorded.

### Optional: Studio Mode later

If you turn **Studio Mode** on, the left side is Preview and the right side is
Program, which is the recorded composition. Select the next scene on the left,
then click **Transition** to put it into Program. Selecting it in Preview alone
does not change the recording. This is optional for the demo.
[OBS Studio Mode explanation](https://obsproject.com/kb/obs-studio-overview#studio-mode).

## 6. Follow the script with these scenes

Use the [full cue sheet](demo-recording-script.md) for the spoken words, exact
buttons and captions. The eight time ranges belong to the final edit:

| Final time | Scene / page | Recording action |
| --- | --- | --- |
| 0:00–0:15 | `02 Arena` | Use a short action clip from the actual recorded round. |
| 0:15–0:33 | `01 Demo browser`: studio → viewer guide | Show connected account and champion name; pause before tab changes if needed. |
| 0:33–0:55 | `01`: Twitch chat → studio queue | Record the real command and received message, then compile. Resume before the click so the action is visible. Cut loading waits. |
| 0:55–1:22 | `01`: proof view | Capture both authored replay branches, scrub and result; keep scenario labels visible. |
| 1:22–1:39 | `01`: adoption, then `02` or studio arena | Show approval and a later genuine execution credit. Do not pause through the credit you need to capture. |
| 1:39–2:09 | `01`: rivalry controls → `02 Arena` | Capture both coaches' agreement/readiness, then the complete round. Trim it to this slot with the cuts label. |
| 2:09–2:38 | `03 Codex build` → `01`: GitHub checks | Show actual development evidence and the green workflow. |
| 2:38–2:50 | `02`: actual result → `04 End card` | Finish the final paragraph and hold the URL. |

The easiest polished workflow is **screen footage first, narration second**. Record
the product actions and whole match, then record the clean voiceover paragraph by
paragraph in a separate OBS take with the microphone enabled and Desktop Audio
disabled. In your editor, use only the audio from that narration take over the
matching footage. The narration take can show the end card throughout.

If you prefer speaking during capture, follow the pause sequence between passages.
Keep reading material outside the captured area. Network waits and full matches
can make the raw take exceed three minutes; edit before uploading.

## 7. Check a short test, then export the final demo

First make a **30–60 second practice file**: speak, pause, change a tab, resume,
switch to the arena, then stop. Play it outside OBS. Confirm clear speech, readable
chat/rules, smooth arena action, correct window selection, and the missing pause
interval. If animation stutters, try the app's lower-effects setting if available,
close unnecessary graphics-heavy windows, or lower OBS output to 720p/30 and test
again. Keep the source text readable at that output size.

After the actual recording, use **File → Remux Recordings**: choose the MKV file,
set the MP4 destination, then **Remux**. This changes the container without doing
your editing; it does not cut waits or shorten the video.
[Official remux instructions](https://obsproject.com/kb/standard-recording-output-guide#remuxing).

Import the footage and narration into your video editor, arrange them using the
cue sheet, remove dead time/retakes, and add the specified captions. Export a
16:9 H.264 MP4 with audio, ideally 1080p/30. Watch the entire exported file and
check its actual duration: **below 3:00 including the end card**. Upload that final
file to YouTube as **Public**, then add its working URL to Devpost. Recording,
uploading and final submission are still separate steps to perform.

## Quick fixes

| Problem | What to check |
| --- | --- |
| Pause missing or unavailable | Stop the test; select High Quality instead of Same as stream, or a separate recording encoder in Advanced mode. Start a fresh test. |
| Hotkey works only with OBS focused | Use OBS controls; test the Linux/Wayland behavior described above. |
| Wrong tab/window recorded | A source follows its chosen window; change that window's tab or switch to the scene capturing the other window. |
| Scene seems unchanged | If Studio Mode is enabled, click Transition and inspect Program. |
| Black/blank arena | Verify the private overlay URL in a regular browser; use window capture if OBS Browser source cannot render it. |
| Echo or doubled speech | Capture the mic once; disable duplicate device sources and use headphones. |
| Silent file | Check the chosen device, mixer mute state and recording playback in the practice take. |
| OBS repeats inside itself | You are capturing its display; switch to a specific app window or keep OBS off that captured display. |

Official OBS references reviewed October 30, 2026. Menu names and available devices
can vary with operating system, packaging and version. The practice recording is
the verification for your actual setup; this guide is not evidence of a completed
recording or upload.
