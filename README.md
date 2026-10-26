# Chorusborn

**Raised by chat. Proven in the arena.**

Chorusborn is a competitive Twitch experience in which communities teach persistent AI champions through chat, test their lessons in branching replays, and send their champions into live matches. Streamers coach; viewers contribute strategies; the arena makes their consequences visible.

The defining interaction is **teach → prove → adopt → compete**. A viewer's lesson becomes a proposed behavior, is compared against the existing playbook from the same game state, and can be adopted by the streamer. When the champion uses it later, an execution trace credits its author.

## Repository status

Planning baseline created October 26, 2026 for the Codex x TwitchCon Hackathon. This repository currently contains product and engineering documentation and example contracts. **The application has not been scaffolded or implemented.** Commands, services, budgets, and performance figures in the plans are proposed unless explicitly marked verified.

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

No remote repository, deployed service, paid resource, domain registration, or public submission has been created. A repository license is intentionally undecided until the owner selects one; see [decisions](docs/decisions.md).
