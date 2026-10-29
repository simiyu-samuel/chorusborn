# Devpost additional information

Submission voice: individual / first person. The verified main build session ID is saved in the private Devpost form; it is deliberately omitted from this public copy.

## Main technology requirement

I built Chorusborn as an individual, using OpenAI Codex throughout the project to turn the idea into a working Twitch experience. I directed the product scope and gameplay, then used Codex to implement and refine the TypeScript simulation, Twitch integrations, lesson-review workflow, branching replays, procedural stick-fighter animations, coach studio and spectator overlay. Codex also helped me debug fairness and possession bugs, write regression tests, repair CI failures, and redesign persistence and match ownership for deployment. The repository and build log document this work.

Twitch OAuth verifies each streamer and grants chat-read access. The Twitch EventSub WebSocket transport delivers chat messages into a separate review queue for each connected channel, including viewer-authored !teach commands. Each streamer controls their own champion and playbook; two authenticated streamers can accept a challenge and ready their champions for one shared match.

Groq serves OpenAI’s open-weight GPT-OSS 120B model (openai/gpt-oss-120b) as the bounded lesson compiler. It translates supported natural-language tactics into validated behavior rules. The coach reviews, tests and adopts a proposal; the model does not execute viewer code or decide match results.

React and Vite provide the web studio; Three.js and React Three Fiber render the arena and animated champions; Fastify runs the API and state streams. Vercel hosts the web gateway and authoritative game daemon, and private Upstash Redis stores encrypted checkpoints, sessions and command receipts. Vitest and Playwright check simulation, authorization, recovery and browser flows, with GitHub Actions running the checks.

## How streamers and their communities use Chorusborn

A streamer opens Chorusborn, connects their Twitch account and becomes the coach of a champion named after their channel. They show the arena on stream using the read-only overlay in an OBS browser source, and share the viewer guide so chat can learn the rules and see teaching examples.

Viewers participate in their streamer’s Twitch chat with !teach followed by a tactic, such as “When carrying the core, take a cautious route home.” Chorusborn receives the message with its author and places it in that channel’s review queue. The streamer compiles the lesson, inspects the proposed rules, and compares the current and proposed playbooks in branching replays from the same starting state. The streamer chooses whether to adopt it for a future round.

Two streamers can challenge each other, accept the rivalry and ready their champions. Each community guides its own champion through its adopted playbook. In the shared Core Run match, champions fight, shield, contest the core and carry it home. The first to three captures wins, with a 60-second limit. Playbooks stay locked during the round, so new lessons apply at round boundaries.

When a taught rule actually executes, its viewer receives visible credit. The overlay shows the same server-owned score and action for both audiences, while coaching and moderation controls remain private. This creates a repeatable stream segment: teach, test, adopt, compete, then discuss what happened and prepare for the rematch.

## Created by: contribution

I am the solo creator and developer of Chorusborn. I designed the game and streamer experience, then used OpenAI Codex to build the simulation, Twitch OAuth/EventSub integration, lesson compiler, replay and adoption workflow, animated champions, studio and OBS overlay. I also handled testing, CI and Vercel deployment.
