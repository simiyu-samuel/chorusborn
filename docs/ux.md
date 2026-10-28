# UX and broadcast experience

Status: release design specification. The local build implements a responsive coach studio at `/`, a replay dialog, playbook/receipt panels, and a read-only `/overlay` route with a shared 3D arena, original procedural champions and a labeled SVG compatibility view. Connections & setup supports Twitch OAuth and disconnect. The community queue distinguishes chat readiness, pauses, gaps, actual received lessons awaiting compilation, and removed/rejected proposals. Local two-streamer rivalry, priority controls and paired neutral proofs are implemented. The sign-in-free `/guide`, guide sharing, overlay reminder and explicit private lesson stages are also implemented. The route table below otherwise describes fuller release targets; public profiles and production role management remain pending. The local Groq compiler and source-bound adoption now work; the playable visual slice and remaining graphical work are described in [art direction](art-direction.md).

## Experience hierarchy

The audience should first see **what the champion wants**, then **what the viewer taught**, then **what changed**. Keep technical detail behind inspectable evidence panels rather than across the match screen.

## Routes and surfaces

| Route | Primary user | Main content |
| --- | --- | --- |
| `/guide` | Viewer (implemented) | Sign-in-free rules, copyable teaching examples, priority/initiative and lesson journey |
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

## Implemented local round ending

Training results and the OBS overlay share one semantic result card outside the canvas image
role: authoritative winner/draw, final score, elapsed simulation time, pinned playbook version,
and a table of core possession seconds, cumulative damage taken and recorded lesson executions
for both champions. The short recent-decision ledger is not used to reconstruct full-round
counts. No result claims a lesson caused a victory. The coach has a single **Play again** action;
it atomically resets/starts the same fixture seed with the most recently adopted playbook.
Unfinished-round rematch requests and read-only spectators cannot trigger it.

A compact scoreboard cue marks match point or the final ten seconds during running play only.
An important-state live region announces pause/run/result changes without narrating each tick.
Result audio is opt-in in the coach preview and only admitted from a consecutive running→finished
transition; mounting, seeks and reconnect gaps stay silent. Replay branch views keep the arena
uncovered by the result card; the branch metrics remain their evidence surface.

The read-only overlay has no rematch controls. On socket loss it retains the last observed world,
labels the interrupted signal, and freezes cosmetic animation until a connection opens again.
This is stale-frame handling, not server recovery or durable match history. Full broadcast replay
selection, recorded match history, rivalry and OBS/readability measurements remain pending.

## Implemented viewer onboarding (local)

`/guide` (also `/guide/`) is an anonymous, lazy-loaded guide. It uses original existing SVG
champions in a static home/core diagram, the actual first-to-three/60-second rules, shield and
respawn timings, the explicit tie initiative and English condition/action examples. It explains
trade-offs, cooldowns, priority shadowing, visual-only acrobatics and inconclusive/worse lessons.
Received, reviewed/tested, adopted and used are explained separately; attribution never claims
that an author caused a win. Headings, anchor/skip links, native disclosure FAQs, labelled copy
buttons and selectable manual fallback support keyboard/mobile access. The guide creates no
studio/session by requesting the coach API, and copy does not submit to Twitch or an LLM.

The coach can open/copy the guide from a share card or sidebar. Links use the current origin and
`/guide` only, never the private overlay query. Localhost is explicitly a local preview for sharing.
The overlay shows a static compact command/objective/review reminder plus a safe guide link;
no queue or control authority is sent to spectators. Actual lesson-use credit remains driven by
executed decisions. Its arena height reserves space for the reminder and initiative strip.

The private queue now names each step from current state. Adoption detection joins the owned
published rules to the owner's pinned actor by rule ID (shared worlds redact private source
joins). Positive execution counters produce **Used in this round**; a published-but-unpinned
rule is **Adopted · next round**. Old source text is hidden under moderation, and a current-base
trial only counts as tested when its compilation ID still matches. Counts are not live-announced
every tick. This is not a public per-viewer acknowledgement feed or Twitch bot reply feature.
