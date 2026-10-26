# Release scope and acceptance

Status: **planned**. All items below require implementation and evidence. The five-day build target sequences work; it does not justify removing the signature experience.

## Submission release requirements

| ID | Capability | Acceptance evidence |
| --- | --- | --- |
| S01 | Connect a real Twitch channel | Broadcaster OAuth succeeds; verified chat event creates one authorized proposal; disconnect/revoke is visible |
| S02 | Persistent champion | Name, cosmetic selection, adopted playbook, and history survive a service restart |
| S03 | Natural-language teaching | Supported lessons compile to validated behavior; ambiguous/unsupported lessons receive an honest explanation |
| S04 | Prove your lesson | Baseline and candidate branch from an identical full snapshot; only the candidate policy differs; conditions and outcomes are visible |
| S05 | Evaluate more than one example | Shared scenario set reports wins/captures/damage/travel trade-offs and includes a predeclared holdout partition |
| S06 | Human adoption and rollback | Coach accepts against an expected version; stale adoption fails; active matches stay pinned; rollback creates a new audited version |
| S07 | Attribution from execution | Every displayed rule-use credit references a real decision event; no fabricated claim that a rule caused a win |
| S08 | Complete spectator game | Training and rival capture matches resolve legally; scoreboard, timer, winner/draw and rematch work |
| S09 | Two-community rivalry | Two independently authenticated channels enter one match using locked playbooks and observe the same score/result |
| S10 | Broadcast presentation | Read-only OBS route, legible 1080p arena, connection indicator, clear teaching/replay modes, no secret exposure |
| S11 | Host and moderation controls | Pause/resume, intake pause, hide/reject, review roles, disconnect and queued adoption work under authorization checks |
| S12 | Recovery and degraded behavior | Duplicate ingress has one effect; Twitch/model failure is visible; confirmed DB work is recoverable; engine continues without model calls |
| S13 | Reproducible judging | Clean-machine setup, fixtures without credentials, documented live configuration, source/assets/notices, working live project |
| S14 | Submission evidence | Under-three-minute public YouTube demo shows actual Twitch use and Codex; description and main build session ID are supplied |

## Initial gameplay content

- One original capture arena ruleset; three authored layouts with deterministic mirrored variants.
- One champion per community, identical base stats, a small owned cosmetic palette.
- Baseline opponent and one-versus-one rival community matches.
- Up to 24 active learned rules per playbook; up to 3 proposed rules per lesson.
- Replay comparison, a 12-scenario evaluation suite (6 development + 6 holdout), and a readable decision ledger.
- Real Twitch teaching and vote-to-shortlist; coaching authority controls adoption.

Content breadth is bounded to make strategies understandable and proof trustworthy. Expressiveness within supported facts/goals matters more than an inventory of maps.

## Subsequent expansion

Team-versus-team champions, opt-in raid-triggered challenge invitations, creator leagues, advanced lesson combinations, user-authored arenas, safe shareable replay exports, and cosmetic progression. These follow the release requirements; none should substitute for missing proof or real integration.

## Explicitly outside the initial release

Arbitrary viewer code execution, foundation-model training, real-money betting, paid tactical advantages, support for external commercial game engines, full 3D physics as a source of authoritative outcomes, a Twitch Extension review dependency, automated unsolicited cross-channel messaging, and autonomous adoption by the model.

## Honest feature boundaries

"Teaching" changes a stored executable playbook through a bounded compiler. The champion does not become a generally intelligent player. A supported natural-language lesson can be novel within the behavior grammar; it is not a license to invent new mechanics. Unsupported requests remain unsupported rather than silently mapping to a weak approximation.

## Definition of done

All S01–S14 evidence is linked from the build log; quality release gates pass; setup is reproducible; live demo uses actual channels; target measurements are replaced with observed results; credential and asset review is complete; intended source/docs are committed. Publishing and submitting are tracked separately from finishing local implementation.
