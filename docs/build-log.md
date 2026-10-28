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

## 2026-10-27 — Proposed game art direction

- The owner asked for a distinctive game presentation, character identity and game feel beyond the functional studio prototype.
- Created a proposed 2.5D Core Run direction using the built-in Imagegen tool, with Mica/Rook character references, a tactile relay arena, compact HUD and explicit concept-art labeling. No external character image was used as an input.
- Saved the selected image, exact prompt and generation record under `docs/concepts/`, and added `docs/art-direction.md` covering silhouettes, character performance, state/event-driven effects, scene/console separation, renderer approach, build sequence and measurable review gates.
- Inspected the generated image inline. It is a visual reference, not a final wordmark, production turnaround, model/sprite sheet or runtime screenshot. The brief calls out decorative/non-mechanical elements and the need to rebuild exact branding/HUD text in code.
- Updated brand/UX/index references. No application behavior, dependencies, simulation state or runtime graphics changed; no runtime test rerun was needed for this design-only increment. Reviewed local Markdown/image references and `git diff --check` before committing.
- Rendering, rigs/animations, audio, broadcast comparison and measured visual/performance evidence remain implementation work. Codex shaped the brief, generated/inspected the concept and recorded the production boundary.

## 2026-10-27 — Relay Garden playable visual slice

**Completed**

- Replaced the primary SVG arena with a lazy-loaded Three.js/React Three Fiber scene shared
  by training, the existing two-branch replay and the read-only overlay. Kept the original
  SVG as a labeled compatibility view on missing/lost WebGL. No simulation/server behavior changed.
- Built original procedural Mica/Rook rigs with distinct fins/horns, face masks, eyes, scarf
  or mantle, animated feet/arms, breathing, carrying, recoil, capture and defeat poses. Added
  matching original SVG portraits. These first geometry-built assets are below the concept's
  intended final fidelity; no generated scene image is used as a fake runtime background.
- Added instanced stone lanes/walls, edge foliage, home monuments and actual capture-pad
  markers. Hazards, health, core possession, shields, decoys, capture rings and short author
  cues use authoritative snapshots/events. Credits require an actual executed rule receipt.
- Bounded visual interpolation between nearby received snapshots. Seeks, packet gaps, capture
  resets and respawns snap; the renderer never predicts a route or mutates game state.
- Added muted-by-default synthesized coach-preview audio, low effects and reduced motion.
  Mounts, seeks and reconnect gaps cannot trigger historical sounds. Replay/overlay views are
  silent. Covered live preview audio is suppressed while the replay dialog is open.
- Reduced rendering work by baking static pieces into eight meshes per champion's moving
  rig, instancing scenery, simplifying paving, caching WebGL capability detection, rendering
  paused scenes on demand and unmounting the covered live canvas during replay. Browser tests
  now use one worker to avoid concurrent graphics suites on this small development machine.
- Updated runtime/architecture/UX/art docs, ADR 018 and third-party runtime notices. The new
  renderer/assets are source code; screenshots and diagnostic frame samples remain ignored.

**Verification**

- `npm run check`: formatting, TypeScript, **64 tests in 10 files**, and frontend production
  build pass. Four added presentation checks cover bounded immutable interpolation,
  discontinuities, event/sound age and actual execution attribution. Existing deterministic
  replay, compiler, authorization and adoption checks remain passing.
- All **five Chromium browser checks** passed across the targeted graphics and studio runs:
  actual WebGL readiness and controls without world mutation, context-loss fallback,
  no-WebGL/reduced-motion fallback, desktop prove/adopt/run/read-only overlay, mobile fit,
  and the existing mocked Twitch compile/prove/adopt/receipt/moderation flow. (The last three
  flows share three tests; the two graphics cases make five total.) Provider fixtures are
  isolated on 5273/3101 and do not access the owner's real credentials or playbooks.
- Inspected actual 3D and 390px mobile captures. The final live API health endpoint returned
  `{"status":"ok","mode":"local-fixture"}`. Access to the saved in-app browser tab was
  blocked by its URL security policy; that tab was not bypassed or used as final live UI evidence.
- A short low-effects headless sample after optimization recorded a 16.7ms median and a
  516.6ms maximum/nearest-rank p95 over **12 animation-frame intervals** after five warmup
  intervals. An earlier heavier renderer sampled about 883ms median over 30 intervals and
  failed browser timeouts. Different small samples and changing host load do not establish
  a comparable sustained benchmark. A second 12-interval run recorded 16.7ms median and
  16.8ms p95; the variation is a further reason to require sustained profiling. Hitches
  remain uncharacterized; no 60fps or OBS claim is made.
- Build output keeps the studio at about 281KB minified/88KB gzip and the lazy 3D chunk at
  936KB/249KB gzip. Vite reports its >500KB chunk warning. Sustained loading/frame-time and
  compressed-video readability gates remain open.

**Remaining boundaries**

This advances the presentation portion of S10/S13. Final sculpted art/materials, broadcast
replay comparison, result/rematch direction, reference-machine OBS profiling, viewer validation,
full evaluation/holdout, rollback, production persistence and two-channel rivalry remain pending.
The local server is still loopback-only; Twitch tokens remain memory-only. No deployment,
submission, additional model calls or source-data reset was part of this graphics milestone.

**Codex contribution**

Codex implemented the scene, rigs, animation/state mapping, sound/preferences, fallback and
performance fixes; wrote the negative graphics/presentation checks; reviewed captures; and
recorded remaining fidelity/performance limits. Git identifies the exact revision. The main
build session ID still needs verification before submission.

## 2026-10-28 — Round results, rematch and broadcast finish

**Completed**

- Added one shared winner/draw result card to training and the read-only overlay, with an
  original champion portrait, authoritative final score, elapsed simulation time, pinned
  playbook version and cumulative possession/damage/lesson-execution stats for both actors.
  The table reads full round metrics rather than reconstructing totals from the 40-entry
  recent decision ledger. It makes no claim that a lesson caused a win.
- Added the coach's **Play again** action and strict `rematch` control. Only a finished round
  may rematch. Reset/start occurs synchronously before publication, using the same fixture
  seed and latest adopted book. Concurrent duplicate requests start once; a running match's
  pinned policy stays unchanged. Reset-to-paused remains a separate training control.
- Added match-point/final-ten-second scoreboard cues, intact character portraits, a held
  winner pose/lit gate, and original opt-in win/draw sound admitted only from a nearby
  running→finished snapshot transition. Replay branch views keep their arena uncovered;
  overlay/replay audio remains silent.
- Kept results outside the canvas image role, with a semantic heading/table and one coach
  status announcement per pause/run/result change. Added responsive result layouts and
  larger broadcast score/team labels.
- Added explicit spectator signal-loss labeling and froze cosmetic animation on the last
  received state while reconnecting. Spectator keys still grant no mutation authority.
- Fixed first-frame label projection in on-demand scenes: update the camera's world matrix
  before HTML markers project, so a freshly opened paused/final overlay has visible labels.
  Extended browser checks to assert markers are in the viewport.

**Verification**

- `npm run check` passes formatting, TypeScript, **68 tests in 10 files**, and the production
  build. New unit/API checks cover authoritative winner/draw/capture/time outcomes, cumulative
  metrics, pressure cues, sound dedupe/seek/gap boundaries, unfinished/unauthorized rematches,
  concurrent duplicate clicks, zeroed metrics and next-round policy pinning.
- A new isolated browser flow runs the real server clock through its normal 60-second limit.
  It adopts v1, queues v2 while v1 runs, verifies the actual result/metrics, opens a separately
  authorized 1920×1080 read-only overlay, starts a rematch at tick zero using v2, and drops only
  the spectator signal to verify stale-frame labeling and frozen cosmetic motion.
- The first complete browser run passed five existing checks and failed the new test's
  arbitrary requirement that all spectator checks finish within ten seconds of rematching
  (observed tick 208). Replaced that assumption with an assertion on the actual rematch
  response: tick zero, running, no winner and the expected pinned book. The game had correctly
  continued running during those checks; no simulation speed or result rule was changed.
- Inspected desktop, 390px mobile and 1920×1080 broadcast captures. Seed 42's authored sample
  v1 fixture finished **Mica 1–0 Rook** at 60 seconds, with **16** recorded Mica lesson uses.
  This is fixture evidence, not live rivalry, independent viewer validation or tactic superiority.
  Captures/traces remain ignored; no credentials, real chat or private source IDs are committed.
- A later complete run passed the new round flow and four existing checks, then exposed
  missing idle traffic in the browser-only mock EventSub provider: its 10-second keepalive
  contract caused the real watchdog to close it during a longer graphics/teaching flow.
  Added five-second provider keepalives with close cleanup to the browser harness only;
  production timeouts and unit tests of connection loss remain unchanged.
- Final verification after resuming on October 28: the corrected harness passes all three
  studio browser flows (desktop, mobile and mocked Twitch compile/adopt/moderation/disconnect).
  Together with the final graphics/fallback/full-round run, all **six browser flows** have
  passed. TypeScript and formatting pass after the harness change. No additional application
  change was made after the successful full-round/graphics checks. The lazy scene remains about
  936KB minified/249KB gzip and retains Vite's >500KB warning; sustained OBS performance and
  compressed-video readability remain unmeasured.

**Boundaries and next work**

This advances local S08/S10 presentation, not rival matches or the full release. Results and
active rounds remain ephemeral. Full scenario/holdout evaluation, rollback/history, broadcast
replay selection, production persistence, two-channel consent/matching and sustained OBS/player
validation remain open. No paid/model call, real-chat post, deployment or submission occurred.

**Codex contribution**

Codex built the result/rematch flow, state-derived cues, accessible layouts and signal-loss
presentation; tested the authority/concurrency boundary and actual full-round browser flow;
fixed the static-scene projection issue; and recorded the limits. The feature commit gives the
revision; the main Codex session ID still requires verification before submission.

## Future entry template

For each completed milestone, record date, feature/acceptance IDs, commit reference, meaningful checks and outcomes, screenshots/replay/evaluation references where appropriate, remaining limitations, and how Codex contributed. Never include secrets or full private session transcripts. Store bulky recordings outside Git and link final authorized artifacts when available.
