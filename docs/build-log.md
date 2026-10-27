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

## 2026-10-27 — EventSub and durable teaching intake

**Completed**

- Added a receive-only EventSub transport with welcome/subscription setup, watchdog, exact directed reconnect, unexpected-disconnect backoff, revocation handling, bounded frames/buffering, and visible gap/error states.
- Shared one connection per verified reader. Bound message/deletion/user-clear/room-clear subscriptions to the verified broadcaster identity, client token, subscription IDs, and WebSocket session; handle a notification racing setup without publishing it early.
- Added a durable local `!teach` queue with trusted Twitch attribution, Unicode/text bounds, envelope/message dedupe, cooldowns, queue caps, pause/resume, and coach rejection. Ordinary chat and foreign-source Shared Chat are ignored.
- Persisted command receipts and moderation tombstones atomically before displaying accepted changes. Removed text and attribution on received deletion/clear events, including during teaching pause and out-of-order delivery.
- Added a responsive community queue showing actual chat readiness, admission outcomes, pending compiler status, and moderation. Real lessons do not yet change the playbook; the authored sample trial flow remains separate.
- Added isolated socket/event fixtures for tests. Fake HTTP event injection exists only in the test server; the application has no equivalent ingestion route or runtime flag.

**Verification**

- `npm run check` passes formatting, TypeScript, all **49** contract/simulation/API/OAuth/EventSub/storage tests, and the production frontend build.
- New checks cover exact reconnect migration without duplicate subscriptions, including migration racing initial setup; lost-connection resubscription and keepalive timeout; subscription identity/rate-limit/revocation boundaries; notification/setup races; overload/storage failure; atomic queue persistence and dedupe across restart; pause/cooldown/capacity; and deletion-before-message/earlier-clear ordering.
- All **three Chromium browser tests** pass. The OAuth flow now additionally verifies attributed teaching receipt, duplicate suppression, escaped author text, pause/resume, deletion, coach rejection, disconnect, and live-queue layout at 390px width. Existing prove/adopt/play/overlay flows remain passing.
- Inspected desktop/mobile queue screenshots. These use explicit provider fixtures and remain ignored local artifacts; they are not real Twitch delivery evidence.
- The real local server accepted broadcaster authorization and reports **authenticated / live**, meaning all four validated EventSub subscriptions are ready. At the owner's request, Codex used the existing logged-in Twitch browser tab to post `!teach When carrying the core, take a cautious route home.` in the owner's channel. Twitch displayed the sent command; the separate Chorusborn tab then showed **1 waiting**, the exact lesson text, trusted **developersimiyu** attribution, and **Received from Twitch · awaiting compiler**.
- A separate local persistence check confirmed one waiting proposal with attribution present. Saved the real browser screenshot to ignored `.local/screenshots/live-twitch-lesson.jpg`; no cookie, token, private source ID, or complete raw provider payload was copied into Git. This was a broadcaster-authored live test; an independent second viewer still needs its own release evidence.

**Boundaries and next work**

This is the local B06/B16 intake foundation with atomic files (ADR 016), not PostgreSQL or the full release workflow. Only `!teach` is handled. Model compilation, voting, job leases, production roles, encrypted durable token storage, complete history/retention controls, rivalry, and full-suite evaluation remain pending. OAuth tokens are still memory-only; proposals and dedupe receipts survive restart but reading them requires reconnecting the verified channel. Messages and moderation events missed during a connection gap cannot be recovered.

**Codex contribution**

Codex implemented and tested the transport, queue, authorization boundaries, persistence, moderation ordering, and UI. It also ran the real connection readiness check without printing tokens, cookies, author IDs, or message text. The feature commit containing this entry identifies the revision; the main build session ID remains pending verification.

## 2026-10-27 — Groq lesson compiler and real community adoption

**Completed**

- Connected a one-shot Groq adapter using `openai/gpt-oss-120b`, selected with the owner after checking public hackathon resources for API credits. The ignored server `.env` supplies the key; no browser or model prompt receives it.
- Added strict four-outcome envelopes: candidate, needs clarification, unsupported, and refused. The provider sees fixed grammar instructions and normalized lesson text, without Twitch identity/channel IDs or unrelated chat. Typed predicates, bounded rules and strict objects are validated again locally.
- Recorded ADR 017: use a bounded native-fetch adapter in the existing Fastify service for this local milestone; defer the planned Eve/AI Gateway worker. No agent tools, shell, retrieval, autonomous adoption or model calls inside simulation ticks.
- Persisted attempt/outcome metadata, exact base playbook hash/version, prompt hash, model, timestamp and usage. Restarted running jobs become explicitly failed. Enforced three durable attempts per proposal, two simultaneous model requests, 20 calls per server process, 25-second timeout, 2,048 output tokens, bounded response bytes, and no automatic retries. These are request limits, not a monetary budget.
- Wired compile → inspect → fixture replay → coach adoption for real Twitch sources. Trusted author/source provenance passes through replay and stored rules. Stale policy, changed compilation, source rejection/removal and lost verification prevent adoption. Same-base successful requests reuse results; already-adopted sources cannot initiate another compilation in that playbook.
- Redacted generated proposal results with source moderation and removed private source-join metadata from spectator world DTOs. Source eligibility serializes with queue moderation during local adoption persistence. Full SQL transactions and historical source erasure remain pending.
- Added readable condition labels, compiler progress/errors, model/attempt metadata, a source-authored replay label and learned-state presentation. Existing authored sample tactics remain explicitly separate.
- Found and fixed a browser-test isolation issue: using dev ports let an already-open studio tab reconnect to the mock server and replace its local session cookie. Moved the harness to **5273/3101**; normal dev remains **5173/3001**. Tested both concurrently, reconnected the real account, and reproved/adopted the persisted candidate in the active studio without another model call. Existing stored playbooks were retained.

**Verification**

- Final `npm run check` passes formatting, TypeScript, all **60 tests across nine files**, and the production frontend build.
- New checks cover malformed/incomplete/oversized output, refusal/clarification/unsupported envelopes, spoofed fields and invalid fact/operator/value combinations, request caps/concurrency, timeout/rate-limit handling, job dedupe/attempt limits, restart recovery, source rejection during inference, authority loss, stale adoption, trusted rule credit, and private overlay metadata removal.
- All **three Chromium browser flows** pass on the separate test ports while the real dev server remains running. The mocked provider flow now verifies compilation, readable rules, replay, adoption, pinned-round activation and actual viewer-authored execution receipts, plus mobile fit and existing intake/moderation/disconnect behavior.
- Added and ran opt-in `npm run test:compiler:smoke`. All four synthetic live Groq cases returned the expected outcomes; the supported case also matched the exact carrying condition, return-home goal, cautious route and no ability. That checked-in run reported 4,241 input and 545 output tokens. This is smoke evidence, not a compiler accuracy benchmark or a billing report.
- Real browser proof: the earlier Twitch carrying-core lesson compiled via Groq, displayed its supported rule, ran through the actual trial worker, and was adopted with `developersimiyu` credit. In seed 42's declared opening fixture, baseline/candidate captures were **0/1**, damage taken **700/710**, and candidate rule-use count **16**. This illustrates a trade-off in one fixture, not general superiority.
- Started a real local v1 round and paused with actual source-author execution receipts visible at ticks **28, 32 and 36**. The studio remains **Chat live**, with the Groq compiler enabled. Saved ignored screenshots `.local/screenshots/live-groq-replay.jpg` and `live-groq-attribution.jpg`; no credentials, session cookies, raw provider envelopes or private source IDs are in this entry.

**Remaining boundaries**

This completes the local natural-language teach/prove/adopt path, not the entire release. Broad compiler corpus/evaluation, scenario development/holdout evaluation, live historical checkpoint selection, conflict analysis/rollback, PostgreSQL transactions and job leases, encrypted durable Twitch tokens, historical attribution erasure, independent-viewer evidence and two-channel rivalry remain pending. Token restart still requires reconnecting Twitch. Trials and running rounds are ephemeral; proposals, compiled results and adopted playbooks use separate atomic local files. Streamer-authored proof is not independent audience validation.

**Codex contribution**

Codex implemented the adapter and lifecycle, diagnosed Groq's constrained-decoder union ambiguity, retained strict local typed validation, implemented source-bound replay/adoption and attribution, tested failure paths and UI, fixed test-port interference, and verified the real saved Twitch lesson end to end. The feature commit containing this entry identifies the revision; the main build session ID remains pending verification.

## Future entry template

For each completed milestone, record date, feature/acceptance IDs, commit reference, meaningful checks and outcomes, screenshots/replay/evaluation references where appropriate, remaining limitations, and how Codex contributed. Never include secrets or full private session transcripts. Store bulky recordings outside Git and link final authorized artifacts when available.
