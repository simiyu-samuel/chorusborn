# Build log and Codex evidence

Record real work and verification here. Do not backfill planned features as completed achievements. Keep actual source changes in Git; this log explains material decisions and evidence.

## 2026-10-26 — planning baseline

**Completed**

- Selected Chorusborn as the working name and defined its tagline and creative direction.
- Created a new local project folder and initialized Git on `main`.
- Wrote product, scope, game rules, architecture, policy/replay, data/API, Twitch, UX, quality, delivery, submission, decision, and source documents.
- Added an example lesson candidate and a draft JSON Schema for the bounded behavior format.
- Recorded the owner's instruction to commit completed work in project guidance and contribution rules.
- Consulted current official Twitch/eve/OpenAI/Postgres documentation and checked obvious naming/product overlap.

**Verification**

- Reviewed all 25 project files for text whitespace, final newlines, balanced fenced blocks, and valid JSON syntax.
- Checked all 45 local Markdown file links; every target exists.
- Validated the example against its Draft 2020-12 JSON Schema. Unsupported facts/goals, wrong condition types, and model-supplied ownership fields were rejected in four illustrative checks.
- Reviewed version/replay consistency, task dependencies, and the distinction between planned work and completed evidence.

These checks cover the documentation baseline only. No application tests, live Twitch connection, model-backed compilation, or deployment have occurred. This entry is included in the initial planning commit; use Git history for its exact revision.

**Codex contribution**

Codex performed the research, naming exploration, specification authoring, and local repository setup in the current chat. The exact main build-session ID must be verified through Codex before submission; it has not been recorded here.

**Next**

At this baseline, all application tasks remained TODO. The next entry records the first implementation increment.

## 2026-10-26 — first local studio and branching replay

**Completed**

- Connected the owner's GitHub remote and pushed the planning baseline (`a48fd8e`).
- Added a pinned npm/TypeScript workspace, Node 24 setup, build/check scripts, and a CI workflow.
- Implemented runtime candidate validation, a server-owned integer-grid Core Run simulation, complete snapshot hashing/restore, bounded policies, and actual execution receipts.
- Added isolated worker trials comparing the current playbook and an authored sample tactic from the same declared opening fixture, with reactive opponents and shared replay controls.
- Added coach adoption with stale-version/concurrent-adoption protection, immutable round-pinned playbooks, and atomic local JSON persistence.
- Built the responsive React coach studio, original SVG arena/champions, sample lesson bench, playbook, replay dialog, and separate read-only overlay authorization. Font assets are self-hosted and dependency notices are included.
- Reserved the local Twitch callback for channel `developersimiyu` and documented the console's blank-redirect-row validation issue. OAuth is not yet implemented.

**Verification**

- `npm run check` passes formatting, TypeScript, all 14 contract/simulation/API tests, and the production frontend build.
- Simulation checks cover 100 seeded repeated runs, checkpoint continuation, tampered snapshots, branching determinism, actual rule-use receipts, pinned versions, bounds, and simultaneous defeat/capture behavior. These are fixture checks, not a full evaluation suite.
- API checks cover unauthorized/foreign-origin writes, separate overlay authority, real worker execution, concurrent adoption, round-boundary activation, and persistence across a server restart.
- Two Chromium browser flows pass: desktop prove → scrub → adopt → reset → run → inspect receipts → isolated read-only overlay, and mobile layout/dialog use at 390×844.
- Inspected desktop and mobile screenshots from those runs. Generated screenshots, runtime data, and test traces stay in ignored local folders.
- Trial profiling removed redundant per-tick path planning and repeated A* work; the complete unit/integration run fell from roughly 23 seconds to 3.7 seconds on this development machine. No p95 production latency or OBS benchmark is claimed.

**Boundaries and next work**

This is explicitly local fixture mode. Samples are authored behavior documents, not real viewer messages or language-model output. Trials start from a declared opening scenario rather than an arbitrary live checkpoint. Twitch OAuth/EventSub, model compilation, PostgreSQL, rivalry, rollback/history, the full evaluation suite, and production recovery remain open. The server binds to loopback; it must not be exposed as a public service yet. Next integrate state-bound Twitch OAuth and real channel intake, then replace sample-only compilation with the bounded teacher.

**Codex contribution**

Codex implemented and debugged this slice, including the snapshot/policy contracts, simulation/path planner, worker execution, UI, concurrency checks, and browser verification. Use the feature commit containing this entry for its exact revision. The main Codex session ID remains pending verification; it has not been invented or copied from a different session.

## Future entry template

For each completed milestone, record date, feature/acceptance IDs, commit reference, meaningful checks and outcomes, screenshots/replay/evaluation references where appropriate, remaining limitations, and how Codex contributed. Never include secrets or full private session transcripts. Store bulky recordings outside Git and link final authorized artifacts when available.
