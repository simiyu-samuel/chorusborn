# Chorusborn

**Raised by chat. Proven in the arena.**

Chorusborn is a competitive Twitch experience in which communities teach persistent AI champions through chat, test their lessons in branching replays, and send their champions into live matches. Streamers coach; viewers contribute strategies; the arena makes their consequences visible.

The defining interaction is **teach → prove → adopt → compete**. A viewer's lesson becomes a proposed behavior, is compared against the existing playbook from the same game state, and can be adopted by the streamer. When the champion uses it later, an execution trace credits its author.

## Repository status

The first local fixture build is implemented: a React coach studio, server-owned Core Run arena, bounded sample lesson contracts, exact two-branch replay, coach adoption, local playbook persistence, and a separately authorized read-only overlay. The planning baseline was created October 26, 2026 for the Codex x TwitchCon Hackathon.

**Twitch OAuth/EventSub, the model-backed language compiler, PostgreSQL, rival channels, and the full evaluation suite are not connected yet.** The UI labels sample tactics and fixture scenarios explicitly. Production architecture and release gates remain targets unless the build log records verification.

## Run locally

Requires Node **24.22.1** (see `.nvmrc`) and npm 9 or newer. From this repository:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:3001**. Choose a sample tactic, select **Prove this lesson**, inspect the replay, then **Adopt for next round**. Reset the arena to load the new playbook and start the round to see actual rule-use receipts.

The fixture requires no Twitch or model credentials. Playbooks are saved in ignored `.local/studios.json`; active rounds and trial history are held in memory. The server binds to loopback and is not ready for public deployment. Overlay links contain a separate read-only key and work without a coach cookie.

```sh
npm run check            # formatting, types, engine/API tests, production frontend build
npx playwright install chromium
npm run test:browser     # desktop and mobile end-to-end checks
npm run build
npm start               # serve the built frontend and API at http://127.0.0.1:3001
```

If Chromium is already installed, set `CHROMIUM_PATH` to its executable for browser checks. CI installs its own matching browser. Font assets are bundled locally; no external font request is needed.

## Twitch application registration

First channel: **developersimiyu**. Register **`http://localhost:3001/auth/twitch/callback`** as the exact redirect URI for a confidential client. This callback is reserved for the next integration milestone, not implemented in the fixture build. Copy `.env.example` to an ignored `.env` for future credentials. During OAuth use `localhost` consistently rather than mixing it with `127.0.0.1`. See [Twitch integration](docs/twitch-integration.md) for the form's blank-row validation issue and setup boundaries.

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
