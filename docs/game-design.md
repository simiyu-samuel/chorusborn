# Arena game design

Status: an initial fixture implementation exists, with no independent audience playtest yet. Current movement is one integer grid cell per four ticks (5 cells/second). Timed hazard tiles deal 10 damage every 10 ticks during their active phase. Three seeded wall-offset variants support the opening carrier-dilemma fixture; three distinct authored layouts and the 12-scenario evaluation suite remain planned. Other values below describe the intended ruleset and must be reconciled with code/evidence before release.

## Core sport: Core Run

Two champions contest a neutral relay core and return it to their home gate. A match ends at three captures or 60 seconds. At the time limit, higher captures wins; equal captures is a draw. Tournament tiebreaks can use another separately recorded round; do not invent invisible score tie-breakers.

The streamer coaches rather than directly steering during a scored match. Training mode can pause, inspect, and branch states. In scored matches, playbooks are locked at start and pause is recorded. Both communities agree to a challenge before starting; one cannot start or alter the other's champion.

## Deterministic world

- Arena: 32 × 18 cells; coordinates use integer subunits (1 cell = 1,000 units).
- Simulation: 20 ticks/second; tactical policy decisions every 4 ticks (5 Hz).
- Presentation: 10 snapshots/second initially, interpolated for display.
- Movement: integer speed and collision, grid-based path planning, stable tie-breaking. Renderer animations do not feed simulation.
- World state includes tick, entities, cooldowns, core ownership, hazard phase, policy versions, and all random state.
- Arena variants and hazard schedules are generated from a recorded seed before the match. Environmental randomness uses tick/entity-indexed draws so a branch's extra action does not shift unrelated random events.

These are design defaults. Tune with measurements; record changes as a new engine/ruleset version so old replays retain their meaning.

## Initial entity mechanics

| Mechanic | Initial rule |
| --- | --- |
| Core | One neutral core; pickup within 750 units if not carrying; nearest surviving claimant wins, equal claims stay contested; automatically score within 750 units of own gate |
| Champion health | 100 maximum; observations expose health in integer basis points (0–10,000) |
| Tag attack | Nearest legal enemy within 1,000 units; 20 damage; 20-tick cooldown |
| Shield | 30 ticks of half incoming damage, rounded down; 100-tick cooldown |
| Decoy | A clearly identifiable target entity lasting 60 ticks; 160-tick cooldown; cannot carry or score |
| Defeat | Drop core on the nearest legal cell; respawn at own gate after 40 ticks at full health |
| Healing zone | Home zone heals 5 health per second, beginning after 40 ticks without damage |
| Hazards | Authored timed tiles; fixed damage and timing per ruleset; all cues visible |
| Core reset | After a capture, reset champions and core; after 200 unheld ticks, return core to center |

No hidden team stat differences. Exact movement speed, obstacle geometry, and hazard damage are to be tuned in M1; pin them in the ruleset fixture before evaluating policies.

## Tick resolution order

1. Apply scheduled lifecycle events, cooldown expiry, and permitted pause commands.
2. Construct each actor's observation from the same pre-action state.
3. On decision ticks, evaluate all champion policies without mutating the shared state.
4. Apply legal abilities and movement simultaneously. Path tie breaks use home-relative horizontal cell order, so a horizontally mirrored scenario mirrors the route.
5. Collect tag/hazard damage and apply it simultaneously, then resolve defeats and core drops.
6. Resolve surviving actors' pickups and captures. The nearest eligible claimant takes an unheld core; equal-distance claims stay contested with no pickup. A defeated actor cannot pick up or score on that tick.
7. Resolve resets, health regeneration, timer/end conditions, then emit state and decision records.

Engine `core-run/0.3.0` removes stable-ID pickup priority. When the core sits between grid cells, routes target any legal cell center within pickup range instead of flooring toward one side. Side-swapped simulation checks compare full trajectories and metrics for the tested symmetric layouts/books; they do not establish overall balance or replace the planned holdout suite. Equal policies in an exactly symmetric contest can draw. No hidden random winner breaks a tie.

## Strategy space

Lessons can change priorities and movement styles: retrieve the objective, return home, avoid costly hazards, retreat when weak, pressure an opponent, guard a gate, or use shield/decoy under supported conditions. Route choices trade distance against visible risk; "cautious" means a defined path-cost function, not a guarantee of perfect safety.

The novice baseline pursues nearby threats too eagerly and sometimes takes risky shortcuts. It is a documented, fixed baseline, not an opponent secretly weakened after a viewer's lesson. Champions can learn from real failures, including tactics that do not help. The UI must allow negative and inconclusive trials.

## Scenario suite

Create 12 versioned scenarios from the three layouts and mirrored variants. Six are visible development scenarios. Six are fixed holdout scenarios, identified before lesson tuning and not used to optimize that same candidate. Record opponent versions, starting states, seeds, sides, ordering, and limits. A displayed aggregate includes the full designated set, not only favorable runs.

The headline demo may use a saved real failure as an illustration. Label that illustration separately from suite evidence. Repeated tuning against a holdout invalidates its held-out label; create a new untouched partition before making that claim again.

## Spectator readability

Distinct silhouettes and labeled home gates; a bright core with possession trail; visible shield and decoy states; short intent badges such as "Returning core". Show at most one contribution credit at a time, with an inspectable full ledger. Never flood the arena with model explanations or debugging text.
