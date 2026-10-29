# Chorusborn — three-minute demo recording script

Target final cut: **2:50**, with a ten-second margin below three minutes.
The narration is 329 words by the repository's word-count check: approximately
2:32–2:38 at 125–130 words per minute, before pauses. Time your own read.
Timestamps below are editing targets, not a requirement to
complete each network request or the whole match in real time. Read only the quoted
paragraphs aloud. A [clean voiceover copy](demo-voiceover.txt) has no directions.

Record the screen in short clips first, then record your voice one paragraph at a
time and place it over the matching clips. Keep this cue sheet on a second screen
or outside the area being captured. The spoken script is also suitable for a
teleprompter; the directions are for you, not for the audience.

## Before recording

1. Open [the hosted studio](https://chorusborn.vercel.app),
   [developersimiyu's Twitch chat](https://www.twitch.tv/developersimiyu) and
   [the viewer guide](https://chorusborn.vercel.app/guide).
2. Confirm **Chat live**, compiler availability and remaining model budget. Rehearse
   receiving and compiling a real message before filming; a configured key or a
   passing mocked test alone is not that end-to-end evidence. Reuse a received
   proposal for retakes instead of repeatedly sending/compiling the same lesson.
3. Use this command, provided the champion has not already adopted the same tactic:

   ```text
   !teach When carrying the core, head home and use shield when ready.
   ```

   If that behavior is already present, choose a different supported lesson from
   the guide and replace the quoted example in the narration to match the actual
   message. Keep existing playbooks; an identical rule is not an improvement demo.
4. Arrange the rivalry with **serleusler**: each streamer signs into their own Twitch
   account in a separate browser profile/private session or on their own device.
   Both use the hosted app. Ordinary tabs in one browser profile share the same
   coach cookie. Receive, compile, test and adopt each channel's lesson through
   that channel's own studio before readying the filmed match.
5. Have the read-only **Open overlay** view ready. Record one complete real round,
   including its result. The final video can use short clips from that round; add
   **Match highlights · cuts** while compressing it. Use its actual outcome.
6. Prepare this actual Codex build chat, a relevant code diff and the
   [completed green workflow](https://github.com/simiyu-samuel/chorusborn/actions/runs/40832268171).
   Show selected safe turns/files; keep credential files, OAuth URLs and account
   settings out of the capture. Record at a readable desktop resolution, with game
   sound quiet under the narration. Keep loading waits and repeated navigation out
   of the final cut.

## 0:00–0:15 — the hook

**Show:** A short clip of the actual arena: core contest, a confirmed hit, shield,
or delivery. Then show the Chorusborn name. Use game footage for the action; the
generated thumbnail may be a title card but is not a gameplay screenshot.

> What if Twitch chat could teach a champion how to fight, and test its ideas before the next round? I'm Simiyu Samuel, and this is Chorusborn: raised by chat, proven in the arena.

**Small caption:** Raised by chat. Proven in the arena.

## 0:15–0:33 — who uses it

**Show:** The hosted studio, **Connected as developersimiyu**, then the champion's
channel name and arena. Briefly show the viewer guide's teaching examples.
Sign in before this take; the OAuth login itself does not need the full screen time.

> Each streamer connects their Twitch account and gets a champion named after their channel. Their community becomes the coaching staff. In Core Run, champions compete to capture a core and bring it home.

**Small caption:** One streamer. One champion. A community of coaches.

## 0:33–0:55 — real Twitch teaching

**Show:** The exact `!teach` command in Twitch chat, then that same message and its
actual author in Chorusborn's **Live lesson queue**. Click **Compile lesson** and
show the accepted interpretation and rule. Cut the provider wait if necessary.
If you send the command yourself, caption it **Broadcaster test message**; do not
present it as an independent viewer contribution. Do not substitute a sample card
for the actual Twitch message.

> Here's a lesson sent through Twitch chat: "When carrying the core, head home and use shield when ready." EventSub brings it into this channel's review queue, with its author attached. I compile it into a proposed rule using OpenAI's GPT-OSS model, served by Groq.

**Small caption:** Twitch chat → EventSub → proposed rule

## 0:55–1:22 — the signature replay test

**Show:** Choose **Carrier dilemma · starts with the core**, then use
**Prove community lesson** on the actual compiled proposal. Show both branches,
their shared starting state, the replay timeline and reported results. Seek to a
readable action/receipt; use the observed result even if it reveals a trade-off.
Do not use a sample trial or pretend this authored scenario is a rewind of the
live match. A neutral-opening test is another supported choice, but its caption
and spoken scenario description must match the footage.

> Before accepting it, I can test it. These replay branches begin from the same authored scenario. One uses the current playbook; the other adds the proposed lesson. I can scrub through their actions and compare the results. This tests a specific situation, not a promise that the tactic always wins.

**Small caption:** Same starting state. One changed playbook.

## 1:22–1:39 — coach approval and attribution

**Show:** Click **Adopt for next round**, show the adoption confirmation and updated
playbook version. Use a brief later clip of that rule actually executing and its
real author credit. If the current round is running, adoption must not change its
locked book. For a training take, use **Reset arena for next round**, then
**Start round** to load the adopted version. For rivalry, both coaches ready the
next round instead. Film enough footage to capture a genuine execution; credits
are brief and are not continuously visible.

> I adopt the lesson for the next round. The current match keeps its locked playbook. When the new rule actually executes, Chorusborn credits the person who taught it.

**Small caption:** Proposed → tested → adopted → used

## 1:39–2:09 — two communities, one match

**Show:** In **Streamer vs streamer**, enter `serleusler` and **Send challenge**.
Capture the invited streamer's acceptance and both **Ready for rivalry** actions.
Then show the shared read-only overlay with both channel names: opening contest,
possession/fighting, a rule-use credit if it occurs, and the actual score/result.
Use cuts or a labeled speed-up to fit a real sixty-second round into this slot.
Both studios must be independently authenticated; the baseline training opponent
is not a second community. A win is not necessary to demonstrate the product.

> Now two streamers can challenge each other. Both must agree and ready their champions, and their communities' playbooks meet in one shared arena. The first to three captures wins, with a sixty-second limit. Streamers show this read-only overlay in OBS, while viewers keep teaching through chat. Win or lose, there's something concrete to discuss, revise, and try in the rematch.

**Small captions:** Two Twitch channels · Separate playbooks · Shared arena

## 2:09–2:38 — show how Codex built it

**Show:** This real build chat, then a relevant implementation/diff, then the green
workflow. Good evidence: the explicit tie-initiative/possession repair, Twitch
EventSub code, or the recent test-isolation and overlay fixes. Keep the chat and
code readable with short, deliberate zooms. Do not stage a fake Codex exchange.

> I built this solo with OpenAI Codex. It helped me develop the simulation, Twitch integration, lesson compiler, replays, character animations, and deployment. When equal core claims exposed unfair behavior, I used Codex to debug the engine and add regression tests. The complete checks now pass a hundred and two unit tests and eighteen browser tests.

**Small caption:** Built with OpenAI Codex · 102 unit tests · 18 browser tests

The counts above are verified for application commit `c080fd0`. If implementation
changes alter the suite before recording, use the then-verified counts in both
voiceover and captions.

## 2:38–2:50 — close on the product

**Show:** Actual match result or playbook, then a clean end card with the name,
live URL and repository. Hold the URL visibly for the last few seconds; the spoken
URL is optional if it makes your read exceed the time target.

> Chorusborn turns a chat message into a testable tactic, and a community into a champion's coaching staff. Try the prototype at chorusborn dot vercel dot app.

**End card:**

```text
CHORUSBORN
Raised by chat. Proven in the arena.
chorusborn.vercel.app
github.com/simiyu-samuel/chorusborn
Built by Simiyu Samuel with OpenAI Codex
```

## Final recording pass

- Time the exported video, including title/end cards; keep it below 3:00.
- Make chat text, author attribution, proposed rules and replay labels readable.
- Preserve labels for authored scenarios, broadcaster test messages and match cuts.
- Include actual Twitch delivery and actual Codex build footage.
- Use the recorded result; rule use is not proof that a viewer caused a win.
- This document is a script, not evidence that the hosted two-community video has
  already been recorded, published or submitted.
