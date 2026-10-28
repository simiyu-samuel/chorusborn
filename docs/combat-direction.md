# Combat Lab: acrobatic fighter prototype

Status: **implemented visual prototype, October 28, 2026**. Open `/combat-lab`, or follow
**Combat lab** from the studio. This is a separate, fixed sparring replay for reviewing a
new fighter kit. Following owner approval, that articulated kit also renders in live training,
branch comparisons and the read-only overlay, with matching portraits and SVG compatibility.

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

## Shared arena rollout (October 28)

The same `FighterRig` now receives a pose sampler in both Combat Lab and the shared arena.
The normal arena uses `liveFighterPose(World, actor, presentationTick, moving, reduced)`.
Unlike the fixed study, it does not inspect future frames: a recorded strike starts an extended
kick followed by a twelve-tick airborne/spin/somersault recovery. Contact flashes use that
strike's recorded target position and shield flag. Recoil can also follow actual hazard damage;
it does not manufacture an attack event. Captures clear pre-reset contact/recoil choreography.
Travel interpolates only consecutive observed positions,
and recent contact direction faces the fighter toward the recorded opponent.

Between normal live publications, pose time advances at most two ticks. It resets on every
new snapshot, gap or seek, with no extra model/gameplay state. Paused frames sample exactly;
replay pause and spectator signal loss disable animation separately from the user's reduced-
motion setting. This preserves the selected static fight pose on pause while accessibility
settings suppress the acrobatics themselves. Winner, carrying, shield and defeat poses remain
state-derived. All score, health, cooldown, movement and attribution data stay server-owned.

The earlier rounder model code has been removed. Original SVG fighter glyphs now share the
same pose data in the fallback and Combat Lab, and supply matching static portraits. No new
dependency, engine version, server endpoint, stored rule or Twitch/model permission is needed.
Full-arena scale and broadcast readability still need independent viewer/OBS validation.

## Still required

- Refine this kit at actual match scale with audience playtesting.
- The current live renderer reacts after confirmed contact. Any pre-contact live anticipation
  still needs a presentation buffer or explicit attack schedule; it cannot assume future hits.
- Define actual jump/dodge/acrobatics mechanics separately if selected: cooldown, duration,
  movement/collision, legal hit windows, counterplay, policy grammar, complete snapshots and
  mirrored scenario tests. Current compiler requests for unsupported mechanics stay unsupported.
- Refine anatomy, contact alignment, recovery, camera framing, compressed-video readability
  and sustained OBS performance. The current geometry-built kit is a prototype, not final art.
- Continue full scenario/holdout evaluation, rivalry, durable persistence and the remaining
  release requirements alongside presentation work.
