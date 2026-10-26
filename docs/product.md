# Product brief

## Description

Chorusborn lets Twitch communities develop persistent game-playing champions through natural-language teaching. A viewer suggests a strategy in chat; the system translates it into bounded, inspectable behavior; the streamer tests it against the existing playbook from a saved game state and decides whether to adopt it. The champion then competes using the community's accumulated lessons. Recorded rule activations give viewers visible credit for their contributions.

The product combines a live spectator sport, collaborative strategy design, and an understandable view into agent behavior. Codex is our development collaborator. The shipped teaching agent is a separate runtime component.

## Problem and opportunity

Many audience interactions are transient: a message, vote, or effect disappears after the moment. Our hypothesis is that an enduring, identifiable contribution gives a viewer another reason to participate and return. Streamers need formats they can host repeatedly without authoring an entire game or surrendering control of their show.

We will test this hypothesis rather than claim measured retention gains. A different name or more elaborate AI narrative does not establish novelty. Our intended distinction is **community-authored behavior with visible experiments, persistent adoption, and execution-backed attribution**.

## People and jobs

| Person | Job to accomplish | Product response |
| --- | --- | --- |
| Streamer / coach | Host an entertaining shared challenge and stay in control | Select matches, review lessons, run trials, adopt, pause, roll back |
| Contributing viewer | Make an idea matter and see its consequences | Teach from Twitch chat, inspect a trial, receive lesson credit |
| Casual viewer | Understand the stakes immediately | Clear objective, readable champions, short explanation of pivotal actions |
| Rival streamer | Collaborate or compete with another community | Accept a challenge, lock playbooks, share match state through separate overlays |
| Moderator | Keep participation manageable | Review/hide proposals, suppress abuse, pause intake; no token access |

## Core experience

1. The streamer connects Twitch, names a champion, and opens a training arena.
2. A champion visibly fails at a recoverable strategy problem.
3. A viewer submits `!teach <lesson>`.
4. The teaching agent proposes behavior and a concise explanation of supported meaning.
5. The coach selects **Prove**. A shared timeline shows baseline and candidate branches.
6. Evidence reports benefits, regressions, and inconclusive results without deciding adoption.
7. The coach adopts a version for the next round or requests a revision.
8. A match runs against a baseline opponent or another community. Rule-use credits appear.
9. Match history and the versioned playbook persist into the next session.

## Signature features

- **Prove your lesson:** branch the same complete state, change only the tested playbook, and compare outcomes.
- **Community playbook:** persistent, inspectable tactics with human-controlled adoption and rollback.
- **Contribution receipts:** credits tied to engine execution records, with text/identity removal support.
- **Rivalry night:** separate streamer channels train champions and enter the same authoritative match.
- **Personality through play:** different tactics and approved cosmetics make champions recognizable without hidden stat advantages.

## Success hypotheses

Targets for an initial moderated playtest, not established results:

- At least 4 of 5 first-time viewers can explain teaching and adoption after a one-minute introduction.
- At least 3 of 5 participants voluntarily submit a second lesson or revise their first.
- Both participating streamers can run a trial and adopt a lesson without developer intervention.
- A reviewer can trace a displayed credit to an actual executed rule and its source contribution.

Use consented observation and a short interview. Record failures and disagreements as well as highlights. A small playtest supports product decisions, not statistical retention claims.

## Competitive boundary

Effects platforms, autonomous AI gamers, and persistent stream games already exist. See [sources](sources.md) for checked examples. We must demonstrate the complete teach/prove/adopt/compete loop rather than describe it as unique by assertion. We are not claiming to be the first community-trained game agent.

## Commercial hypothesis after the hackathon

Potential recurring creator subscriptions for hosted campaigns, cosmetics, tournament administration, and richer history. Keep teaching participation equal during matches: subscriber status and payments must not buy stronger stats or priority evaluation. Pricing and willingness to pay are unvalidated. Monetization is outside the submission's implementation scope.
