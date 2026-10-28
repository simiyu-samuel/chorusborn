# Data model and API contracts

Status: production logical design. PostgreSQL migrations and the `/api/v1` surface below are not implemented. The local fixture uses separately scoped `/api/demo` and `/ws/demo` endpoints, a loopback-only coach cookie, separate overlay keys, and an atomic JSON playbook store; see the [README](../README.md). IDs below are opaque UUIDs except Twitch IDs, which remain strings. Timestamps are UTC `timestamptz`; display dates in the user's locale. The production API and event protocol start at version `v1`.

## Persistence model

The local build additionally implements `GET /auth/twitch/start`, `GET /auth/twitch/callback`, `POST /api/twitch/disconnect`, `POST /api/twitch/intake` (pause/resume/retry), and `POST /api/twitch/proposals/:id` (reject). The last two require verified OAuth for the bound channel. Real proposals enter only through the server's EventSub adapter, never an anonymous HTTP write route. Redacted `twitch`/`intake` fields in the private coach state carry status and the authorized queue. Tokens are memory-only and excluded from state; the overlay receives no queue. `.local/chat.json` holds the local durable proposals/ingress records. The `/api/v1` contracts below remain the production target.

| Entity | Essential fields and constraints |
| --- | --- |
| `users` | Internal ID, unique Twitch user ID, current display name, attribution preference |
| `channels` | Unique Twitch broadcaster ID, owner user ID, connection state, intake state |
| `channel_members` | Unique `(channel_id, user_id)`, role `coach`/`reviewer`; owner is derived from broadcaster identity |
| `oauth_connections` | Channel/user binding, encrypted token bundle, scopes, expiry, validation status; server-only |
| `champions` | Channel ID unique for v1, name/cosmetic IDs, active playbook version pointer |
| `proposals` | Channel/author/source-message binding, bounded submitted text, status, hidden/deleted flags |
| `compile_jobs` | Proposal ID, base version/hash, schema/model/prompt version, state, lease, attempts, usage reservation |
| `candidates` | Unique job completion key, validated candidate JSON, compiled hash, diagnostics |
| `playbook_versions` | Champion ID, monotonic version, parent ID, immutable rule JSON/hash, source patch, authorizing coach, evidence IDs |
| `trials` | Candidate/base versions, source snapshot, scenario manifest hash, state, branch results, aggregate metrics |
| `challenges` | Inviter/invitee channels, accepted versions, expiry, consent state, resulting match ID |
| `matches` | Participants/locked versions, engine/ruleset/arena hashes, seed, state, score, durable tick watermark |
| `checkpoints` | Unique `(match_id, tick)`, complete compressed snapshot, state hash, codec version |
| `match_events` | Unique `(match_id, sequence)`, tick, decision/game event, attributable rule ID where applicable |
| `votes` | Unique `(channel_id, shortlist_round_id, user_id)`, chosen proposal; latest valid choice replaces previous |
| `ingress_receipts` | Unique provider event identity, source message identity, received/processed times, redacted digest |
| `idempotency_keys` | Unique `(actor_id, operation, key)`, request hash, terminal response/reference |
| `outbox_events` | Ordered durable publication events committed alongside their state changes |
| `audit_events` | Actor, channel, operation, target ID, old/new version references, time; no token contents |

Identity/provenance records are separate from immutable simulation payloads. Public display names are resolved at read time so attribution removal does not require corrupting replay hashes. Store stable rule IDs in decision events; redact identity and original text independently.

## Integrity and query design

Use foreign keys, not-null and bounded-value constraints, and uniqueness for provider receipts, votes, job completion, and playbook version numbers. Check that referenced champion, proposal, candidate, and version belong to the same channel using composite ownership keys or an equivalent transactional invariant. A valid foreign key alone does not establish authorization.

Index access paths: `(channel_id, status, created_at, id)` for proposal queue; `(status, available_at, id)` for pending jobs; `(champion_id, version)` unique for playbooks; `(match_id, tick)` for checkpoints; `(match_id, sequence)` unique for replay/event reads. Add indexes to referencing foreign keys used in joins/deletion. Paginate by stable cursor, not unbounded offset. Avoid speculative JSON indexes until queries require them.

Use a bounded pool and short transactions. Do not keep a DB transaction open during model calls or a simulated match. Workers atomically claim available jobs with a short row-lock/lease transaction (`FOR UPDATE SKIP LOCKED` where appropriate), then do external work outside it. Pin and verify the deployed PostgreSQL version before migrations.

References: [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [row locking and SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).

## Publication transaction

Adoption request includes `candidateId`, `trialId`, `expectedActiveVersionId`, reviewed insertion position, and explicit superseded rule IDs. The server:

1. Verifies the authenticated actor is the channel owner/coach, with CSRF protection.
2. Checks candidate/trial status, matching base version and hashes, policy limits, and ownership.
3. Locks the champion row, rechecks its current active pointer, and rejects stale work with `409`.
4. Creates one immutable version and advances the active pointer atomically.
5. Writes audit and outbox records in the same transaction; returns the published version.

The active pointer selects the next round's version. It never changes versions pinned to an existing match. A repeated idempotent request returns the original response; reusing a key with a different body fails. Rollback follows the same transaction shape and creates a new version.

## Proposed HTTP surface

All mutating authenticated routes require same-origin session authorization, CSRF checks, runtime validation, and an `Idempotency-Key`. The OAuth callback is a separate state-validated flow. Public GETs expose a redacted DTO, not database rows.

| Method / route | Authority | Purpose |
| --- | --- | --- |
| `GET /auth/twitch/start` | Initiating browser session | Start state-bound OAuth; connection scopes require an explicit coach action |
| `GET /auth/twitch/callback` | Valid OAuth state/code | Exchange code server-side and bind verified identity |
| `POST /api/v1/channels/:id/disconnect` | Owner | Stop intake, disconnect EventSub, revoke/remove stored credentials |
| `GET /api/v1/channels/:id/console` | Coach/reviewer | Private queue, version pointers, service health |
| `GET /api/v1/champions/:id` | Public | Redacted profile, published playbook, history |
| `POST /api/v1/proposals/:id/compile` | Coach/reviewer | Queue compilation within channel quota |
| `POST /api/v1/proposals/:id/moderate` | Coach/reviewer | Hide, reject, or request clarification |
| `POST /api/v1/trials` | Coach/reviewer | Request snapshot comparison and suite evaluation |
| `GET /api/v1/trials/:id` | Authorized or redacted public | Inspect outcome and evidence provenance |
| `POST /api/v1/champions/:id/adoptions` | Coach | Publish reviewed lesson at a new version |
| `POST /api/v1/champions/:id/rollbacks` | Coach | Create a new version from an earlier playbook |
| `POST /api/v1/channels/:id/intake` | Coach/reviewer | Pause/resume proposals and open/close shortlist rounds |
| `POST /api/v1/challenges` | Coach | Invite an already-connected opted-in rival channel |
| `POST /api/v1/challenges/:id/accept` | Invited coach | Accept the opponent, map, and current policy versions |
| `POST /api/v1/matches` | Authorized training coach or accepted challenge | Start training or consume a mutually accepted challenge once |
| `POST /api/v1/matches/:id/controls` | Participant coach | Pause/resume; scored-match resume requires both coaches ready |
| `POST /api/v1/channels/:id/overlay-key` | Owner | Rotate read-only OBS access key |
| `POST /api/v1/channels/:id/members` | Owner | Grant/revoke reviewer role to a verified user ID |
| `POST /api/v1/me/attribution` | Verified contributor | Hide own identity/text in future public views |
| `GET /health/live` and `/health/ready` | Operator | Process and dependency health without sensitive configuration |

Viewer teaching/voting enters through verified Twitch events, not an anonymous HTTP write route. A contributor can log in for attribution controls without granting chat access. Provider-side revocation errors are reported; local deletion of credentials must still succeed.

Eligible incoming proposals automatically receive an initial compile job while intake is active and quota remains. The explicit compile endpoint is for authorized retries/revisions; it must not create a duplicate initial job or bypass admission limits. A candidate hash change invalidates earlier trial evidence.

Errors use `{ code, message, requestId, retryable, details }`, with redacted `details`. Common codes: `401` unauthenticated, `403` forbidden, `409` stale/conflict, `422` unsupported/invalid contract, `429` quota/capacity, `503` unavailable dependency. Long tasks return `202` plus job ID; the UI subscribes to status.

## Realtime contract

`GET /ws/v1` upgrades after origin/session checks. Public clients receive redacted state; host clients receive only authorized channel streams. Overlay keys are exchanged via a read-only path and never grant command permission. Bound message sizes and subscriptions; disconnect or resnapshot slow consumers.

Durable event envelope:

```json
{
  "protocolVersion": "1",
  "streamId": "demo-channel-stream",
  "sequence": 42,
  "type": "proposal.ready",
  "occurredAt": "2026-10-26T10:00:00Z",
  "payload": { "proposalId": "demo-proposal", "candidateId": "demo-candidate" }
}
```

Event families: `connection.changed`, `intake.changed`, `proposal.queued`, `proposal.ready`, `proposal.failed`, `trial.started`, `trial.finished`, `playbook.published`, `challenge.changed`, `match.started`, `match.paused`, `match.finished`, `contribution.used`.

Visual `match.snapshot` messages use monotonic `tick` and `stateHash` and can be coalesced; they do not consume durable outbox sequence numbers. On reconnect, send the last durable cursor. Replay retained durable events if possible; otherwise send `resync.required` and a redacted full current state with a cursor. This client recovery protocol does not imply Twitch can replay lost chat.

## Lifecycle, privacy, and retention

Persist explicit command content only; exclude ordinary chat. Initial operational policy: pending/rejected proposal text expires after 30 days, completed compiler payloads after 30 days, ephemeral logs after 14 days. Adopted tactics and replay data may remain for project history, with contributor identity/text removable independently. Provide deletion and moderation handling before public release. Remove credentials immediately on local disconnect.

Do not delete judging evidence before the published evaluation period ends; retain deidentified engine artifacts while honoring identity/text removal. Record the actual policy in product notices and verify it against current Twitch developer terms before deployment. This is an intended product policy, not a claim that provider terms have been fully audited.

## Implemented local compiler endpoints

These remain loopback-only and separate from the planned production API:

| Endpoint | Body / behavior |
| --- | --- |
| `POST /api/twitch/proposals/:id/compile` | Empty JSON object; verified channel source required; explicit one-shot Groq call or reuse of a valid same-base candidate |
| `POST /api/demo/trials` | `{proposalId,scenario?}` for an eligible compiled source or `{sampleId,scenario?}` for a sample; scenario is `carrier` (default) or `neutral` |
| `POST /api/demo/adoptions` | Existing `{trialId,expectedVersion}`; source/compiler/base-policy checks apply before storing viewer-authored rules |

Proposal DTOs now include nullable `compilation` and `compileAttempts` (old stored rows default
to null/zero). Compilation records contain server-assigned ID, status, base policy hash/version,
model, prompt hash, timestamp, validated four-outcome result, sanitized error and token usage.
They never contain API keys, full provider envelopes, or reasoning. The compiler sees lesson
text only, not these trusted identities. Source records on adopted rules bind proposal/channel/
author/compilation IDs; the display author comes from Twitch. The overlay still exposes world
data only; it has no queue access or mutation authority. Private source-join metadata is stripped from overlay rules; visible author names remain for execution credit.

## Local fixture controls (implemented)

`POST /api/demo/controls` requires the coach's HttpOnly session and the existing trusted-origin/
JSON boundary. The strict body is `{ "action": "…" }`, with one of `pause`, `resume`, `reset`, or `rematch`.
Reset creates a paused tick-zero fixture with the currently adopted book. Rematch is legal only
from a finished world; it synchronously creates the same-seed tick-zero world with the latest
adopted book and sets it running before publishing. Concurrent rematches produce one accepted
start and one 409; unfinished worlds receive 409 unchanged. It does not store match history,
create rivalry, alter an existing match's book, or grant overlay keys coach authority. The world
and metrics remain ephemeral; this is not the future durable match API described above.

## Combat preview (implemented)

`GET /api/demo/combat-study` returns a fixed `sparring-v1` replay: `ticksPerSecond: 20`,
`sourceHash`, `finalHash`, 241 complete `frames` and recorded `strikes`. It accepts no user-supplied
scenario, requires no coach authority, and exposes no private studio/channel data. Generation
shares one cached worker job; initial worker-cap pressure returns 429 and generation failure
returns a sanitized 503. It is a local authored preview, not the evaluation suite or match API.

Engine 0.1.1's `strike` event records `tick`, `actorId`, `targetId`, integer `from`/`to` positions,
`damage` after shield reduction, `shielded`, and a display `text`. Damage is an attack contribution
under existing overkill accounting. Event history remains bounded to forty entries in each world;
the study separately collects every strike over its fixed interval.

## Local rivalry and canonical ownership (implemented)

See [rivalry](rivalry.md) for the exact challenge/accept/ready controls and authority contract.
The local studio store optionally binds a verified channel ID/login to its saved book. Fresh
browsers verifying the same user rejoin that canonical studio; a different user cannot take it
over. Both coaches receive the same match world with private source joins redacted, alongside
only their own unredacted book/queue. Overlay reads expose world/mode only. Match controls
require the expected match ID and current participant OAuth. This is not the durable production
match/checkpoint/outbox design above.

## Local priority and initiative contract (implemented)

`POST /api/demo/playbook/order` accepts `{expectedVersion,ruleIds}` from an owning studio cookie.
Every existing ID must appear exactly once, with no additions. A changed order saves version+1
with identical rule/provenance data, invalidates previous trial evidence and clears pending rival
readiness. The active world remains pinned. Same order returns without incrementing the version.

World engine `core-run/0.4.0` adds required `contest: {enabled,opening,initiative,since}` controller
state. `since` is null or an integer tick no later than the snapshot tick; both actor IDs must be
valid. Neutral rivalry enables the ten-tick tie rule; carrier fixtures disable it. A tied award
emits `initiative` then `pickup`; source hashes therefore include the declared symmetry breaker.

Trials include `scenario`, `opponent: {name,version,hash}` and, for neutral, `paired` with the
opposite-initiative source hash and both branch summaries. Only the first start includes frames.
Latest-trial metadata may include these bounded summaries, never the paired replay frames.
