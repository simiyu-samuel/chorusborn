# Chorusborn

**Raised by chat. Proven in the arena.**

Chorusborn is a competitive Twitch experience in which communities teach persistent AI champions through chat, test their lessons in branching replays, and send their champions into live matches. Streamers coach; viewers contribute strategies; the arena makes their consequences visible.

The defining interaction is **teach → prove → adopt → compete**. A viewer's lesson becomes a proposed behavior, is compared against the existing playbook from the same game state, and can be adopted by the streamer. When the champion uses it later, an execution trace credits its author.

## Repository status

The first local fixture build is implemented: a React coach studio, server-owned Core Run arena, bounded sample lesson contracts, exact two-branch replay, coach adoption, local playbook persistence, and a separately authorized read-only overlay. The planning baseline was created October 26, 2026 for the Codex x TwitchCon Hackathon.

Twitch sign-in and EventSub intake are implemented: state-bound OAuth, verified broadcaster identity, periodic validation, serialized refresh, a durable local teaching queue, duplicate protection, and deletion/clear handling. **The model-backed language compiler, PostgreSQL, rival channels, and the full evaluation suite are not connected yet.** Real viewer lessons remain **awaiting compiler**; they cannot change a champion's playbook. The UI labels sample tactics and fixture scenarios explicitly. Production architecture and release gates remain targets unless the build log records verification.

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

If Chromium is already installed, set `CHROMIUM_PATH` to its executable for browser checks. CI installs its own matching browser. Stop any dev server before browser checks: they launch isolated in-memory studios and a mocked Twitch provider, never load `.env`, and do not authorize or disconnect a real account. Font assets are bundled locally; no external font request is needed.

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

## Start here

| Document | Purpose |
| --- | --- |
| [Documentation index](docs/README.md) | Reading order and source of truth |
| [Brand and name](docs/brand.md) | Name rationale, voice, visual direction |
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
