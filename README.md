# Chorusborn

**Raised by chat. Proven in the arena.**

Chorusborn is a competitive Twitch experience in which communities teach persistent AI champions through chat, test their lessons in branching replays, and send their champions into live matches. Streamers coach; viewers contribute strategies; the arena makes their consequences visible.

The defining interaction is **teach → prove → adopt → compete**. A viewer's lesson becomes a proposed behavior, is compared against the existing playbook from the same game state, and can be adopted by the streamer. When the champion uses it later, an execution trace credits its author.

## Repository status

The first local fixture build is implemented: a React coach studio, server-owned Core Run arena, bounded sample lesson contracts, exact two-branch replay, coach adoption, local playbook persistence, and a separately authorized read-only overlay. The planning baseline was created October 26, 2026 for the Codex x TwitchCon Hackathon.

Twitch sign-in and EventSub intake are implemented: state-bound OAuth, verified broadcaster identity, periodic validation, serialized refresh, a durable local teaching queue, duplicate protection, and deletion/clear handling. **The Groq-backed lesson compiler is implemented locally.** A coach can compile a real proposal, inspect its rules, compare replay branches, and adopt it with trusted viewer credit. PostgreSQL, rival channels, and the full evaluation suite remain pending. The UI labels sample tactics and fixture scenarios explicitly. Production architecture and release gates remain targets unless the build log records verification.

## Run locally

Requires Node **24.22.1** (see `.nvmrc`) and npm 9 or newer. From this repository:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:3001**. Choose a sample tactic, select **Prove this lesson**, inspect the replay, then **Adopt for next round**. Reset the arena to load the new playbook and start the round to see actual rule-use receipts.

The fixture requires no Twitch or model credentials. Playbooks are saved in ignored `.local/studios.json`; teaching proposals and ingress receipts use `.local/chat.json`. Active rounds and trial history are held in memory. The server binds to loopback and is not ready for public deployment. Overlay links contain a separate read-only key and work without a coach cookie; they expose no private proposal queue.

```sh
npm run check            # formatting, types, engine/API tests, production frontend build
npx playwright install chromium
npm run test:browser     # desktop and mobile end-to-end checks
npm run build
npm start               # serve the built frontend and API at http://127.0.0.1:3001
```

If Chromium is already installed, set `CHROMIUM_PATH` to its executable for browser checks. CI installs its own matching browser. Browser checks use separate ports **5273/3101**, isolated browser contexts, in-memory studios and mocked providers. They never load `.env` or authorize/disconnect a real account, and can run alongside the normal dev server. Font assets are bundled locally; no external font request is needed.

## Twitch application registration

First channel: **developersimiyu**. The owner has created the developer app. Register **`http://localhost:3001/auth/twitch/callback`** as the exact redirect URI, choose **Game Integration** and **Confidential**, and put the Client ID/secret into the ignored `.env` using `.env.example` as a template. The server loads it on startup; restart after editing credentials.

Open **http://localhost:5173**, choose **Connections & setup → Connect Twitch**, and authorize while signed in as `developersimiyu`. The app requests only `user:read:chat`; it never sends chat messages. An attempted sign-in from `127.0.0.1` first moves to the canonical localhost studio, which can have a separate local fixture playbook because browser cookies belong to a hostname.

Tokens remain only in server memory and never enter the local JSON store or public state. Restart requires connecting again. Disconnect clears local authority before attempting Twitch revocation; if Twitch is unavailable, the UI explains how to remove the connection there. The loopback coach session is still fixture authority, not production role management. See [Twitch integration](docs/twitch-integration.md) for validation behavior and the console's blank-row issue.

## Receive real Twitch lessons

After connecting, wait for **Chat live**, then post in the connected channel:

```text
!teach When carrying the core, take a cautious route home.
```

The **From your community** queue shows the lesson and Twitch-provided author. Broadcasters can test their own commands too. Only `!teach` is implemented; ordinary chat is not stored. The queue accepts 280 characters, one lesson per user per 30 seconds, and 50 waiting proposals. Links, code fences, HTML, and line breaks are rejected. Pause/resume intake and reject proposals from the studio. Deletion and room/user clear events remove matching source text and attribution, including when intake is paused.

One EventSub connection is shared per verified reader. Account sign-in and chat readiness are separate states. Unexpected disconnects show a gap and resubscribe; Twitch cannot replay missed messages. A directed reconnect preserves the old connection until its replacement is ready. Storage failure or the bounded ingress buffer stops intake visibly. Proposals return after restarting and reconnecting the same channel. See the integration guide for retention and local limits.

## Compile and prove community lessons

Add `GROQ_API_KEY` to the ignored root `.env`, then restart. The server uses the pinned
`openai/gpt-oss-120b` model through Groq. The key stays server-side. After reconnecting Twitch,
choose **Compile lesson** on a received proposal. This explicitly sends only its lesson text
(with the fixed grammar instructions/schema) to Groq, without Twitch user/channel IDs, tokens,
or unrelated chat. No model call is made just because chat sends a lesson.

Review the interpretation, conditions, route, goal, and ability. A clear supported lesson can
then **Prove community lesson** using the declared carrier-dilemma opening fixture. Adopt only
after inspecting the comparison. The current round stays pinned; reset starts the next version.
Rules credit the Twitch-provided author, and keep a trusted source reference. Clarification,
unsupported, refusal, validation failure, and provider errors never become fallback tactics.

There are two concurrent model calls at most, 20 calls per server run, a 25-second timeout,
2,048 output tokens per call, and three durable attempts per proposal. These are local request
limits, **not a dollar budget**; restarting resets the process call counter. Configure account
spend limits in Groq for a billing ceiling. No automatic retries. Successful same-base requests
reuse their validated result. A changed playbook requires recompilation/replay. Deletion,
rejection, recompilation or lost OAuth authority makes old source evidence ineligible. Incoming
moderation redacts the proposal and pending generated result; previously adopted playbooks
remain historical gameplay data and need separate retention/erasure controls before release.

Compiler results and attempt counts are saved in `.local/chat.json`; jobs interrupted by a
restart become failed on load and require an explicit retry. Trials remain ephemeral. Separate
local files do not provide production transactions or distributed job recovery.

```sh
npm run test:compiler:smoke # OPT-IN: four real Groq calls with synthetic lessons; loads .env
```

The smoke check tests one precise supported tactic plus unclear, unsupported, and hostile
requests. It is not the planned broad compiler evaluation or scenario holdout suite.

## Start here

| Document | Purpose |
| --- | --- |
| [Documentation index](docs/README.md) | Reading order and source of truth |
| [Brand and name](docs/brand.md) | Name rationale, voice, visual direction |
| [Game art direction](docs/art-direction.md) | Proposed arena, champion designs, animation and broadcast production brief |
| [Product brief](docs/product.md) | Audience, value proposition, features, hypotheses |
| [Scope and acceptance](docs/scope.md) | What the prize submission must actually do |
| [Game design](docs/game-design.md) | Arena rules and meaningful strategy |
| [Architecture](docs/architecture.md) | Components, boundaries, deployment, recovery |
| [Behavior and replay specification](docs/behavior-spec.md) | What teaching means and how it is proven |
| [Data and API contracts](docs/data-api.md) | Persistence, authorization, commands, event protocol |
| [Twitch integration](docs/twitch-integration.md) | OAuth, EventSub, chat commands, reconnect behavior |
| [UX and broadcast design](docs/ux.md) | Streamer, viewer, and OBS experience |
| [Quality and evaluation](docs/quality.md) | Evidence required before release |
| [Delivery plan](docs/delivery-plan.md) | Dependency graph, five-day target, task backlog |
| [Submission plan and description](docs/submission.md) | Demo script, draft Devpost copy, checklist |
| [Decisions and risks](docs/decisions.md) | Architecture decisions and unresolved assumptions |
| [Sources](docs/sources.md) | Official references and research boundaries |
| [Build log](docs/build-log.md) | Honest record of completed work and Codex contributions |

## Development agreement

Keep completed work committed in this repository. Use small, coherent commits; update the relevant plans when decisions change; never commit credentials, private session transcripts, or generated bulk artifacts. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before implementation.

Remote repository: [simiyu-samuel/chorusborn](https://github.com/simiyu-samuel/chorusborn). No deployment, paid resource, domain registration, or hackathon submission has been created. A repository license is intentionally undecided until the owner selects one; see [decisions](docs/decisions.md). Third-party asset and dependency notices are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
