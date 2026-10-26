# UX and broadcast experience

Status: release design specification. The local fixture implements a responsive coach studio at `/`, a replay dialog, playbook/receipt panels, and a read-only `/overlay` route with original SVG champions and arena. Connections & setup supports Twitch OAuth and disconnect, distinguishing account verification from pending chat intake. The routes and onboarding below describe the fuller release target; live chat, public profiles, rivalry, and production role management remain pending.

## Experience hierarchy

The audience should first see **what the champion wants**, then **what the viewer taught**, then **what changed**. Keep technical detail behind inspectable evidence panels rather than across the match screen.

## Routes and surfaces

| Route | Primary user | Main content |
| --- | --- | --- |
| `/` | New streamer/viewer | A short teach/prove/compete explanation and connect/watch actions |
| `/coach/:channel` | Authenticated coach/reviewer | Champion, proposal queue, trial controls, role-appropriate management |
| `/champions/:id` | Public viewer | Champion identity, current published playbook, contribution/history links |
| `/trials/:id` | Coach/public redacted view | Side-by-side replay, metrics, evidence scope, adoption control only for coach |
| `/matches/:id` | Spectator | Arena, score/time, locked versions, concise action receipts |
| `/overlay/:channel` | OBS browser source | Clean read-only training/match view; rotatable read-only access |
| `/settings` | Authenticated owner/contributor | Connections, replies, reviewer roles, overlay rotation, attribution preferences |

## Streamer onboarding

1. Explain the product in one short loop; allow a clearly labeled sample replay without authentication.
2. Connect Twitch and show exactly which channel/identity is authorized.
3. Name the champion, choose from owned cosmetics, and show the baseline playbook.
4. Copy the read-only OBS link; default to a 1920×1080 reference composition.
5. Run a guided training trial and explain `!teach` in chat/overlay.
6. Enable acknowledgement replies only through an explicit setting with the write grant.

Connection failure leaves a useful sample mode with **Simulated Twitch** displayed. It must not masquerade as a real successful connection.

## Coach console

The main pane contains the arena and coach actions. A compact side queue shows lesson text, contributor, status, and shortlist votes. A bottom panel shows the selected lesson's supported meaning and conflicts.

Primary action sequence: **Review → Prove → Adopt for next round**. Distinguish intake pause from match pause. A reviewer can shortlist, moderate, compile, and run a trial, but only a coach adopts or rolls back. Hide unavailable actions and enforce the same authorization on the server.

Always show the active playbook version, the version pinned to a running match, and any change queued for the next round. Stale candidates say **Playbook changed—rerun this trial** rather than offering an adoption button that silently rebases.

## Replay comparison

Two aligned arena views labeled **Current playbook** and **With this lesson** share a tick-based timeline. Include pause, scrub, step, speed, and reset. Display the exact point of behavioral divergence with an inspectable rule-use record.

The evidence card uses plain observations: "Returned the core 4 seconds earlier in this scenario" or "Took less damage, but scored fewer captures across these scenarios." Counts, partitions, versions, and suite coverage are visible. Do not use a magic intelligence percentage. A failed lesson remains inspectable and can be revised.

## Broadcast composition

- Arena dominates the frame; clear labeled team gates, core possession, score, time.
- A lesson card appears during review/trial, then yields space during scored play.
- One brief credit at a time, debounced per rule, driven by real decision IDs.
- Status labels: **Training**, **Lesson trial**, **Rival match**, **Paused**, **Reconnecting**.
- Readable champion and team silhouettes at typical compressed stream quality.
- Safe margins for a webcam overlay and subtitle placement; a compact variant for smaller scenes.
- Local settings for audio level, reduced motion, particle intensity, and credit display.

No provider names, debug traces, OAuth setup text, or model-token counters belong on the broadcast view. They can exist in the authorized operational console where they help the coach resolve an issue.

## Important states

| State | User-facing response |
| --- | --- |
| Unsupported lesson | Explain the missing mechanic and invite a supported reformulation |
| Ambiguous lesson | Ask one concrete clarification; preserve the original proposal |
| Model unavailable/quota exhausted | Keep existing champion playable; show queued/failed state and retry policy |
| Twitch intake disconnected | Continue the current match; indicate commands may have been missed |
| Trial queue full | Show position/capacity; do not promise instant proof |
| Rival leaves | Pause or finish under the pre-agreed match policy; do not silently substitute an opponent |
| Server recovery | Show recovered tick and require coach readiness before continuing |
| No accepted lessons | Play the documented baseline and explain how to teach the first tactic |

## Accessibility

Semantic buttons and labels, full keyboard operation of coach controls, visible focus, contrast checks, non-color team cues, reduced motion, captions for any narration, no essential audio-only information. Use a text summary of trial outcomes and an accessible decision ledger alongside canvas views. Do not announce every tick through a live region; announce important state changes only.

## Playtest script

Give a streamer the product with minimal explanation. Observe whether they can connect, identify the correct channel, select a proposal, interpret a trial, adopt it for the next round, and identify a contribution credit. Then introduce a stale trial and a disconnected intake state. Ask viewers what changed and who contributed it. Record confusion before polishing the copy.
