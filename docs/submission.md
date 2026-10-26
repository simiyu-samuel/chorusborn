# Hackathon submission and demo plan

Status: **draft planning material**. The application is not implemented. Rewrite the description into verified present tense only after release checks; do not submit planned features as completed work.

## Intended title and short description

**Chorusborn — Raised by chat. Proven in the arena.**

Planned description: A Twitch experience where communities teach persistent champions, test their tactics in branching replays, and compete against rival communities—with visible credit for the lessons their champions actually use.

## Draft project narrative

### Inspiration

We want viewers' contributions to outlast a single message or vote. A shared champion could give a community something to develop together: recognizable habits, disputed strategies, memorable failures, and victories they watched it prepare for.

### What we intend to build

Viewers will submit natural-language lessons through Twitch chat. A teaching agent will translate supported lessons into inspectable game behaviors. The streamer will compare the existing playbook with the proposal from an identical saved game state, review broader trial results, and decide whether to adopt the lesson for future rounds.

The champion's playbook will persist between streams. During live matches, the engine will record which lessons actually execute and use those receipts for contribution credits. Two consenting communities will be able to train independently and bring their champions into the same authoritative match.

### Technical approach

The planned stack shares a deterministic TypeScript simulation between live matches and trial workers. A bounded eve teaching agent will use a configured OpenAI model to propose structured behavior data. The server will validate it, evaluate it, and publish only coach-approved immutable playbooks. The model will not control the live tick or decide match outcomes.

### How we are using Codex

Completed so far: naming exploration, product analysis, official documentation research, product/architecture/contract planning, and local Git initialization.

Planned development contributions to record as they happen: implementation of deterministic game rules, Twitch authentication/EventSub, compiler constraints, branching replay, concurrency/recovery checks, and broadcast UI iteration. Replace this list with actual examples and evidence before submission. A prompt screenshot alone does not prove the system works.

### Challenges, accomplishments, lessons, and next steps

Fill these sections from the real build log after implementation. Expected engineering challenges include replay determinism, proving rather than narrating lesson effects, Twitch reconnect gaps, and readable audience participation. Do not claim those problems have been solved yet.

## Demonstration storyboard — target 2:45

| Time | On-screen evidence | Message |
| --- | --- | --- |
| 0:00–0:12 | Real arena; champion falls for a distraction | "Can chat teach our champion to do better?" |
| 0:12–0:32 | Actual Twitch viewer sends `!teach`; attributed proposal appears | A real viewer's suggestion enters the system |
| 0:32–1:05 | Current/candidate replay, shared starting tick, supported lesson highlighted | Show what changed; label illustrative scenario |
| 1:05–1:25 | Full suite result, a trade-off/negative example, coach adoption | Evidence informs a human decision; no cherry-picked intelligence score |
| 1:25–2:00 | Two real connected channels, accepted rivalry, champion executes adopted tactic | Show persistent strategy and actual rule-use credit |
| 2:00–2:25 | Genuine Codex session footage/diffs and meaningful verification output | Explain concretely how Codex helped build and debug the system |
| 2:25–2:45 | Result, playbook/history, product name | End with the community's champion and the next rematch |

Editing can compress elapsed time; label cuts/time compression. Never present a fixture as real chat, a prerecorded match as a live response, or a manually chosen result as an evaluation outcome. Avoid copyrighted music and unlicensed assets. Capture permissions for identifiable people included in published footage.

## Submission checklist

- [ ] Newly built project meets the Twitch/Codex theme and applicable entrant rules.
- [ ] Repository contains source, owned/authorized assets, setup, fixture mode, live configuration guide, and dependency notices.
- [ ] GitHub/GitLab/Bitbucket repository URL works; private GitHub/GitLab judging access is granted as instructed by Devpost.
- [ ] Working project is available for judging, with test credentials/instructions provided through an appropriate private channel if needed.
- [ ] Public YouTube video is under three minutes and shows Twitch functionality and actual Codex use.
- [ ] Description contains only implemented features and supported claims, in English or with required translation.
- [ ] Main build-thread Codex session ID is obtained through Codex and checked; do not invent it.
- [ ] All release evidence is linked from the build log and corresponds to the submitted revision.
- [ ] Submission deadline/timezone and video/repository permissions are checked again before submit.
- [ ] Final Devpost entry is actually submitted; a saved draft alone is not completion.

## Dates and judging availability

Published submission deadline: November 2, 2026 at 14:00 PST = November 3 at 01:00 Nairobi. Published judging dates disagree between the schedule and rules; plan availability through November 15 to cover the later stated period and recheck organizer updates. [Schedule](https://twitchcon-codex.devpost.com/details/dates), [official rules](https://twitchcon-codex.devpost.com/rules).

## Artifact register

| Artifact | Value / status |
| --- | --- |
| Local repository | `chorusborn/` in the current workspace |
| Remote repository URL | Pending |
| Live application URL | Pending |
| Public demo video URL | Pending |
| Main build session ID | Pending verification |
| Release commit/tag | Pending implementation |
| Final submission URL | Pending |

No external publication or registration has been performed as part of the planning baseline.
