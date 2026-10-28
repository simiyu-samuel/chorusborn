# Local two-streamer rivalry

Implemented locally, October 28, 2026. Both real accounts (developersimiyu and serleusler) have
now been observed authenticated with live chat, the same finished shared match and independent
v6/v2 books. A real pending lesson was compiled and reviewed against the rival’s locked policy
from both neutral starts. These local account checks do not establish an independent two-community
broadcast or audience playtest. Automated checks separately use mocked providers. This server
remains bound to localhost. See the [build log](build-log.md).

## Experience

- A streamer connects their own Twitch account. Twitch's validated lowercase login becomes
  the champion's display name. Mica/Rook remain the original violet/amber visual kits and
  anonymous training fallback names, rather than the identities of rival streamers.
- Each channel has its own persisted champion playbook and private teaching queue. The same
  `!teach` → compile → prove → coach adoption flow applies to both communities. Rules use
  self-relative facts, so a rule owned by the second streamer executes on actor B in a rivalry.
- A verified coach enters the rival's username under **Streamer vs streamer**. A challenge
  expires after ten minutes. The invited Twitch identity must connect independently and accept;
  a username, invite ID or public overlay key does not confer that authority.
- Both coaches ready up before the match starts. Either may pause; both must ready again to
  resume. Lost/revoked/uncertain OAuth pauses the match and clears readiness. Rematch also needs
  both coaches; it pins the latest books. Either verified participant can end the local rivalry.
- Both studios and their existing read-only overlay links observe one server-owned world,
  score and result. They retain separate private queues, compiler proposals and adoption controls.
  New lessons may be taught/adopted during a match; the active round's policies remain pinned.

The owner selected `developersimiyu` versus `serleusler` for the intended live demonstration.
That selection alone is not second-channel consent. No chat messages or invitations are sent
through Twitch; the challenge appears inside the connected rival's Chorusborn studio.

## Local setup and limitations

Use two browser profiles/private sessions on the **same computer**, each signed into the
appropriate Twitch account, then open `http://localhost:5173`. Ordinary tabs in one profile
share the coach cookie and cannot represent two different owners. Each account grants the
existing `user:read:chat` scope only. No second Twitch developer application or write scope is
needed. The app validates the token's user/client/scope and subscribes using that channel's
own broadcaster identity. Official references: [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/),
[token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/),
[chat events](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

A remote streamer cannot reach someone else's `localhost`. A hosted persistent server with
HTTPS, production origin/session handling and durable storage is a separate deployment task.
Do not expose this loopback fixture via an unreviewed tunnel or label it production-ready.
OAuth tokens, challenges, readiness and matches are memory-only; restart requires reconnecting
and re-challenging. Playbooks and channel ownership persist in the ignored local store.

## Ownership and reconnects

The first verified sign-in binds an unbound studio to its actual Twitch user ID, preserving
that local studio's existing playbook. An already-bound studio rejects a different account.
A fresh browser that verifies the same Twitch user rejoins that channel's canonical studio
and saved book; it does not gain a second independent copy. Canonical binding is serialized,
written before the callback's cookie is rebound, and preserved by later adoptions. Legacy books with trusted channel source records may only
be claimed by that verified channel. The current browser’s matching legacy book is preferred
before selecting another legacy record; books are not silently merged. A same-channel
reconnect shares the canonical authority; disconnecting it ends that local channel session for
all browsers using it. The independent other streamer remains authorized.

Every rivalry mutation rechecks current verified ownership. Match controls include the expected
match ID so an old button/request cannot ready or pause a newly created rivalry. Invitation
IDs are opaque, accepted once, scoped to the inviter/target identities, and bounded to 100
pending records process-wide with one outgoing challenge per coach. Expiry and current-match
conflicts reject server-side. Overlay DTOs and peer match snapshots omit private rule source
joins; only the owner's separate `playbook` and `intake` DTOs expose their source/proposal data.

## Simulation and consent

Engine `core-run/0.4.0` retains a neutral core at `(16000,9500)`, equal home spawns, pickup-range
path goals and mirrored horizontal path ordering. Every world serializes `contest.enabled`,
`opening`, `initiative` and nullable `since` tick. A unique nearest surviving claimant picks up
immediately. Equal surviving claims start a ten-tick/0.5-second contest; on expiry, the current
initiative holder picks up and initiative passes to the other champion. Losing the equal claim
resets the timer. Simultaneous damage/defeat still happens before any pickup. Unique pickups do
not spend initiative. No model, display animation or channel name decides the result.

On acceptance the server draws the initial initiative with `crypto.randomInt(2)` and displays
it before readying. A tick-zero start preserves that draw. Pause/resume preserves the timer and
arrow; every finished-round rematch flips the **opening** initiative. Only tied pickups use the
arrow; it is not a speed/stat bonus. The shared arena and overlay show its holder and countdown,
and a recorded `initiative` event identifies an actual tied award. Earlier checkpoints are
incompatible; saved playbooks remain compatible. The carrier fixture leaves tie resolution off.

Both coaches still consent/ready. Books are copied and pinned at match start; mid-round priority
edits/adoptions do not mutate the active world. A disconnected account pauses the match as before.

## Fairness and why a smaller book can win

The earlier order-based pickup favored actor A; replacing it with indefinite ties then exposed
a zero-possession loop. Engine 0.4.0 makes the symmetry-breaking rule visible and records it.
Identical delivery books now contest, collect and score. A single first-to-three round can favor
the opening initiative, so compare opposite starts/rematches. Mirrored checks swap initiative
with the policies and sides. These bounded checks do not establish full competitive balance.

A playbook is a priority list. More lessons add no speed or strength. Carrying-only rules cannot
help until possession; direct/safer routes trade speed and hazard exposure. A newer generic
return-home rule can prevent an older return-with-shield rule from running. **Playbook** now
shows exact duplicates plus syntactically provable same-goal shadowing (an earlier rule's
conditions are a subset of the later rule's). This is not complete numeric/conflict analysis.

Use **Move rule N up/down** to save an explicit new version with the same rules, authors and
source attribution. The complete order and expected version are validated; stale/duplicate/
missing/foreign IDs are rejected. Changes invalidate current proof evidence and pending readiness,
then apply at the next round. Current rounds keep their locked books. Rules are not deleted or
automatically rearranged by Codex/the compiler. General disabling/history/rollback remains work.

## Neutral-opening proofs

Choose **Lesson test scenario → Neutral opening** before proving a community or sample lesson.
The owned candidate/base book is actor A in a fresh home-spawn scenario. The opponent is the
attached rival's **locked** book/name/version (not its unstarted next version), or the fixed
baseline if no rivalry is attached. The source is independent of the current live clock.

Baseline and candidate run from the same full snapshot. The worker repeats both from the
opposite starting initiative. Both source hashes, policy/opponent metadata and both results are
returned; the replay shows the first start only and the summary reports both, including totals.
A peer's private source/proposal joins are removed from returned frames. Current match state is
unchanged. The carrier-dilemma proof remains for delivery tactics and is still the default.
These two initiative starts are not the planned scenario/holdout suite or guaranteed improvement.

## Implemented local API

| Route | Body / authority |
| --- | --- |
| `POST /api/rivalry/challenges` | `{opponentLogin}`; verified inviter, lowercase Twitch login |
| `POST /api/rivalry/challenges/:id` | `{action: "accept" | "decline" | "cancel"}`; invited owner accepts/declines; inviter cancels |
| `POST /api/rivalry/controls` | `{matchId, action: "ready" | "pause" | "leave"}`; current verified participant and matching active ID |
| `GET /api/demo/state`, `/ws/demo` | Owner-specific private state plus the shared rivalry world; `selfActor` identifies the coach's side |
| `POST /api/demo/playbook/order` | `{expectedVersion,ruleIds}`; current coach cookie, all own rule IDs exactly once, new version with active round pinned |
| `POST /api/demo/trials` | `{sampleId,scenario?}` or `{proposalId,scenario?}`; scenario `carrier` (default) or `neutral`; neutral returns both starting-initiative results |
| Existing overlay HTTP/WebSocket | Redacted shared world and mode only; no queue or mutation authority |

Studio state adds `championName`, `selfActor`, `rivalry` and `mode: "rivalry" | "local-fixture"`.
Private rivalry state includes pending invitations, match participants, each side's readiness
and verified-connection flags. Controls and viewer input cannot supply an actor side, arbitrary
policy, channel ID, match outcome or simulation speed. Fixture reset/start controls reject use
while a shared rivalry is attached. Proofs declare their carrier/neutral scenario and opponent version. Neutral proof uses the attached rival’s locked policy; neither mode is a live historical checkpoint branch or broad evaluation.
