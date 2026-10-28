# Local two-streamer rivalry

Implemented locally, October 28, 2026. Live verification with a second human broadcaster is
still required. Automated provider fixtures exercise two independent accounts, not proof that
a real second streamer has authorized the app. This server remains bound to localhost.

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

Engine `core-run/0.2.0` serializes `arena.coreSpawn` as controller state. Original training uses
its previous carrier-dilemma opening/spawn; rivalry uses a neutral core at `(16000, 9500)`, no
opening decoy, equal base stats and both actors at their homes. The core returns to that serialized
spawn after capture or the ordinary idle timeout. Positions, metrics, full books and all controller
fields are snapshotted. Previous engine checkpoints are rejected; stored local playbooks remain
compatible. Source text is never executable code.

At match start/rematch, both published playbooks are deep-copied into the authoritative world.
Readiness records policy hashes and adoption clears pending readiness before a new start.
Pausing an in-progress round preserves those locked policies; resuming does not silently replace
them. The shared clock steps a match once per tick and publishes it to both coaches/overlays.
Existing decision records attribute actor B execution just as they do actor A execution.

A neutral opening does not establish competitive balance: deterministic update order resolves
simultaneous pickup, and this is still one arena/seed rather than a mirrored tournament or
holdout evaluation. Do not claim that a viewer caused a win or that a tactic generalizes.

## Implemented local API

| Route | Body / authority |
| --- | --- |
| `POST /api/rivalry/challenges` | `{opponentLogin}`; verified inviter, lowercase Twitch login |
| `POST /api/rivalry/challenges/:id` | `{action: "accept" | "decline" | "cancel"}`; invited owner accepts/declines; inviter cancels |
| `POST /api/rivalry/controls` | `{matchId, action: "ready" | "pause" | "leave"}`; current verified participant and matching active ID |
| `GET /api/demo/state`, `/ws/demo` | Owner-specific private state plus the shared rivalry world; `selfActor` identifies the coach's side |
| Existing overlay HTTP/WebSocket | Redacted shared world and mode only; no queue or mutation authority |

Studio state adds `championName`, `selfActor`, `rivalry` and `mode: "rivalry" | "local-fixture"`.
Private rivalry state includes pending invitations, match participants, each side's readiness
and verified-connection flags. Controls and viewer input cannot supply an actor side, arbitrary
policy, channel ID, match outcome or simulation speed. Fixture reset/start controls reject use
while a shared rivalry is attached. Proof comparisons remain explicitly labeled training-fixture
evidence; they are not yet branches against the rival's current policy or broad evaluation.
