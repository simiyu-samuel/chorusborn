# Decisions, risks, and open questions

Baseline date: October 26, 2026. "Accepted" below means selected in the plan, not implemented.

## Architecture decision record

| ADR | Status | Decision and reason | Revisit trigger |
| --- | --- | --- | --- |
| 001 | Accepted | Chorusborn is the working name; community voices shaping a champion | Naming conflict or owner preference |
| 002 | Accepted | Deterministic authoritative simulation; visual 3D is presentation | A new mechanic needs a different logical model |
| 003 | Accepted | Bounded behavior data rather than arbitrary viewer code | A proven need for expressiveness beyond v1 |
| 004 | Partially superseded by 017 | AI outside the tick; eve was planned for the teaching agent | Implementation spike shows the selected adapter cannot satisfy the contract |
| 005 | Accepted | Human adoption, immutable versions, next-round activation | No planned relaxation for the submission |
| 006 | Accepted | PostgreSQL for storage, job leases, outbox and audit | Measured scale or operation requirements justify another component |
| 007 | Accepted | Broadcaster user tokens + EventSub for initial Twitch topology | Expansion to a dedicated cloud bot and many channels |
| 008 | Accepted | Persistent Node server/container baseline, deployment vendor undecided | Hosting evaluation including current realtime support |
| 009 | Accepted | Rule-use receipts and exact replay comparisons support claims | Additional evidence warrants stronger, narrowly scoped causal claims |
| 010 | Accepted | Two real communities in the release, fixtures for reproducibility | Scope changes must be explicitly recorded, not hidden |
| 011 | Local model selected; release evaluation open | GPT-OSS 120B via Groq selected with owner; model/prompt pinned in code; broader correctness/latency/cost evaluation pending | M0/M3 compiler spike and operator spend cap |
| 012 | Open | License, final assets, public repository and hosting choices | Before public release or provisioning |
| 013 | Superseded by 018; retained as fallback | Use a native SVG isometric renderer so the replay/coach slice works without a WebGL dependency; Three.js remains an option for later visual depth | Broadcast measurements and audience playtest |
| 014 | Accepted for first fixture | Save local playbooks atomically to ignored `.local/studios.json`; keep trials/rounds ephemeral; do not claim production database durability | PostgreSQL integration milestone |
| 015 | Implemented local OAuth step | Keep Twitch access/refresh tokens in server memory until encrypted production persistence exists; validate identity/scope/client, revalidate within an hour, serialize reactive refresh, and require sign-in after restart | Encrypted durable token storage and EventSub integration |
| 016 | Implemented local intake step | Atomically persist teaching proposals, moderation tombstones, and bounded ingress receipts to ignored `.local/chat.json`; share one receive-only EventSub socket per verified reader; expose the queue only after OAuth verification | PostgreSQL ingress transactions, production roles, retention jobs, and the language compiler |

### ADR 017 — 2026-10-27: bounded Groq compiler for the local milestone

The owner offered a Groq key after checking whether hackathon API credits existed. Use
`openai/gpt-oss-120b` through Groq's documented strict structured-output endpoint. Alternatives
were the planned Eve/AI Gateway worker or an AI SDK provider adapter. This compiler needs one
translation request and no tools, so implement a small native-fetch adapter inside the existing
Fastify stack. Defer Eve and AI SDK dependencies rather than introduce an agent runtime solely
for this one-shot translation; this is a scope/complexity choice, not a claim that Eve cannot
restrict tools. Preserve the provider-independent compiler interface for future worker migration.

An actual Groq request rejected our overlapping condition unions with a constrained-decoder
ambiguity error. Flatten that wire shape only and enforce the stricter local typed contract after
decoding. One supported and three boundary smoke cases returned the expected outcomes; this
does not select a release-quality model by a broad evaluation. Affects S03/S04/S06/S07/S12.
Local persistence remains file-based with explicit retries, request caps and no distributed leases.

### ADR 018 — 2026-10-27: shared 3D presentation with compatibility fallback

Implement the approved Relay Garden direction using Three.js 0.186.1 and React Three Fiber
9.8.2 (React 19-compatible). Keep the integer-grid server simulation and existing replay data
unchanged. Use original procedural geometry/portraits and synthesized audio for this first
playable slice; the generated concept remains a reference, not a runtime background or a claim
of final art quality. Reuse the renderer in training, both replay branches and the overlay.

Bake character pieces by moving joint and instance terrain to reduce draw calls. Offer low
effects, reduced motion and muted-by-default sound. Suspend the covered coach canvas during
replay; use demand rendering when paused. Cache the WebGL support probe and fall back visibly
on initialization failure/context loss. Keep an explicit SVG compatibility path rather than
make unsupported hardware lose the coach workflow. This advances S10/S13; sustained OBS,
compressed-video readability and independent viewer validation remain release gates.

### ADR 019 — 2026-10-28: review acrobatics in a recorded Combat Lab

The owner requested stick-fighter silhouettes, visible kicks, jumps and acrobatics. Build a
separate `/combat-lab` movement study before replacing the shared live champion kit. Keep
Mica/Rook identity cues and author articulated geometry and compatibility SVGs in code.
This lets the owner inspect motion close up while the live teaching and match flow remains usable.

Record legal tag contacts in the authoritative engine and bump its trace version to 0.1.1;
old full checkpoints are rejected, while local playbooks remain compatible. A bounded worker
runs one fixed twelve-second sparring fixture. The presentation samples that complete replay,
including anticipation before known contacts. It never changes damage, hit range, cooldowns,
shield rules or invulnerability. Actual jump/dodge mechanics require a separate rules and policy
contract; live anticipation needs a buffer or scheduled events instead of replay lookahead.

This advances the visual exploration within S08/S10/S13. Deterministic frame replay, contact
semantics, paused rendering, reduced motion and missing-WebGL checks supply local evidence.
Live kit rollout, tactical acrobatics, OBS measurements and audience validation remain open.
See [combat direction](combat-direction.md).

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

Only a preliminary name collision search has been done. Domain/trademark clearance has not. The owner authorized and supplied the GitHub remote, which is now connected. No domain, paid service, deployment, or submission has been created. Do not automatically provision paid resources to resolve an open question.

## Decision procedure

When changing a major assumption, add a dated ADR entry with the problem, options, selected change, affected acceptance IDs, and evidence. Update related contracts in the same commit. Preserve honest status: docs are not proof of implementation, and fixtures are not live integration.
