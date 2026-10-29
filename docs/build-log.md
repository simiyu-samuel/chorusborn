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

## 2026-10-28 — Acrobatic fighter Combat Lab

**Completed**

- Added `/combat-lab` and its studio link as a separate movement prototype. New original
  articulated Mica/Rook geometry uses long limbs, recognizable team accents and hip-centered
  rotations for airborne kicks, spinning strikes, somersaults, recoil and defeat poses.
  The owner's stick-fighting image informs the direction; no reference pixels are bundled.
- Added a fixed twelve-second sparring study generated through 240 ordinary simulation ticks
  in a bounded worker, with 241 full states, source/final hashes and all recorded contacts.
  Generation shares the two-worker admission cap, caches one promise/result and does not read
  or mutate the coach's playbook, Twitch channel or live world.
- Added authoritative `strike` records for existing legal attacks, including attacker, target,
  integer positions, post-shield damage contribution and shield status. Engine trace version
  is now `core-run/0.1.1`. Movement, attack cooldown/range, health, captures and match rules
  are unchanged. Older full engine checkpoints are rejected; stored local playbooks remain
  compatible. Twitch tokens remain memory-only and need reconnection after server restart.
- Added playback, half speed, keyboard-accessible scrubbing and move bookmarks, health/contact
  cues, reduced motion and an original SVG compatibility view. The preview is silent. Normal
  training, branching replay and broadcast retain the existing champion kit pending review.
- Documented replay lookahead and the boundary between visual choreography and actual
  jump/dodge mechanics in ADR 019 and the combat direction specification.

**Verification**

- `npm run check` passes formatting, TypeScript, **74 tests across 12 files** and the web build.
  New checks verify legal contact/range/cooldown/shield semantics, simultaneous damage, source
  immutability, every study frame reproduced through ordinary `step`, deterministic hashes,
  defeat/respawn, old-checkpoint rejection, cached fixture isolation and reduced-motion poses.
  TypeScript, formatting and the production build also pass after the final joint/pivot polish.
- The new two-flow browser coverage verifies rendered WebGL poses after paused seeking,
  recorded shield damage, playback, reduced motion, defeat, 390px overflow and missing-WebGL
  compatibility. A visual inspection caught a paused-seek issue: only the HUD initially changed.
  Explicit demand-frame invalidation fixes it; a rendered-frame marker guards that regression.
- The wider browser run passed the two new combat checks, both existing graphics/fallback
  checks and two existing studio checks. It exposed a test-only broadcast disconnect bug:
  the injected socket wrapper also closed Vite's development socket, triggering a page reload.
  Scope the injected disconnect to `/ws/demo`; the full real-clock round/rematch/stale-frame
  flow then passes. The desktop studio and mocked OAuth flows also exhausted their 45-second total budgets
  on this graphics-loaded host; give those multi-step flows 90 seconds without weakening
  assertions. A later mocked-intake check caught an ingress race in the test: await visible
  `Chat live` confirmation after Resume before emitting the next fixture event.
- Final targeted regressions pass the full real-clock round/rematch flow, desktop and mobile
  studio flows, and mocked Twitch teaching/compile/proof/adoption/moderation/disconnect flow
  (52.9 seconds). Together with the final combat and graphics/fallback checks, all **eight
  browser flows** have passed across these verification runs. No production application
  source changed after those successful checks.
- Inspected the actual built-in-browser preview playing and paused on the airborne somersault.
  Desktop/mobile captures and regression traces remain ignored under local artifact folders.
  No FPS, sustained OBS result, opponent prediction or independent viewer validation is claimed.
  The shared Three/R3F chunk remains about 912KB minified/242KB gzip and keeps Vite's size warning.

**Boundaries and next work**

This is a fixed animation study, not a live rival match or final game art. Leaps and rotations
have no new hit avoidance, damage, movement or cooldown effect. Live anticipation, kit rollout,
contact refinement, actual jump/dodge rules and policy support, OBS measurements and audience
playtesting remain open. Full evaluation/holdouts, rollback, rivalry and production persistence
also remain required for the release. No model request, real chat post, deployment or submission
was performed for this increment.

**Codex contribution**

Codex authored the contact trace, deterministic study, original fighter geometry/choreography,
preview UI and fallback; tested engine/API/rendering boundaries; found and corrected the paused
render and test disconnect issues; and recorded the limitations. The feature commit supplies
this revision. The main Codex session ID still needs verification before submission.

## 2026-10-28 — Shared live acrobatic fighter rollout

**Completed**

- Following owner approval of the prototype, replaced the shared arena's earlier rounder
  models with the articulated Mica/Rook fighter kit. Training, both branch comparisons and
  the read-only broadcast view use the same geometry. Removed the unused earlier model code;
  kept core/team primitives. Matching original SVG glyphs supply portraits and compatibility
  figures in the arena and Combat Lab, without a new dependency or external asset.
- Added a pure reactive match-pose sampler for running, core carrying, shield guard, confirmed
  kicks, spinning/airborne/somersault recovery, recoil, defeat and the authoritative winner.
  It sees only current/past strike records. Contact sparks use the recorded target position
  and shield flag; hazard damage can cause recoil but never invents an attack. Captures clear
  old contact/recoil poses, so a reset cannot keep fighting at the previous encounter.
- Reused the prototype rig through a pose-sampling interface. Combat Lab retains its separate
  complete-replay anticipation; live matches and normal branch replays never use that lookahead.
  Live subframe pose time is bounded to two ticks between publications. World position still
  interpolates only compatible observations; capture/respawn/gap/seek boundaries snap.
- Separated animation enablement from reduced motion. A paused branch now holds its exact
  contact pose with on-demand rendering instead of reverting to a reduced-motion guard.
  Reduced motion still suppresses leaps/spins/flips. Spectator signal loss stops animation;
  health, cooldowns, core possession, scores, rules and lesson receipts remain server-owned.
- Updated the README, combat direction, architecture, brand/art direction and ADR 019.
  No engine/API/schema/persistence change or new gameplay ability is introduced.

**Verification**

- Final `npm run check` passes formatting, TypeScript, **78 tests in 12 files**, and the web
  production build. New tests cover current/past-only contact admission, determinism/input
  immutability, bounded subframe sampling, exact paused sampling, accessibility suppression,
  carrying/shield/damage/defeat/winner poses and capture-reset cleanup. An initial test wrongly
  assumed the fixture's shield was still active at tick 35; it now explicitly sets a live shield
  for that isolated presentation case rather than changing the engine's ability duration.
- A new browser flow uses an actual proof API response, finds a recorded live contact in the
  baseline branch, seeks to it, checks rendered tick/pose, seeks away and returns, and verifies
  the coach world and playbook are unchanged. The shared kit remains visible in both branches.
- The full browser run passes the new combat/branch checks, graphics/context-loss and no-WebGL
  checks, real-clock full-round/rematch/broadcast checks, mobile studio and mocked Twitch flow.
  One existing desktop proof assertion used a ten-second dialog deadline while its successful
  API response took 10.3 seconds. Synchronize that test with the real proof response; its complete
  teaching/adoption/overlay flow then passes. All **nine browser flows** have passed across
  these runs. The final capture cleanup is covered by unit checks and a targeted branch-render
  rerun. No simulation timing, worker timeout or assertion was weakened.
- Inspected the actual built-in browser's updated studio, portraits and full broadcast arena
  during a local fixture round. Captures remain ignored under `.local/screenshots`. Restored
  the existing Twitch chat-read connection after the earlier server restart; the UI confirms
  **Chat live** and the previously saved playbook/queue remains available. No chat post or
  model compilation was performed for this step.
- Shared Three/R3F/rig code remains about 916KB minified/243KB gzip, plus the roughly 16.5KB
  arena scene; Vite's large-chunk warning remains visible. No sustained OBS/FPS, compressed-video
  readability or independent audience result is claimed.

**Boundaries and next work**

This advances the local S08/S10/S13 presentation. Acrobatic recovery is cosmetic and reactive
at confirmed contact; it grants no jump/dodge advantage or added damage. True evasive mechanics
still need explicit cooldown, hit-window, movement/collision, counterplay and policy contracts
with mirrored deterministic tests. Camera/contact polish, audience/OBS validation, evaluation
and holdouts, rollback/history, rivalry and production persistence remain open. No deployment,
paid resource or submission was created.

**Codex contribution**

Codex integrated the shared rig, state-derived pose sampler, compatibility glyphs and portraits;
verified match/replay/authority boundaries, fixed pause/reset presentation and test synchronization,
and recorded limits. The feature commit supplies this revision; submission still needs the
verified main Codex session ID.

## 2026-10-28 — Canonical streamer champions and two-community rivalry

**Completed**

- Connected champion display names now come from Twitch's verified lowercase username.
  Mica/Rook remain visual-kit/fallback identities. Updated scoreboard, arena/compatibility
  labels, core/capture cues, result text, own-champion cards and rule descriptions; side B's
  private receipts/stats/portrait reference its own actor, and rivalry overlays can credit actual
  execution by either community.
- Removed the global single-channel sign-in restriction while preserving client/scope/token
  validation. Persisted one canonical channel binding with its local book. Same-channel fresh
  browsers rejoin it; another account cannot claim its champion. Legacy books with trusted
  source channel IDs migrate only to that verified owner. Binding is serialized, and ownership
  is checked before an OAuth session becomes active. Rejected account switching preserves the
  original session; later adoptions retain channel metadata.
- Added a process-local rivalry coordinator and strict targeted challenge, accept/decline/cancel,
  ready/pause/leave routes. Only the invited verified owner can accept. Both coaches must ready
  to start/resume/rematch; readiness is tied to policy hashes and a matching active match ID.
  Either verified participant can pause or end the rivalry. Lost OAuth pauses play and clears
  readiness. Each community keeps its own EventSub intake, compiler/proof/adoption path and book.
- Both studios and their existing read-only overlays observe one authoritative world. The clock
  advances it once; both policies are copied at start/rematch and remain pinned through pauses.
  Mid-round adoption queues a later book. Private queues, proposals and rule source joins are
  excluded from peer/public match DTOs; overlay keys have no coaching authority.
- Added the neutral rivalry opening: both home spawns, no fixture carrier or opening decoy,
  equal base stats and a core equidistant from the homes. Engine `core-run/0.2.0` serializes
  required bounded `arena.coreSpawn`, used by capture/idle resets and visible center marks.
  Existing training defaults stay the same. Old full checkpoints are rejected; local books
  remain compatible. Neutral opening is not a claim of tournament balance or mirrored evaluation.
- Added the responsive rivalry panel, owner/peer readiness/verification states, persistent
  streamer names, name-aware lesson descriptions and a clear local/remote setup boundary.
  Recorded architecture/ownership/consent in ADR 020 and the new rivalry guide.

**Verification**

- Final `npm run check` passes formatting, TypeScript, **86 tests across 15 files**, and the
  production web build. New simulation checks cover neutral distances, pinned independent
  policies, actual actor-B rule execution/credit, complete restore and neutral reset positions.
  Coordinator checks cover ownership, wrong/uninvited/expired/duplicate acceptance, one shared
  clock, locked books, mutual start/pause/rematch, adoption invalidation and OAuth loss/recovery.
- New API integration checks run two independent mocked OAuth identities and separate scoped
  EventSub transports through own-channel ingress, compile/prove/adopt, accepted shared match,
  read-only overlay, cross-channel rejection and disconnect pause. Reconnect/restart checks
  cover canonical book recovery and legacy ownership migration without empty-book replacement.
  A migration test caught the need to resolve old trusted source-channel records when the saved
  ownership field is absent; it now recovers that book and rejects a foreign claimant.
- A new two-context browser flow uses **fixture_host / fixture_guest** mock identities, keeping
  them separate from the earlier single-channel fixture. It verifies isolated queues, second-
  channel compile/proof/adoption, invitation acceptance, mutual readiness, shared world/ID/score,
  pause, actor-B identity/book, read-only overlay, mobile overflow and ending the match. Its first
  run caught a test-origin mistake: relative API requests used the harness's `127.0.0.1` base
  after OAuth moved the pages to `localhost`, returning unrelated anonymous studios. Use the
  canonical absolute origin and assert match identity/mode before comparing world state.
- The broad ten-flow browser run passed eight checks, including the new rivalry and the normal
  full sixty-second round/rematch/result flow. Updated the graphics test to scroll the arena
  into view after the new panel changed page height, and synchronized the existing community-
  proof assertion with the actual successful API response. Both targeted reruns pass, so all
  **ten browser flows** have passed across these verification runs. Runtime limits and gameplay
  assertions were not weakened. These are provider fixtures, not second-human live evidence.
- Inspected the two-streamer mock overlay and 390px coach capture. Restored the real local dev
  server after its previous process exited, reconnected **developersimiyu**, verified **Chat live**
  and the retained **v3 / three-rule** playbook, and created a real **local pending challenge to
  serleusler** from the authenticated studio. The other broadcaster has not authorized/accepted.
  Captures stay ignored; no Twitch chat post or model compilation was made for this feature.
- The main web chunk is about 300KB minified/93KB gzip; shared Three/R3F/rig remains about
  916KB/243KB gzip, with the existing Vite size warning. No sustained OBS, retention, model
  accuracy, tactic superiority or independent audience benchmark is claimed.

**Boundaries and next work**

This implements the local S09 flow; it does not complete real two-community release evidence.
Serleusler must authorize its own account and accept/ready. Local tests can use separate browser
profiles on one computer. A remote streamer cannot reach this localhost server; shared HTTPS
hosting, production origin/session controls and durable persistence are a separate deployment
milestone. Tokens/challenges/readiness/matches are memory-only; restart requires reconnecting
and re-challenging. Existing proof trials remain training-fixture comparisons, not current-rival
branches. Full evaluation/holdouts, rollback/history, balanced mirrored match series, durable
recovery, tactical jump/dodge rules and measured OBS/audience validation remain open. No hosting,
paid resource, third-party message or hackathon submission was created.

**Codex contribution**

Codex implemented canonical ownership/migration, verified account naming, the two-community
coordinator/API/UI, neutral deterministic scenario and identity-aware presentation; tested the
independent authority/teaching and shared-match boundaries; repaired browser synchronization;
and documented the limits. The feature commit supplies this revision. The main build session
ID still needs verification before submission.

## 2026-10-28 — Fair core claims and inspectable playbook behavior

**Trigger and findings**

The owner reported a real two-account test with repeated 3–0 wins for serleusler despite its
one-rule book. The live studio showed both verified participants and locked v1/v7 books.
Read-only saved-book reproduction confirmed the score. Swapping their sides preserved the
winning *policy*, showing that the balanced retrieval route was slower than the opponent's
baseline direct approach. Five of the seven owned rules repeated carrying/return behavior;
only the highest-priority copy controlled that situation. A separate identical-book reproduction
exposed an engine defect: actor A won 3–0 through array-order pickup priority.

**Changes**

- Engine `core-run/0.3.0` targets cell centers inside pickup range for a between-cell core,
  mirrors path tie breaks by home side and checks rule arrival using the same interaction range.
- The closest living eligible claimant picks up; equal-distance claims stay contested until
  movement/retreat/defeat resolves them. Simultaneous damage and defeats still precede pickup.
- Arena/overlay show **CORE CONTESTED** for equal living claims. The playbook explains first-rule
  priority, identifies exact behavior duplicates and reports actual per-round executions only
  for rules present in the locked book. New unpublished-to-round rules are labeled explicitly.
- Both saved books remain unchanged. No model call, Twitch chat post or silent adoption was made.
  The dev watcher restarted for the ruleset update, ending ephemeral tokens/match; reconnecting
  both accounts and issuing a new challenge is required. Saved books remain available.
- Documented the rules and limits in game design, behavior, rivalry, architecture and ADR 021.
  Earlier engine checkpoints are deliberately incompatible; local stored books remain compatible.

**Verification**

- Full `npm run check` passes **92 tests in 16 files**, formatting, types and production build.
  The existing shared-renderer chunk-size warning remains.
- Fairness regressions cover nearest/dead/equal/reversed-storage claimants; identical-book draws
  and equal cumulative metrics across seeds 0/1/2/42; per-tick mirrored full actor/controller/core
  state and metrics with different route books; a shield contest that wins on either side; and
  exact continuation from a contested checkpoint plus rejection of engine 0.2.0 checkpoints.
- **Three targeted browser flows pass**: two independent mocked-channel teaching/consent/shared
  rivalry with the contested cue; ordinary proof/adoption/locked round/read-only overlay; and
  new duplicate/actual-use/next-round diagnostics. Providers are mocked, not a second live match.
- Visually verified the real retained v7 book and its four duplicate warnings. Screenshots and
  logs remain ignored under `.local/`. The current server carries the new ruleset.
- Offline copied-book experiments still give the original 0–3 after the fix, with mirrored
  scores on swapping sides. A synthetic direct-retrieval addition gives 0–0; direct plus shield
  gives 3–0 on this one seed/opponent. These experiments did not change persisted books and are
  not broad evidence of superiority. The training proof still uses the carrier-dilemma fixture.

**Boundaries**

Equal strategies may draw in this symmetric arena; no random or account-specific handicap forces
a winner. This is a bounded fairness regression, not a completed balance study, holdout suite,
remote hosting/recovery milestone or guarantee of wins. General conflict analysis, rule disabling,
rollback and rival-opening proof still remain work. Codex implemented and verified this fix;
this entry is committed with the corresponding source increment.

## 2026-10-28 — Owner-requested local fresh start

The owner requested clearing streamer gameplay data to begin with empty playbooks. Stopped
the local dev processes before changing stores, made a private ignored recovery copy under
`.local/backups/fresh-start-20261028-115125`, and reset every local stored book (including legacy
fixture copies) to version 0 with no rules. Cleared the active chat store, including proposals,
compiled results, ingress receipts and cooldowns. Preserved canonical channel bindings and local
studio/overlay access so existing browsers continue to reach the same champions. Credentials
were unchanged, verified by an in-memory before/after digest; none were printed or committed.

Restarted the existing loopback dev server. Both developersimiyu and serleusler API states now
show v0 / zero rules, tick 0, score 0–0, no latest trial and no active/pending rivalry. Application
store loaders accept the reset files and both channel queues are empty. Visually verified the
real developersimiyu **Playbook 0** empty state; the screenshot remains ignored. Restart cleared
memory-only OAuth sessions, so both accounts must reconnect before teaching or re-challenging.
The fixed baseline and authored sample tactic catalog remain available; no sample is adopted.

This was a local data operation, with no game code or dependency changes. No provider call,
chat message or silent lesson adoption was made. Only this operation record is committed;
active stores and the recovery copy stay outside Git.

## 2026-10-28 — Audit of the zero-possession rivalry stalemate

The owner reported repeated 0–0 rounds after teaching both champions. Read-only API inspection
confirmed an actual finished shared rivalry, engine 0.3.0, with the current books pinned:
serleusler v2 (two rules) and developersimiyu v5 (six rules). Both had exactly zero possession
ticks; serleusler had zero learned-rule executions, while the direct-retrieval rule executed
97 times for developersimiyu. Thus neither a stale adopted version nor absent retrieval-rule
execution explains this case.

A deterministic offline run of those saved books reproduced the live cumulative metrics and
0–0 score, including 730 damage taken by each champion and zero pickup/shield events. The first
meeting is tick 52 (2.6 seconds); equal 20-damage attacks produce simultaneous defeats at tick
132 (6.6 seconds), then at 300/468/636/804/972/1140. There are seven mutual defeats and 560 ticks
of equal surviving core claims. The process repeats because equal claims grant no possession,
the baseline/explicit retrieval approaches repeat, and the post-respawn world has the same
relevant tactical symmetry. Swapping books between sides reproduces the stalemate.

Both published shield policies require `self.carryingCore`, which is never true. On the owned
v5 book, the newer generic carrying/return-home rule also precedes and shadows the older
carrying-and-shield-ready rule: even a later pickup would select the generic return rule first.
The exact-duplicate inspector does not yet warn about this broader predicate overlap. The
first-match-priority semantics are functioning, but their effect is poorly exposed.

Counterfactuals used offline copies only, with one added available-core/direct-route/shield
rule. Adding it to developersimiyu alone yields 3–0, 9.15 seconds possession, three pickups and
six shield events; swapping sides mirrors that win. Adding it to **both** books yields another
0–0 with no possession, despite 24 shield events. This demonstrates that simply asking both
communities for the same opening-shield lesson does not solve the symmetric ruleset deadlock.
These are one-seed diagnostics, not a tactic benchmark or proof of overall competitive balance.
The compact report is ignored at `.local/stalemate-audit.json`.

No persisted book, active match, OAuth session, engine rule, or external provider was changed
for this audit. No model/Twitch request or server restart was needed. The previous equal-claim
fix removed order bias but intentionally allowed draws; this playtest shows that the resulting
zero-possession loop needs a deliberate game-design revision, rather than being presented as
successful gameplay. Next design work should define a visible and balanced contest-resolution
mechanic (including mirrored/paired evaluation), expose priority conflicts/reordering, and
support neutral-opening/rival-policy proof instead of judging retrieval lessons only from a
fixture that starts with possession. Perfectly symmetric deterministic play cannot pick a
unique winner without an explicit symmetry-breaking rule; do not reintroduce hidden actor-ID
priority or silently rewrite the owners' lessons to conceal that trade-off.

## 2026-10-28 — Visible tie initiative, reviewed priority order and paired neutral proofs

**Implemented**

- Engine `core-run/0.4.0` replaces indefinite rivalry ties with a ten-tick/0.5-second contest.
  The visible initiative holder wins a sustained equal claim, a real event records it and the
  arrow passes. Unique/closer surviving claims still resolve immediately; simultaneous defeat
  precedes pickup. Losing equality or an idle-core relocation clears the timer. Training carrier
  fixtures keep initiative disabled. Full snapshots require opening/current arrow and timer;
  old checkpoints reject while stored books remain compatible.
- Challenge acceptance draws the opening arrow server-side using `crypto.randomInt(2)`; it is
  visible before readying and stays fixed through tick-zero start/pause/resume. Each rematch
  reverses the opening arrow. Single games may have a first-turn advantage; opposite-start pairs
  make it measurable. The engine remains deterministic after that recorded initial input.
- New owner-only priority endpoint validates expected version and an exact permutation of all
  own rule IDs, publishes a new version, preserves source/author data, clears old trial evidence
  and pending readiness, and leaves the active world pinned. UI up/down buttons implement it.
  Exact duplicates and syntactically provable same-goal shadowing are labeled. The real owned
  shield rule is visibly marked as blocked by rule 02; no user rule was silently reordered.
- Lesson scenario selection supports carrier delivery or a neutral home-spawn opening. Neutral
  proofs use the attached rival's locked book/version (baseline otherwise), pin it for four
  deterministic branches and report both starting initiatives. First-start replay frames and
  opposite-start summary/source/final hashes are explicit. Peer private provenance is redacted
  from replay frames; live worlds stay untouched. Both sample and eligible community lessons use
  the same selector and existing reviewed adoption path.

**Verification**

- Full `npm run check`: **96 tests in 17 files**, formatting, types and frontend build pass.
  An initial run overlapped Chromium and timed out the two new multi-worker API tests; the full
  standalone rerun passed without weakening their timeouts or the production worker timeout.
- Simulation regressions cover both initiative starts across seeds 0/1/2/42, equal aggregate
  opposite-start outcomes for identical delivery books, full per-tick mirrored trajectories
  when policies/sides/initiative swap, uninterrupted timer/paused state, unique/defeated claims,
  timer reset on core relocation, exact checkpoint continuation and missing/old state rejection.
- API tests cover no-cookie/invalid/stale/duplicate orders, concurrent publication, no-op order,
  persistence, pinned active book, repeatable paired neutral results, unchanged live state and
  stale adoption rejection. Mocked two-channel integration checks rival book selection,
  side-B-to-A normalization and private peer source redaction in neutral proof frames.
- **Four browser flows pass**: independent mocked accounts with an actual shared-match pickup;
  new neutral paired proof/review/priority save and mobile fit; ordinary proof/adoption/locked
  round/read-only overlay; and duplicate/next-round execution diagnostics. No live provider is
  involved in browser fixtures. Captures/logs remain ignored under `.local/`.
- Offline copies of the real v5/v2 books now produce 3–2 with own initial initiative and 2–3 with
  the opposite. Both champions record possession/captures. Identical carrier books behave the
  same way on the checked symmetric cases. Empty novice books can still draw, with possession,
  because their baseline does not consistently deliver under pressure. This is not a promise
  of nonzero scores for arbitrary strategies or broad competitive balance.
- Restored the local dev server after it had stopped during an interrupted session. Confirmed
  the real v5/six-rule book and its blocked-shield warning plus priority buttons in the browser.
  Persisted user books and credential configuration were left intact. The restarted process has
  no live OAuth sessions/rivalry; both accounts must reconnect and create a fresh challenge.

**Boundaries**

The proof pair varies initiative only; broad layouts/opponents/holdouts, editable rule disabling,
version-history rollback, remote hosting, durable recovery and OBS performance evidence remain
work. The second proof start has summary metrics rather than a second replay viewer. Existing
renderer chunk-size warning remains (about 916KB minified/243KB gzip); main web bundle is about
305KB/95KB gzip. No dependency, model integration, chat post, deployment or paid resource was
added. Codex implemented and verified the controller/API/UI/tests and documented ADR 022; this
entry is committed with that source increment.

## 2026-10-28 — Real two-account result and a rejected improvement hypothesis

The owner asked to proceed with priority and neutral-proof review. The connected studio already
had the intended shield rule above generic return in v6; the completed round recorded three
executions of that shield rule. No additional reorder was necessary or performed. Both real
Twitch identities were authenticated with chat live. Read-only API inspection confirmed that
both owners saw the same match ID/world and a finished score: serleusler v2 scored 2 with 6.30
seconds possession, while developersimiyu v6 scored 3 with 8.85 seconds possession. The displayed
result rounded the latter to 8.8 seconds. This confirms local real-account match flow, not an
independent audience or broadcast study.

Compiled one existing waiting retrieval proposal through the ordinary coach UI using the
configured Groq model (one call; process allowance moved from 20 to 19). The reviewed interpretation
selected available-core collection by a balanced route, with no ability. Ran **Neutral opening**
proof against serleusler's locked v2 book. With own initiative first, current v6 scored 3 and the
candidate scored 0; with the rival's initiative first, current scored 2 and candidate 0. Aggregate
captures were 5 versus 0. The new rule would precede the existing direct retrieval rule and trade
speed for a hazard-avoiding detour. Evidence therefore did not support adoption for this matchup.
The candidate remains compiled and unadopted; published books stay v6/v2 and the live finished
round is unchanged. No Twitch message, reset, reconnect, rematch or opponent control was issued.

During the live proof review, the 3D arena footer incorrectly said **Carrier dilemma** because
it selected scenario text from presentation mode (`replay`) instead of the serialized arena ID.
Changed that footer to derive neutral/carrier text from world state, consistent with the SVG
fallback. Extended the existing browser flow to assert two neutral arena footers and no carrier
footer in the neutral dialog. Type checking, targeted formatting and the full neutral-proof/
priority browser flow pass; the production frontend build also passes. No engine/backend or
model configuration changed, so the prior 96-test simulation/API check was not needlessly rerun.
The live proof screenshot remains ignored at `.local/screenshots/live-neutral-proof-review.png`.

Updated current status text to distinguish the observed real local accounts/match from the
still-pending independent two-community broadcast, broader scenarios/holdouts, deployment and
durable recovery. The proof is evidence for this pinned opponent/seed only, not universal tactic
ranking. Raw chat, credentials and private proposal identifiers remain outside Git. Codex operated
the authorized review, fixed the scenario label and recorded this source increment.

## 2026-10-28 — Viewer field guide, stream reminder and truthful lesson stages

**Implemented**

- Added anonymous `/guide` and `/guide/`, lazy-loaded without mounting the coach API effect.
  It includes the core/home SVG diagram using owned fighter art, first-to-three/60-second rules,
  shield/respawn timings, initiative, six condition/action examples, route/ability trade-offs,
  priority and visual-only acrobatics, lesson stages and failed/inconclusive lesson explanations.
  Anchors, skip navigation, semantic headings, disclosure FAQs and responsive layout support
  keyboard/mobile use. The page identifies itself as **How to play — Chorusborn**.
- Shared command/link copy component handles clipboard success and denial. Denial exposes a
  read-only selectable textarea. Copying sends no message and triggers no model request. The
  coach's share card and sidebar link open the guide; the copied URL uses only current origin
  plus `/guide`, excluding overlay keys and query parameters. Localhost links are labeled local
  previews; no hosted URL or QR distribution was invented.
- Read-only overlays have a compact objective/command/review reminder and safe guide link. Their
  arena height reserves space for it and the rivalry initiative strip. No coach controls, private
  pending source text or new spectator API authority were introduced. Existing actual-use credits
  remain driven by executed decisions. Public per-viewer receipt/status replies are not implemented.
- Private community proposals show received, interpretation/review readiness, tested-awaiting-
  decision, adopted-next-round, adopted-in-locked-book and used stages. Use counts join published
  own rule IDs to the **owner's** locked actor/metrics, so redacted peer-world source joins and
  side B work correctly. Publishing alone or counts from the other champion cannot imply use.
  Moderation/rejection takes precedence, and tested evidence checks the compilation identity.
  Removed redundant rejection text discovered by the browser flow.

**Verification**

- `npm run check` passes **98 tests in 18 files**, types, formatting and frontend production build.
  Added semantic unit checks for receiving vs publishing vs pinning/executing, side-B metrics,
  shared-world source redaction, the wrong actor's counts and source moderation. Final formatting,
  type checking and build were also rerun after presentation/copy refinements.
- **Four browser flows passed across final runs**: anonymous guide/copy/FAQ/390px layout with
  zero coach API requests; clipboard-denied manual fallback plus clean share URL and a 1920×1080
  read-only overlay; existing mocked Twitch teach/prove/adopt/execute/moderate/disconnect with the
  new stage assertions; and two mocked communities sharing an actual pickup and a reminder-bearing
  rivalry overlay. Both fixture and rivalry overlays fit their checked desktop viewport heights;
  spectator mutation requests still reject with 401 and controls are absent.
- The first community run exposed duplicate “Rejected by coach” text, then passed after redundant
  source status text was clarified. Public guide/copy checks passed initially. The final overlay
  sizing check required one allowed retry after automatic approval review timed out before starting
  the command; the retry ran and both checks passed. No approval limitation remains.
- Inspected desktop/mobile guide and 1080p overlay captures. Recovered a transient in-app browser
  attachment timeout using a fresh tab in the same browser, then opened the live guide and saved
  `.local/screenshots/viewer-guide-live.png`. It remains open as the visible deliverable. All
  captures/logs are ignored. Existing real Twitch sessions/books/matches were not reset or modified;
  no real chat post, model call, credential change or backend restart was needed for this feature.
- Guide chunk is about 12KB minified/4KB gzip; main web bundle about 311KB/96KB gzip. Existing
  shared renderer chunk-size warning remains (about 916KB/243KB). No new package or external
  asset/provider was added; sustained OBS/compression/audience readability is still unmeasured.

**Boundaries and Codex contribution**

This provides a local viewer learning/share surface and owner-facing stage feedback, not public
per-viewer acknowledgements, bot replies, remote hosting, ranked balance evidence or the full
scenario/holdout suite. QR sharing awaits a usable hosted origin. Codex implemented the guide,
sharing/reminder components, source/metric-derived stage helper, accessibility/fallback handling,
regression checks and documentation/ADR 023. This entry is committed with that source increment.

## 2026-10-28 — Vercel project setup and saved Devpost story

**Completed**

- The owner authorized Vercel hosting and updating the Devpost project, then chose
  an all-Vercel redesign rather than a separate persistent game host. Recorded
  ADR 024 and the proposed gateway/daemon/private-store boundaries, fenced lease,
  idempotent commands and paused checkpoint recovery in `docs/vercel-deployment.md`.
  These are design requirements, not implemented production recovery.
- Created and inspected `samueldevke/chorusborn` with the official Vercel CLI
  65.5.0; verified project `prj_65W8NVdJhsZ6b75Jbrv3MPQHK8GT` and linked this
  checkout to team `team_AxU8HRLWOqoVOuWg7WqNfKle`. The connector's creation request
  returned 403; its documented CLI fallback succeeded. There is no ready app
  deployment or live URL yet. The connector did not subsequently resolve the
  CLI-created project, so the verified CLI target is the operational source.
- Discovered Marketplace storage products and requested Upstash Redis
  `chorusborn-state`, production only, `iad1`, Free plan, auto-upgrade/eviction/
  production-pack disabled. The CLI stopped with
  `integration_terms_acceptance_required`; no database or provider SDK was
  provisioned. Opened the terms flow in the in-app browser, which first requires
  Vercel sign-in, and asked the owner to complete it. No terms were accepted by
  Codex. The integration remains the concrete blocker to resource-backed work.
- Saved and verified the Devpost pitch, project story, ten technology tags and
  public GitHub link at `https://devpost.com/software/chorusborn`. Preserved the
  exact story in `docs/devpost-story.md` and corrected stale submission planning
  that still described the compiler/rivalry as unimplemented. The story describes
  observed local capabilities and explicitly leaves cloud recovery and audience
  validation pending. No demo video, eligibility statement, subjective survey
  response or unverified Codex session ID was invented. The entry is still a draft;
  no final hackathon submission was performed.

**Verification and operational notes**

- Confirmed the saved story and repository link in the public draft preview;
  captured `.local/screenshots/devpost-story-saved.png` (ignored). A transient
  browser navigation timeout recovered with a state read; the saved page is open.
- Inspected official current Vercel Daemon, Container and WebSocket documentation:
  daemon storage is ephemeral, daemons are beta/production-only, and reconnects can
  reach another function instance. Did not assume older WebSocket limitations or
  deploy process-local matches into independent gateways.
- An automatic approval timeout occurred before the direct CLI fallback started;
  the one allowed retry succeeded. A separate stalled npm invocation failed with
  incomplete-cache errors on a nearly full disk. Removed only that invocation's
  newly created temporary cache; recovered space to about 1.9 GB free. Used the
  already installed CLI afterward. No project data or unrelated cache was removed.
- Local project credentials, the CLI-generated environment file and `.vercel`
  metadata remain ignored. Removed only redundant CLI-added ignore patterns that
  would have overridden existing example-file exceptions. No application runtime,
  local Twitch session, book, queue or match was restarted or reset.
- This increment changes documentation only; reviewed Markdown links, Git diff
  and secret boundaries. Application tests were not repeated for documentation.
  Codex handled project setup, browser edits, source/claim checks and design.

**Remaining**

Await owner sign-in/Upstash terms acceptance, then provision and verify the store,
implement and test the distributed runtime, deploy and check production OAuth/
chat/rivalry/overlay, and only then add a verified live URL to Devpost. Do not
represent project creation or the saved story as successful application hosting.

## 2026-10-29 — Verified Vercel runtime candidate

The owner accepted the Upstash terms after the initial setup entry. Provisioning
succeeded: `chorusborn-state`, Free plan in iad1, connected to production only,
with automatic upgrades/eviction disabled. The owner separately and explicitly
approved copying the app's Twitch/Groq credentials and generating an encryption
key for production Vercel secrets. These were saved without displaying values.
The initial transfer was rejected by automatic approval review for lack of that
specific authorization; no transfer was performed until approval arrived.

Implemented the cloud gateway/daemon candidate, encrypted Redis protocol and
checkpoints, renewable/fenced authority, durable command receipts and expiring
bounded requests. A checkpoint and command response commit atomically behind the
lease check. Checkpoints include books, proposals/deduplication, OAuth pending and
session state, worlds/trials and rivalry. Recovery pauses matches, clears readiness,
marks interrupted compilation failed and revalidates Twitch sessions. Compiler
budget reservations persist before provider calls. Gateway streams authorize
coach cookies/overlay keys, redact spectator data and reconnect after transport
loss. Exact public-origin checks and Secure cookies support hosted OAuth. The
local loopback entrypoint remains available. Disposable cloud demos expire after
20 minutes without an HTTP interaction when admitting visitors; verified channel
books are retained and cloud admission is capped at 50.

**Verification:** `npm run check` passed 102 tests in 19 files, formatting, types
and the production frontend build. Added encryption tamper/purpose/namespace,
HTTPS/preview configuration, paused checkpoint and anonymous-expiry/verified-book
retention checks. Existing mocked Twitch teach/adopt/moderate/disconnect and
independent two-streamer rivalry browser regressions both passed with system
Chromium (3.3 minutes). The first browser attempt could not launch a missing
Playwright-managed Chromium; the installed executable fixed that environment issue.

Two explicit opt-in tests used the real provisioned Redis store under unique test
namespaces and temporary keys; neither used production state or real provider
credentials. The first passed independent gateways, spectator mutation denial,
proof/adoption, duplicate receipts, paused recovery and fenced stale writes. Its
initial run exposed a typo in the smoke test's adoption endpoint, corrected to the
actual API route. The second passed two mocked Twitch identities, independently
received/compiled/proved/adopted chat lessons, shared rivalry, authenticated Redis
WebSocket delivery and encrypted session/queue/book/match recovery with revalidation.
The mock event initially raced EventSub readiness; waiting for confirmed live state
fixed it. The stream test initially allowed only 1.5 seconds for network delivery;
it passed after using a 10-second bounded wait. These are fixture/provider checks,
not a claim of two real hosted communities or demonstrated large-audience capacity.

Added Docker/Vercel source exclusions and scanned intended Git files against local
app secrets/state key; no matches. Read the Marketplace-installed Upstash skills
and current Redis TCP/ioredis documentation. Pinned server-only ioredis 6.0.0 and
recorded its license. The container image, Vercel service/daemon configuration and
public domain still require remote build/runtime verification. The assigned domain
is `chorusborn.vercel.app`; hosted Twitch needs its exact callback registered.
Documentation records the runtime limits, periodic checkpoint gap and external
provider side-effect uncertainty. No application deployment or final submission
is claimed by this candidate commit. Codex implemented and verified the candidate.

## October 29, 2026 — production hosting and Twitch authorization

Deployed `535f669` to Vercel production at `https://chorusborn.vercel.app`.
The public readiness endpoint and guide responded successfully. In the in-app
browser, an authored sample passed proof/adoption, persisted as book v1, completed
a streamed 60-second round (1–0, 16 recorded lesson uses), and appeared in the
read-only overlay. This is sample evidence, not a claim of learned superiority.
After the owner registered the exact production callback, real Twitch OAuth
authenticated developersimiyu and EventSub reported live chat intake. No real
viewer message or model request was generated during this verification.

Saved the live URL, hosting narrative and verified Twitch connection to the
Devpost draft. The demo video, fresh hosted community demonstration and final
submission remain unfinished. Corrected hosted UI text that still described a
loopback-only server, and now checkpoint the running compilation attempt before
the provider call; injected test compilers exercise that same durable wrapper.

Validation: the isolated real-Redis two-community smoke check passed again after
the compiler refinement. Formatting and types passed. The latest full unit run
passed 100 tests but two strategy-control tests hit their 15-second timeout while
other integration/browser work ran concurrently; both passed unchanged when
rerun serially (2/2). The earlier complete 102-test run passed. The final frontend
build passed, with the existing large Three.js bundle warning. A production
error/fatal log query returned zero records for the observed 30-minute window.
Logs and browser screenshots are ignored local artifacts. Codex implemented,
reviewed, deployed and verified these changes; no final hackathon entry was sent.

Production follow-up: `7c2ca14` deployed READY and public readiness passed. Reloading
the hosted studio preserved developersimiyu authentication, live EventSub intake,
book v1 and the finished round/16 lesson uses. The Devpost preview visibly showed
the saved hosted connection narrative and separate live app link. Corrected the
remaining queue storage/budget labels to avoid implying cloud calls reset at a
server restart. A subsequent production error/fatal scan returned zero records.

## October 29, 2026 — repair GitHub browser-suite isolation

The owner flagged failed workflow checks. Inspected run
[40826021160](https://github.com/simiyu-samuel/chorusborn/actions/runs/40826021160):
`npm run check` passed (including all 102 unit tests and the production build),
but the full browser run passed 11/14 and failed mocked OAuth onboarding followed
by two studio-connection scenarios. Prior release verification covered selected
browser flows; a successful Vercel deployment did not establish successful CI.

The shared browser harness retained every previous test's studios, OAuth state
and sockets. Fresh browser contexts, development-mode initial requests and the
canonical-localhost OAuth visit accumulated sessions against the real 20-studio
local admission limit. Extracted the mock app factory and gave every test an
automatic test-scoped app fixture; Vite remains shared and the suite retains one
worker for its fixed callback/proxy ports. All existing browser assertions remain
in place. Added a regression that fills all 20 slots, verifies the next request is
429, then verifies a following scenario can connect with an empty playbook. Added
seven-day CI failure trace/screenshot artifacts using the official upload action.
No production capacity, authorization, retry count or timeout was relaxed.

Local validation: types, formatting and diff checks passed; both admission/isolation
regressions passed (16 seconds). All three previously failed browser scenarios
passed with system Chromium (2.2 minutes). An initial full-suite local reproduction
was deliberately interrupted after five passes while the graphics-heavy rivalry
scenario ran; it is not counted as a passing suite. The fix must also be verified
by the complete GitHub workflow before reporting CI success. Browser/provider
checks remain mock-based and do not touch real Twitch accounts or model keys.
Codex investigated the run logs, implemented the harness fix and regression checks,
and kept all generated evidence outside Git.

## October 29, 2026 — rivalry overlay fits its actual content

The full GitHub run for `a4df402`
([40830853614](https://github.com/simiyu-samuel/chorusborn/actions/runs/40830853614))
passed the 102 unit tests and all three originally failed browser scenarios. Its
browser result was 15/16: rivalry exposed a real vertical overflow with the
initiative strip and wrapped viewer attribution. Downloaded only the generated
mock CI screenshot/trace artifact. The overlay screenshot showed the lower third
extending beyond its viewport; the fixed arena-height subtraction did not account
for conditional content height.

Replaced that fixed subtraction with a viewport-height flex layout: the header,
guide, scoreboard, initiative and attribution retain their natural heights, and
the arena fills the remaining space. The rivalry flow now checks 1440×1000,
1280×720 and 1920×1080, retaining strict overflow/visible-content assertions.
Added deterministic presentation checks for WebGL and SVG compatibility using a
paused snapshot with an actual engine-generated taught-rule execution, so wrapped
attribution is always exercised. This is an explicitly mocked presentation check,
not a real viewer demonstration. A newly added live-flow attribution assertion was
too timing-dependent (credits expire after 40 ticks); the local rivalry attempt
caught that assertion, and the deterministic fixture now covers this condition
while the live flow checks its always-present lower third.

Local validation: formatting/types passed; both deterministic layout checks passed
at all three sizes (31 seconds) and require more than 200px of visible arena height.
The complete GitHub workflow remains the release check for all existing flows.
Codex traced the actual artifact, fixed layout sizing and strengthened coverage;
no original failing overflow assertion was removed or threshold relaxed.

## October 29, 2026 — individual Devpost answers and thumbnail

At the owner's request, filled and saved the three technical fields on Devpost:
verified main Codex session ID, technology requirement and Twitch user journey.
Verified the ID against two current runtime variables and the app's active thread
metadata; did not guess or include private session transcripts. Kept the identifier
out of public source documents. Existing Submitter Type was Individual, and the
public creator list contained only Simiyu Samuel. Rewrote the project story in
first-person singular and saved a solo creator/developer contribution describing
product/game design, implementation with Codex, Twitch, compiler/replays, graphics,
testing, CI and hosting. Preserved existing personal/survey/eligibility selections.

Generated original 1536×1024, 3:2 opaque promotional key art using the built-in image
generation tool. Verified title/tagline, dimensions and 2,230,593-byte PNG size;
copied the asset and exact prompt record into `docs/media`. Uploaded through the
visible Devpost thumbnail label/file chooser and verified its new hosted preview.
The first file-input attempt could not target the hidden input; the documented
visible-label flow succeeded. Reopened the saved form and public preview to verify
answers, singular story and persisted creator credit. Screenshots are ignored
local artifacts. Updated the public copy to the completed 102-unit/18-browser CI
evidence for the hosted `c080fd0` application revision.

No application source changed. Validation covers text consistency, local links,
PNG format/size, diff whitespace and visible persisted browser state. The final
terms checkbox and Submit project action were not used; the video and final entry
remain release work. Codex drafted, generated, uploaded and verified these materials
under the owner's direction.

## October 29, 2026 — solo demo voiceover and screen cue sheet

Prepared an eight-part, first-person voiceover and matching recording directions
for the owner to narrate and screen-record. The 329-word narration targets a 2:50
final cut (about 152–158 spoken seconds at 130–125 words/minute, before pauses).
The cue sheet maps each passage to exact controls and footage: hosted Twitch
connection, an actual `!teach` message, compiled proposal, an explicitly authored
carrier scenario with two replay branches, coach adoption, real execution credit,
independent two-channel readiness/shared overlay, and real Codex/code/CI evidence.
It uses the actual recorded result rather than prescribing a win, labels match
cuts and broadcaster-authored test messages, and avoids claiming universal tactic
superiority. The owner still needs to rehearse the live integration and coordinate
the second account before capturing those segments.

Saved `docs/demo-voiceover.txt` for clean narration/teleprompter use and
`docs/demo-recording-script.md` for capture/edit cues. Updated the submission plan
to use these artifacts. Verification checked narration/cue-sheet text equality,
word count, time ranges, local links, UI labels and whitespace. No application code
changed, no voice/audio/video was generated, and no recording, YouTube publication
or final submission is claimed. Codex drafted and cross-checked the script against
the implemented flow and known verification boundaries.

## Future entry template

For each completed milestone, record date, feature/acceptance IDs, commit reference, meaningful checks and outcomes, screenshots/replay/evaluation references where appropriate, remaining limitations, and how Codex contributed. Never include secrets or full private session transcripts. Store bulky recordings outside Git and link final authorized artifacts when available.
