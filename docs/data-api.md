# Data model and API contracts

Status: logical design, not database migrations or implemented endpoints. IDs below are opaque UUIDs except Twitch IDs, which remain strings. Timestamps are UTC `timestamptz`; display dates in the user's locale. The API and event protocol start at version `v1`.

## Persistence model

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
