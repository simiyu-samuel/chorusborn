# Teaching, policy, and replay specification

Status: design contract v1. The checked-in [JSON schema](examples/lesson-candidate.schema.json) and [example](examples/lesson-candidate.json) illustrate a supported candidate; runtime enforcement remains to be implemented.

## Meaning of learning

A lesson changes a persistent playbook: a bounded collection of condition-to-intent rules. Natural language is a convenient authoring interface; the engine executes validated data, not arbitrary generated code. We do not claim that model weights are trained or that the character can invent new mechanics.

## Candidate contract

Compiler result envelopes have one of four outcomes: `candidate`, `needs_clarification`, `unsupported`, or `refused`. A candidate contains `contractVersion`, `summary`, and one to three rules. The coordinator wraps it with trusted `proposalId`, channel/author provenance, base playbook version/hash, model/prompt versions, and job metadata. The model never supplies trusted ownership fields.

Each rule has:

- A short `label` for display.
- `when.all`: one to four typed conditions, interpreted as conjunction.
- `intent.goal`: `collect_core`, `return_home`, `attack_enemy`, `retreat_home`, `guard_home`, or `idle`.
- `intent.route`: `direct`, `balanced`, or `cautious`.
- `intent.ability`: `none`, `shield`, or `decoy`.

Initial facts:

| Fact | Type / domain |
| --- | --- |
| `self.carryingCore` | Boolean |
| `self.healthBps` | Integer 0–10,000 |
| `enemy.carryingCore` | Boolean |
| `enemy.distanceUnits` | Integer 0–50,000; explicit sentinel 50,000 when unavailable |
| `core.available` | Boolean |
| `self.shieldReady` | Boolean |
| `self.decoyReady` | Boolean |

Boolean conditions use `eq`/`neq`; numeric conditions use `eq`, `lt`, `lte`, `gt`, `gte`. The validator rejects type/operator mismatches even if a future schema evolution becomes less restrictive. No free-form field paths, executable expressions, URLs, regular expressions, or functions are allowed. Disjunction requires separate rules within the candidate limit; unsupported complexity asks for a simpler lesson.

## Interpretation and legality

Evaluate immutable rules on a decision tick in stable priority order. Uneditable engine legality constraints take precedence. Accepted learned rules precede the fixed baseline rules. A reviewed adoption explicitly selects insertion position among learned rules; the model cannot choose final priority. Rule IDs are assigned by the coordinator and never based on display labels.

The first matching **executable** rule emits one movement goal and one optional ability request. Readiness, valid targets, and feasible paths are checked without side effects. An unavailable ability is omitted while a legal goal proceeds. A goal that cannot execute is skipped with a recorded reason; the interpreter continues to the next rule and ultimately a safe baseline/idle action.

Examples: `return_home` requires carrying the core; `collect_core` requires an available unheld core; `attack_enemy` selects the real opponent, not a decoy. A decoy can distract the documented novice baseline. Rule evaluation and resulting ability execution are recorded separately: requesting an unavailable shield does not count as using a shield lesson.

Route modes use fixed integer path costs declared in the ruleset. Tie-break by path cost, path length, then cell ID. Predicted risk uses current observable world facts only; no hidden future opponent intent. A policy receives the same facts irrespective of who authored it.

Limits: 24 active learned rules per champion; 3 new rules per candidate; 4 conditions per rule; 280 characters of input lesson text; bounded candidate/output size; fixed evaluation budget. Exceeding a limit is a visible validation failure, not a partially adopted policy.

## Conflicts and revisions

Analyze overlapping condition regions across the finite Boolean and bounded numeric fact domains. Identical overlap with different goals is a potential conflict, not an automatic proof of a bad tactic. Present the competing rules and priority effects. Analyze unreachable goals and rules shadowed by higher-priority predicates.

For v1 the compiler proposes added rules only. During adoption, a coach may explicitly disable named superseded rules and choose insertion position in one reviewed patch. This avoids asking the model to silently rewrite existing tactics. If the base playbook changes during compilation/trial, mark the result stale; rebase and rerun before adoption.

Rollback creates a new version containing a prior rule set; never mutate a historical version. Matches keep their pinned version. Store parent version, source proposals, reviewed operations, evidence references, and actor ID.

## Exact branching contract

A replay snapshot includes engine/ruleset/arena version, logical tick, positions/velocities, health, possession, timers, cooldowns, path/controller state, PRNG state, world schedule, both playbooks and their hashes, and any queued external commands. Include an observation/state hash and a codec version.

For a trial:

1. Validate compatibility and that the snapshot's tested champion policy hash equals the candidate's base hash; restore the identical complete snapshot twice.
2. Baseline branch uses the pinned base playbook.
3. Candidate branch changes only the tested champion's playbook.
4. Keep the same opponent policy, exogenous schedule, and seed. The opponent **reacts** to each branch; do not freeze its historical actions and imply it is a live opponent.
5. Run the same tick budget and stop rules.
6. Persist branch state hashes, decision logs, metrics, and all version IDs.

Policy changes may alter interactions, so trajectories need not match between baseline and candidate. Determinism means repeating the **same branch** with identical versions/inputs reproduces its state hashes. If future mechanics draw random numbers, use stable event-indexed streams so action-count divergence does not shift unrelated hazards.

A historical snapshot with a different base policy is not silently relabeled as current evidence. Generate a compatible current-version scenario or mark the comparison historical and ineligible for adoption. A model/prompt diagnostic retry that changes candidate content also invalidates its previous trial evidence.

## Evidence and claims

Report captures, win/draw/loss, core possession time, damage taken, hazard exposure, distance traveled, relevant rule activations, and inapplicable/blocked rules. A failed candidate remains visible. Show scenario count and partition, not an unexplained "intelligence score".

Keep three evidence levels distinct:

- **Rule used:** the interpreter selected a rule and an associated goal or ability actually executed.
- **Illustrated difference:** the candidate and baseline diverged in a specified branch comparison.
- **Evaluation result:** aggregate outcome across the declared suite, with development and holdout shown separately.

None establishes universal superiority. Attribution is operational provenance, not a causal claim that a particular viewer won the match.

## Model evaluation contract

Compile fixtures cover supported phrasing, negation, ambiguous pronouns, unsupported new mechanics, conflicting advice, prompt injection, abusive text, and multilingual input. V1 presents an English interface and does not claim multilingual support until evaluated. The model must not silently weaken a lesson to force it into the grammar. Store concise supported interpretation, not hidden chain-of-thought.

Handle provider refusal, malformed/incomplete output, timeout, budget exhaustion, and schema failure explicitly. Retry transient errors within a bounded job attempt policy; never publish an unvalidated fallback. Freeze the model ID, prompt hash, schema version, and evaluation set for the release candidate.

## Illustrative lesson

Input: "When you have the core, ignore distractions and bring it home using a cautious route."

The [example candidate](examples/lesson-candidate.json) makes carrying the core select `return_home` with a cautious route. It does not claim arbitrary language understanding, and "ignore distractions" is realized by objective priority rather than by adding an unsupported mechanic.
