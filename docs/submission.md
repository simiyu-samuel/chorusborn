# Hackathon submission and demo plan

Status: **saved Devpost draft, not submitted**. The pitch, project story, technology
tags and repository link were saved and verified at
[Chorusborn on Devpost](https://devpost.com/software/chorusborn) on October 28, 2026.
The current narrative is preserved in [devpost-story.md](devpost-story.md).
On October 29 the story and required technical answers were saved in first-person
individual voice, the solo contribution description was added, and the generated
3:2 thumbnail was uploaded. Public text is preserved in
[additional information](devpost-additional-info.md).

The local compiler, rivalry and viewer guide are implemented. A real two-account
local match and proof review have been observed. Vercel deployment and isolated durable-runtime recovery checks are complete.
Independent audience/broadcast validation, a fresh hosted viewer lesson/rivalry,
broader evaluations and the final YouTube demo remain release work. Do not mark them complete without evidence.

## Title and elevator pitch

**Chorusborn — Raised by chat. Proven in the arena.**

Raised by chat. Proven in the arena. Twitch communities teach rival champions,
test their tactics in branching replays, and earn credit when their lessons are used.

## Hosting status

The owner chose an all-Vercel runtime, including redesigned durable state and match
coordination. The CLI created and verified project `chorusborn` under team
`samueldevke`, project ID `prj_65W8NVdJhsZ6b75Jbrv3MPQHK8GT`, and linked this checkout.
The cloud runtime candidate is implemented and locally verified; the production app is live at https://chorusborn.vercel.app. See [the deployment design](vercel-deployment.md).

A free Upstash Redis resource named `chorusborn-state` was requested through Vercel
Marketplace for production in `iad1`, with auto-upgrade, eviction and production-pack
options disabled. The owner accepted the integration terms, provisioning succeeded,
and production-only app/encryption secrets were saved with explicit approval.
The assigned domain `chorusborn.vercel.app` is live and verified; its app link and
hosting narrative were saved to Devpost. Hosted developersimiyu OAuth/EventSub also
succeeded after the owner registered the production callback.

The three requested additional-info fields are saved: the verified main Codex
session ID, technology requirement explanation and Twitch user journey. The ID
was checked against this active chat's runtime metadata and the app's thread list,
then entered in Devpost; it is omitted from the public repository copy. Submitter
Type is Individual and the public creator list shows Simiyu Samuel alone. Existing
country, survey and eligibility selections were left as provided. No demo video
was invented and the final hackathon submission has not been performed.

## Demonstration storyboard — target 2:45

| Time | On-screen evidence | Message |
| --- | --- | --- |
| 0:00–0:12 | Real arena; champion falls for a distraction | "Can chat teach our champion to do better?" |
| 0:12–0:32 | Actual Twitch viewer sends `!teach`; attributed proposal appears | A real viewer's suggestion enters the system |
| 0:32–1:05 | Current/candidate replay, shared starting tick, supported lesson highlighted | Show what changed; label illustrative scenario |
| 1:05–1:25 | Labeled scenario result, a trade-off/negative example, coach adoption | Evidence informs a human decision; no cherry-picked intelligence score |
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
- [x] Main build-thread Codex session ID is verified against current Codex runtime/thread metadata and saved in Devpost.
- [ ] All release evidence is linked from the build log and corresponds to the submitted revision.
- [ ] Submission deadline/timezone and video/repository permissions are checked again before submit.
- [ ] Final Devpost entry is actually submitted; a saved draft alone is not completion.

## Dates and judging availability

Published submission deadline: November 2, 2026 at 14:00 PST = November 3 at 01:00 Nairobi. Published judging dates disagree between the schedule and rules; plan availability through November 15 to cover the later stated period and recheck organizer updates. [Schedule](https://twitchcon-codex.devpost.com/details/dates), [official rules](https://twitchcon-codex.devpost.com/rules).

## Artifact register

| Artifact | Value / status |
| --- | --- |
| Local repository | `chorusborn/` in the current workspace |
| Remote repository URL | [simiyu-samuel/chorusborn](https://github.com/simiyu-samuel/chorusborn) |
| Live application URL | [chorusborn.vercel.app](https://chorusborn.vercel.app) — production READY |
| Public demo video URL | Pending |
| Main build session ID | Verified and saved in the private Devpost field; omitted from this public register |
| Thumbnail | [Promotional key art](media/chorusborn-devpost-thumbnail.png), uploaded; [generation record](media/chorusborn-devpost-thumbnail.prompt.md) |
| Contribution and technical answers | [Individual submission text](devpost-additional-info.md), saved and browser-verified |
| Release commit/tag | Hosted application `c080fd0`; complete GitHub workflow passed 102 unit and 18 browser tests |
| Devpost draft URL | [Chorusborn](https://devpost.com/software/chorusborn); incomplete, not submitted |

The owner authorized repository pushes, Vercel hosting and updating the Devpost project. The app is deployed and the project draft is updated. Demo publication and final hackathon submission remain pending.
