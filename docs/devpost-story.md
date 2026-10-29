## Inspiration
Twitch chat has ideas worth more than a fleeting message. We wanted two communities to raise recognizable rivals: champions whose habits come from the people watching, with a way to inspect whether a lesson actually helps.

## What it does
Chorusborn turns streamer rivalry into a game of community coaching. Each streamer connects their own Twitch account and fields a champion named after their channel. Viewers submit natural-language tactics with `!teach` in their streamer's chat.

The loop is **teach → prove → adopt → compete**. The coach reviews an interpreted lesson, compares the current and proposed playbooks in branching replays from the same game state, then decides whether to adopt it for a future round. When an adopted rule actually executes, its viewer receives visible credit. More lessons do not automatically mean a stronger champion: timing, conditions, priority and trade-offs matter.

In Core Run, champions contest a core and carry it home while attacking, shielding and navigating hazards. The first to three captures wins, with a 60-second round limit. Both communities train independently, accept a challenge and ready their champions for one shared match. An OBS-friendly read-only overlay shows the arena, while a sign-in-free viewer guide explains the rules and gives concrete teaching examples.

## How we built it
We built a TypeScript workspace with React, Vite, Three.js/React Three Fiber, Fastify and a deterministic simulation shared by live matches and replay workers. Twitch OAuth verifies each broadcaster; EventSub brings chat lessons into a channel-specific review queue. A bounded Groq-hosted OpenAI GPT-OSS 120B compiler translates supported language into validated behavior data. It cannot execute viewer code, publish a playbook or control the match clock. The server owns outcomes, and each active match pins its playbooks.

OpenAI Codex helped us develop the product scope and architecture, implement the engine and Twitch integrations, constrain and validate the compiler, build the coach/replay/overlay UI, animate the original procedural stick fighters, and debug failures with automated checks. The repository and build log record those changes and verification.

## Challenges and what we learned
A fair-looking animation is not enough: equal core claims originally exposed ordering bias and later a zero-possession loop. We added explicit tie initiative, alternating starts for rematches and paired neutral-opening comparisons. We also separated receiving, testing, adopting and actually using a lesson so the UI does not mistake publication for execution—or execution for causing a win.

A targeted replay can expose a trade-off, but it does not establish universal tactic superiority. Coaches need inspectable evidence and clear limits, not a fabricated intelligence score.

## Accomplishments and next steps
The local prototype has working Twitch intake, reviewed compilation and adoption, attributed execution, branching replay, two-channel rivalry and a viewer guide. We observed a real two-account local match; the latest onboarding revision passed 98 automated tests plus four browser flows across final runs. Those browser provider flows use mocks.

We are now preparing the Vercel deployment and durable match coordination. Remote hosting, independent audience/broadcast validation, broader scenario evaluation and the final demo video remain release work. Local playbooks and proposal queues persist on disk; production recovery is not yet claimed.
