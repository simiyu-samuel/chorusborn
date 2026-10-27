# Quality, evaluation, and release evidence

Status: release verification plan. Contract/simulation/API/OAuth/EventSub/storage checks and browser flows are recorded in the [build log](build-log.md). Real broadcaster sign-in and one broadcaster-authored teaching command have been verified; independent-viewer evidence remains open. Compiler, PostgreSQL, full-suite evaluation, production recovery, and OBS performance gates remain open. A target below is not a measured result. Automated browser OAuth/chat checks use an isolated provider fixture; the separate live browser check establishes actual Twitch delivery.

## Verification layers

| Layer | Meaningful checks | Required evidence |
| --- | --- | --- |
| Pure simulation | Same versions/seed/inputs produce identical per-tick state hashes; snapshot restore matches uninterrupted execution | Automated deterministic fixture results |
| Game legality | Simultaneous defeat/capture, core pickup ties, cooldowns, bounds, respawn, timer/draw behavior | Boundary fixtures with explicit expected outcomes |
| Policy interpreter | Typed facts, legal goals, priority, blocked rules, fallback, bounded evaluation | Valid and hostile policy fixtures |
| Compiler | Supported meaning, negation, ambiguity, refusal, injection, unsupported mechanics | Versioned corpus and scored report |
| Branch replay | Candidate changes only its intended policy; same-branch repeatability; opponent remains reactive | Stored branch hashes and provenance |
| Evaluation suite | Full declared suite, side/order swaps, development/holdout separation | Manifest hash and complete results |
| Persistence | Atomic adoption, stale rejection, unique ingress, rollback history, lease recovery | Database integration checks |
| Authorization | Owner/reviewer/public boundaries, cross-channel IDs, read-only overlay, CSRF/origin | Negative integration checks |
| Twitch | Actual OAuth/message ingestion, duplicates, missing scopes, reconnect/revocation | Redacted live evidence and adapter fixtures |
| Browser/OBS | Complete coach flow, replay controls, reconnection, readable broadcast, accessible controls | Browser run and reference-machine recording |

## Compiler evaluation corpus

Create a fixed corpus before prompt tuning: at least 20 supported lessons and 20 boundary/adversarial cases. Cover equivalent phrasing, negation, numerical thresholds, compound lessons, contradiction, invented mechanics, URLs/code, injection, abusive display text, ambiguity, and oversized input.

Evaluate semantic correctness against expected conditions/intents, not prose similarity. Target at least 90% correct supported interpretations, **zero invalid candidates reaching publication**, and explicit handling of every unsupported/refusal case. Schema validity alone is not semantic correctness. Review every wrong interpretation; a small test corpus does not establish general language accuracy.

Run provider evaluation under an explicit operator-set spend cap. Select the available OpenAI model by supported-lesson correctness first, then latency and observed cost. Pin model/prompt/schema identifiers in the release report. Model IDs and exact prices must be checked when selected.

## Determinism and replay gates

- At least 100 seeded simulation cases, including mirrored sides and tie cases, reproduce full-state hashes on the declared server runtime.
- Checkpoint/resume produces the same final state as uninterrupted execution from the same durable input set.
- Replaying the same branch twice is identical; rendering frame rate cannot affect it.
- A snapshot with missing cooldown/path/PRNG fields is rejected rather than partly restored.
- Unknown engine/ruleset/codec versions fail visibly.
- The trial stores both policy hashes, the full scenario manifest, and actual decision receipts.

Do not promise cross-engine or arbitrary cross-runtime determinism until tested. Browser presentation uses server snapshots and does not need to be a second authoritative engine.

## Negative and recovery cases

Two concurrent adoptions from the same base produce one accepted version and one stale response. Duplicate EventSub envelope/chat IDs produce one proposal. Repeated HTTP idempotency keys return the existing result; changed bodies fail. Job worker crashes reclaim a lease without duplicate candidate completion. Model timeouts never change a running champion. Database unavailability stops new publication; current matches pause if durable state guarantees can no longer be maintained.

Test forged channel IDs, a reviewer attempting adoption, public WebSocket subscriptions to private queues, overlay keys used on command routes, disabled users, revoked tokens, Shared Chat provenance, slow consumers, and malicious lesson text. Redact secrets from errors, logs, public DTOs, and recordings.

## Performance targets

Measure on a documented reference machine and declared deployment shape, at the initial admitted load of two channels, one scored match, and two trial workers:

| Metric | Initial target | Evidence to capture |
| --- | --- | --- |
| Ingress receipt → queued UI | p95 under 1 second, excluding Twitch delivery delay | Server timestamps and client receipt |
| Compiler completion | p95 under 10 seconds | At least 20 bounded compile jobs; model/version recorded |
| Two-branch 60-second trial | p95 under 2 seconds | At least 20 runs at admitted capacity |
| Live tick compute | p95 under 25 ms for a 50 ms tick | Compute time and scheduler lag separately |
| OBS rendering | At least 30 FPS at 1080p on the reference host | CPU/GPU/browser/source settings recorded |

Targets are open until benchmarked. If they fail, profile and adjust implementation or disclose revised limits. Do not silently reduce simulation fidelity or replace live integration with a prerecorded result.

## Human playtest

Recruit two consenting streamers and at least five participants where possible. Test the comprehension and repeat-participation hypotheses in [product](product.md). Keep observations qualitative and counts explicit. Ask whether a negative result is understandable, whether credits feel earned, and whether they would host/play another session.

Human availability is an external dependency; a scripted developer demo cannot be recorded as independent user validation. Preserve consent for any identifiable footage used publicly.

## Release gate

- All [S01–S14](scope.md) evidence links exist in the build log.
- Engine/policy/API critical checks pass on the locked release revision.
- Real two-channel teaching and rivalry flow works; fixture mode is separately labeled.
- No known authorization, attribution-integrity, or replay-determinism failure remains.
- Fresh clone and local fixture setup work from documented commands.
- Deployment health, backup/recovery, quotas, and judging availability are checked.
- Final video and description represent implemented behavior, and Codex evidence is genuine.
- Assets/dependency notices, credential review, source access, and session-ID verification are complete.

CI should run formatting/lint, type checks, engine/policy tests, DB integration checks, build, and a small browser smoke flow. Add scripts and workflow files only when those commands exist. Avoid tests that merely repeat implementation detail; prioritize the behavioral guarantees above.
