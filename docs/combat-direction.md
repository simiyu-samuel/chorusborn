# Combat Lab: acrobatic fighter prototype

Status: **implemented visual prototype, October 28, 2026**. Open `/combat-lab`, or follow
**Combat lab** from the studio. This is a separate, fixed sparring replay for reviewing a
new fighter kit. Live training/replay/OBS retain their current champion models pending review.

## Direction

The owner supplied a stick-figure fighting reference and requested visible fighting, jumps,
acrobatics and a similar character style. Use long articulated limbs, strong silhouettes,
readable kicks, airborne rotations, contact flashes and clear recovery poses. Keep Mica's
violet fins/scarf and Rook's amber horns/mantle as small original identity cues. All meshes,
poses, stage geometry and compatibility SVGs are authored in code. The supplied image is
an inspiration reference; no pixels from it are copied or shipped in the repository.

A close, fixed three-quarter camera and uncluttered sparring deck expose body mechanics for
review. This camera is for the prototype, not the final full-arena broadcast camera.

## What works

| Presentation | Trigger | Gameplay boundary |
| --- | --- | --- |
| Guard stance | Living actor between attacks | No extra armor |
| Aerial kick | A recorded legal tag, with replay anticipation | Cosmetic height; tag range remains 1,000 units |
| Spinning strike | Deterministic variation of a recorded tag | No added attack or damage |
| Somersault strike | Another deterministic recorded-tag variation | No invulnerable frames or special dodge |
| Contact/recoil | Recorded contact tick and target | Health follows the server's resolved damage |
| Shield shell/guard | Authoritative `shieldUntil` | Existing half-damage rule |
| Collapse/respawn | Actual zero health and subsequent lifecycle | Existing forty-tick respawn rule |

The replay offers play/pause, restart, half/normal speed, tick scrubbing and move bookmarks.
Reduced motion suppresses leaps, spins, flips and bursts while preserving readable poses,
health and damage cues. Missing/lost WebGL uses an original SVG compatibility view with the
same replay controls and health data. Audio is not part of this preview.

## Evidence and timing

Core Run **0.1.1** adds a `strike` event containing the attacker, target, contact positions,
post-shield attack damage and shield flag. It is emitted only when the existing live engine
legally tags an in-range living opponent off cooldown. Attack damage contribution follows
existing metric accounting, including overkill; it is not a new health percentage or a
replacement for total damage taken. Hazards do not manufacture strike events.

This is a trace patch: movement, attack range/cooldown, damage, shields, captures, playbooks
and match resolution rules are unchanged. Snapshot codec remains 1, but restore rejects the
previous engine version because the full event trace/hash changes. Stored local playbooks
remain compatible; active rounds/trials are already ephemeral. Server restart still requires
Twitch reconnection until durable tokens exist.

The study is a fixed twelve-second scenario with two adjacent home marks, guard policies,
Rook's existing shield ability, no hazards/walls, and the neutral core away from the marks.
It is an authored movement study, not a rival match, live Twitch failure or lesson evaluation.
A worker executes 240 ordinary engine ticks and returns 241 complete states, all strikes,
and source/final hashes. Its shared cached result contains no user playbook or channel data.
The existing two-worker cap, a twenty-second timeout and 128MB worker limit bound generation.
The public loopback endpoint accepts no scenario input and does not mutate the coach studio.

Because the whole replay is known, anticipation can begin eight ticks before an actual
recorded contact. Pose sampling is a pure function of that replay and its presentation tick.
Jump/spin variants never feed back into simulation. Paused scrubbing explicitly invalidates
the demand renderer; a frame marker verifies the 3D pose was drawn, rather than only the HUD.
This replay lookahead is not a live opponent-prediction feature.

## Still required

- Review this kit at actual match scale before replacing all live characters.
- Adapt readable live anticipation using an explicit presentation buffer/event schedule;
  a live renderer must not assume future strikes exist.
- Define actual jump/dodge/acrobatics mechanics separately if selected: cooldown, duration,
  movement/collision, legal hit windows, counterplay, policy grammar, complete snapshots and
  mirrored scenario tests. Current compiler requests for unsupported mechanics stay unsupported.
- Refine anatomy, contact alignment, recovery, camera framing, compressed-video readability
  and sustained OBS performance. The current geometry-built kit is a prototype, not final art.
- Continue full scenario/holdout evaluation, rivalry, durable persistence and the remaining
  release requirements alongside presentation work.
