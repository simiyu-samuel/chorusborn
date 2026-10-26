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

## 2026-10-26 — local Twitch OAuth

**Completed**

- Added server-side authorization-code exchange, random ten-minute single-use state bound to the initiating studio, and rejection of superseded or disconnected attempts.
- Validated the provider token's client ID, `user:read:chat` grant, user ID, and configured broadcaster login. Added periodic validation within the hourly requirement, one serialized reactive refresh, visible validation failure/reconnect states, and local-first disconnect with provider revocation outcome.
- Added the studio's connection UI and canonical localhost onboarding. Preserved the Host header through Vite's auth proxy and used a Lax HttpOnly session cookie for the cross-site callback; JSON mutation/origin checks remain enforced.
- Loaded root `.env` on server startup. Tokens remain server-memory only and are excluded from fixture persistence, public status, overlays, and request logs. Restart requires signing in again (ADR 015).
- Isolated browser tests from real credentials and local playbooks using a test-only in-memory server and explicit OAuth provider fixtures. The real dev/start entry points cannot activate that mocked provider.

**Verification**

- `npm run check` passes formatting, types, all 27 contract/engine/API/OAuth tests, and the frontend production build.
- New tests cover callback reuse, missing/cross-browser/expired state, denied consent, wrong channel/client/scope, redacted provider failures, refresh encoding/concurrency, revoked tokens, transient validation, and disconnect racing an exchange.
- Desktop and mobile coach flows pass. An additional browser flow passes canonical-host onboarding, a real app start response, cross-site navigation through a mocked provider, the app's real callback handler, verified identity presentation, and disconnect. Browser routes split the start redirect into a new provider navigation because Playwright matches the first URL of a redirect chain.
- Inspected the connected-state screenshot; it is provider-fixture evidence, not live broadcaster proof.
- With the owner's locally saved credentials, Twitch accepted a temporary app-token request and token validation matched the configured client. The temporary token was immediately revoked. Only boolean/status results were printed; no credential or bearer token was recorded.
- The real local server reports `oauth-configured-chat-pending`. `.env` remains ignored by Git. The owner completed the live authorization steps and reported the returned studio displaying **Connected as developersimiyu**, **Account authorization is separate from live chat intake**, and **Twitch account verified**. This is owner-confirmed live UI evidence; no real-account screenshot or token was copied into the repository.

**Remaining boundaries**

OAuth account authorization is separate from EventSub connection and a real viewer proposal. No Twitch chat messages are sent. EventSub, durable encrypted token storage, production roles, natural-language compilation, PostgreSQL, rivalry, and full-suite evaluation remain pending. This increment implements part of B05/S01, not the complete live teaching acceptance criterion.

**Codex contribution**

Codex implemented the OAuth boundary and UI, wrote the adversarial/lifecycle checks, diagnosed the proxy-host issue through browser evidence, and verified the saved app credentials without exposing them. The feature commit containing this entry identifies the revision; the main build session ID remains pending verification.

## Future entry template

For each completed milestone, record date, feature/acceptance IDs, commit reference, meaningful checks and outcomes, screenshots/replay/evaluation references where appropriate, remaining limitations, and how Codex contributed. Never include secrets or full private session transcripts. Store bulky recordings outside Git and link final authorized artifacts when available.
