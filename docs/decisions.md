# Decisions, risks, and open questions

Baseline date: October 26, 2026. "Accepted" below means selected in the plan, not implemented.

## Architecture decision record

| ADR | Status | Decision and reason | Revisit trigger |
| --- | --- | --- | --- |
| 001 | Accepted | Chorusborn is the working name; community voices shaping a champion | Naming conflict or owner preference |
| 002 | Accepted | Deterministic authoritative simulation; visual 3D is presentation | A new mechanic needs a different logical model |
| 003 | Accepted | Bounded behavior data rather than arbitrary viewer code | A proven need for expressiveness beyond v1 |
| 004 | Accepted | AI outside the tick; eve handles the teaching agent | Implementation spike shows the selected adapter cannot satisfy the contract |
| 005 | Accepted | Human adoption, immutable versions, next-round activation | No planned relaxation for the submission |
| 006 | Accepted | PostgreSQL for storage, job leases, outbox and audit | Measured scale or operation requirements justify another component |
| 007 | Accepted | Broadcaster user tokens + EventSub for initial Twitch topology | Expansion to a dedicated cloud bot and many channels |
| 008 | Accepted | Persistent Node server/container baseline, deployment vendor undecided | Hosting evaluation including current realtime support |
| 009 | Accepted | Rule-use receipts and exact replay comparisons support claims | Additional evidence warrants stronger, narrowly scoped causal claims |
| 010 | Accepted | Two real communities in the release, fixtures for reproducibility | Scope changes must be explicitly recorded, not hidden |
| 011 | Open | Model ID/provider configuration pinned after correctness/latency/cost evaluation | M0/M3 compiler spike and operator spend cap |
| 012 | Open | License, final assets, public repository and hosting choices | Before public release or provisioning |

## Product risks

| Risk | Signal | Response / validation |
| --- | --- | --- |
| Looks like another AI gamer | Viewers remember the avatar but cannot explain teaching/proof | Put branch testing, attribution and adoption in the first minute |
| Tactics are too shallow | Every lesson becomes "return home" or one dominant strategy | Design trade-offs, three readable layouts, shield/decoy interactions; playtest |
| Too much UI for viewers | Audience cannot tell what changed | Show short intent cues, one lesson at a time, exact divergence; keep details inspectable |
| AI replaces the host's role | Streamer watches without decisions to make | Coach controls tests, priorities, adoption, challenges, pacing and commentary |
| Contribution feels unfair | Loudest users dominate or credits do not match behavior | Unique-user shortlists, quotas, execution receipts, clear priority/adoption history |
| Return interest is unproven | Participants do not want another session | Interview/playtest; report the result rather than claim retention |

## Engineering risks

| Risk | Failure mode | Mitigation / release consequence |
| --- | --- | --- |
| Incomplete snapshot | Before/after comparison is misleading | Full state codec, hashes, deterministic restore tests; blocker if unresolved |
| False improvement | Single favorable seed hides regressions | Predeclared complete suite, mirrored sides and holdout labels |
| Model invents capabilities | Valid-looking lesson does something different | Supported-meaning review, runtime validation, unsupported result; never silent adoption |
| Agent has excessive tools | Chat input gains unexpected access | Restricted tools and early eve capability spike; do not connect unrestricted tools |
| Concurrent adoption | Evidence references an old playbook | Expected-version check and publication transaction |
| Twitch outage | Chat commands disappear or duplicate | Durable ingress dedupe, visible intake gap, no replay assumption |
| CPU overload | Trial affects live match timing | Bounded workers and admission, tick monitoring and explicit pause |
| Recovery changes results | Restart loses unpersisted state | Checkpoints, durable watermark and visible paused recovery/rematch choice |
| Secret exposure | Tokens appear in logs/OBS/demo/Git | Server-only encrypted credentials, redacted DTOs and review |
| Rival consent missing | One channel controls another | Independent owner authorization and mutual challenge acceptance |
| Framework mismatch | The selected SDK does not fit bounded jobs | Early integration spike; document adapter change without coupling engine to provider |

## External requirements and uncertainty

The hackathon requires a newly created project, Twitch connection, and Codex use. Four judging criteria carry equal weight. Official pages disagree on judging dates; preserve access through the later period and recheck updates. Sources are recorded in [sources](sources.md). These statements do not establish the entrant's individual eligibility or promise a prize.

Only a preliminary name collision search has been done. Domain/trademark clearance has not. No domain, remote, paid service, or submission has been created. Do not automatically publish or incur charges to resolve an open question.

## Decision procedure

When changing a major assumption, add a dated ADR entry with the problem, options, selected change, affected acceptance IDs, and evidence. Update related contracts in the same commit. Preserve honest status: docs are not proof of implementation, and fixtures are not live integration.
