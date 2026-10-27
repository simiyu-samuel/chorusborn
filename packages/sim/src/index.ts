import { createHash } from 'node:crypto';
import {
  candidateSchema,
  type ActorId,
  type Candidate,
  type Champion,
  type Condition,
  type Decision,
  type Intent,
  type Playbook,
  type Point,
  type Snapshot,
  type TrialBranch,
  type World,
} from '@chorusborn/contracts';

export const ENGINE_VERSION = 'core-run/0.1.0' as const;
export const TICKS_PER_SECOND = 20;
export const MATCH_TICKS = 60 * TICKS_PER_SECOND;
const HOME_A = { x: 2500, y: 9500 };
const HOME_B = { x: 29500, y: 9500 };
const CENTER = { x: 16500, y: 9500 };
const copy = <T>(value: T): T => structuredClone(value);
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const cell = (p: Point) => ({ x: Math.floor(p.x / 1000), y: Math.floor(p.y / 1000) });
const sameCell = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const position = (p: Point) => ({ x: p.x * 1000 + 500, y: p.y * 1000 + 500 });

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
export function hash(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

export function createPlaybook(): Playbook {
  return { version: 0, rules: [] };
}
export function addLesson(
  base: Playbook,
  input: Candidate,
  attribution?: { author: string; source?: import('@chorusborn/contracts').LessonSource },
): Playbook {
  const candidate = candidateSchema.parse(input);
  if (base.rules.length + candidate.rules.length > 24) throw new Error('Playbook limit reached.');
  const version = base.version + 1;
  return {
    version,
    rules: [
      ...candidate.rules.map((rule, i) => ({
        ...copy(rule),
        id: `local-${version}-${i}-${hash(rule).slice(0, 8)}`,
        author: attribution?.author ?? 'Local coach',
        ...(attribution?.source ? { source: copy(attribution.source) } : {}),
      })),
      ...copy(base.rules),
    ],
  };
}

export function createWorld(playbook = createPlaybook(), seed = 42): World {
  const offset = ((seed >>> 0) % 3) - 1;
  const walls: Point[] = [];
  for (const x of [10, 21]) for (const y of [3, 4, 5, 12, 13, 14]) walls.push({ x, y: y + offset });
  for (const x of [14, 15, 16, 17]) walls.push({ x, y: 4 + offset }, { x, y: 13 + offset });
  const makeChampion = (id: ActorId, name: string, home: Point, book: Playbook): Champion => ({
    ...home,
    id,
    name,
    health: 100,
    score: 0,
    home: copy(home),
    attackReadyAt: 0,
    shieldReadyAt: 0,
    shieldUntil: 0,
    decoyReadyAt: 0,
    respawnAt: 0,
    lastDamageAt: -100,
    intent: 'Ready',
    playbook: copy(book),
  });
  const a = makeChampion('a', 'Mica', HOME_A, playbook);
  const b = makeChampion('b', 'Rook', HOME_B, createPlaybook());
  // A declared fixture decision point, not footage from a live Twitch match.
  a.x = 16500;
  a.y = 9500;
  b.x = 26500;
  b.y = 10500;
  const metric = () => ({ damageTaken: 0, distance: 0, possessionTicks: 0, ruleUses: {} });
  return {
    engineVersion: ENGINE_VERSION,
    codecVersion: 1,
    seed: seed >>> 0,
    tick: 0,
    status: 'paused',
    winner: null,
    arena: {
      id: `carrier-dilemma-${seed >>> 0}`,
      width: 32,
      height: 18,
      walls,
      hazards: [7, 8, 9, 22, 23, 24].flatMap((x) => [8, 9].map((y) => ({ x, y }))),
    },
    champions: [a, b],
    core: { ...CENTER, carrier: 'a', unheldSince: 0 },
    decoys: [{ x: 20500, y: 7500, owner: 'b', expiresAt: 100 }],
    decisions: [],
    events: [],
    metrics: { a: metric(), b: metric() },
  };
}

export function snapshot(world: World): Snapshot {
  return { codecVersion: 1, hash: hash(world), state: copy(world) };
}
export function restore(input: Snapshot): World {
  if (
    input.codecVersion !== 1 ||
    input.state.codecVersion !== 1 ||
    input.state.engineVersion !== ENGINE_VERSION
  )
    throw new Error('Unsupported snapshot version.');
  if (hash(input.state) !== input.hash) throw new Error('Snapshot integrity check failed.');
  const world = input.state;
  // Validate complete controller state, including fields whose omission could change a replay.
  if (
    !Number.isInteger(world.seed) ||
    world.seed < 0 ||
    !Number.isInteger(world.tick) ||
    world.tick < 0 ||
    world.tick > MATCH_TICKS ||
    world.champions.length !== 2
  )
    throw new Error('Incomplete snapshot.');
  for (const actor of world.champions) {
    for (const field of [
      'x',
      'y',
      'health',
      'score',
      'attackReadyAt',
      'shieldReadyAt',
      'shieldUntil',
      'decoyReadyAt',
      'respawnAt',
      'lastDamageAt',
    ] as const) {
      if (!Number.isInteger(actor[field])) throw new Error(`Incomplete snapshot: ${field}.`);
    }
    if (
      !actor.playbook ||
      !Array.isArray(actor.playbook.rules) ||
      !world.metrics[actor.id] ||
      !actor.home
    )
      throw new Error('Incomplete controller state.');
  }
  return copy(world);
}

function facts(
  world: World,
  actor: Champion,
  enemy: Champion,
): Record<Condition['fact'], boolean | number> {
  return {
    'self.carryingCore': world.core.carrier === actor.id,
    'enemy.carryingCore': world.core.carrier === enemy.id,
    'self.healthBps': actor.health * 100,
    'enemy.distanceUnits':
      enemy.respawnAt > world.tick ? 50_000 : Math.min(50_000, distance(actor, enemy)),
    'core.available': world.core.carrier === null,
    'self.shieldReady': actor.shieldReadyAt <= world.tick,
    'self.decoyReady': actor.decoyReadyAt <= world.tick,
  };
}
function matches(condition: Condition, observed: ReturnType<typeof facts>): boolean {
  const actual = observed[condition.fact];
  if (condition.op === 'eq') return actual === condition.value;
  if (condition.op === 'neq') return actual !== condition.value;
  if (typeof actual !== 'number' || typeof condition.value !== 'number') return false;
  if (condition.op === 'lt') return actual < condition.value;
  if (condition.op === 'lte') return actual <= condition.value;
  if (condition.op === 'gt') return actual > condition.value;
  return actual >= condition.value;
}

function nextStep(world: World, actor: Point, target: Point, route: Intent['route']): Point | null {
  const start = cell(actor),
    goal = cell(target);
  if (sameCell(start, goal)) return null;
  const key = (p: Point) => p.y * world.arena.width + p.x;
  const blocked = new Set(world.arena.walls.map(key));
  const hazards = new Set(world.arena.hazards.map(key));
  const costs = new Map<number, number>([[key(start), 0]]);
  const parent = new Map<number, Point>();
  const open = [start];
  const risk = route === 'cautious' ? 12 : route === 'balanced' ? 3 : 0;
  while (open.length > 0) {
    open.sort((a, b) => {
      const ac = costs.get(key(a))! + Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
      const bc = costs.get(key(b))! + Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y);
      return ac - bc || key(a) - key(b);
    });
    const current = open.shift()!;
    if (sameCell(current, goal)) {
      let cursor = current;
      while (parent.has(key(cursor))) {
        const prior = parent.get(key(cursor))!;
        if (sameCell(prior, start)) return position(cursor);
        cursor = prior;
      }
      return null;
    }
    for (const [dx, dy] of [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ] as const) {
      const neighbor = { x: current.x + dx, y: current.y + dy };
      if (
        neighbor.x < 0 ||
        neighbor.y < 0 ||
        neighbor.x >= world.arena.width ||
        neighbor.y >= world.arena.height ||
        blocked.has(key(neighbor))
      )
        continue;
      const nextCost = costs.get(key(current))! + 1 + (hazards.has(key(neighbor)) ? risk : 0);
      if (nextCost < (costs.get(key(neighbor)) ?? Infinity)) {
        costs.set(key(neighbor), nextCost);
        parent.set(key(neighbor), current);
        if (!open.some((p) => sameCell(p, neighbor))) open.push(neighbor);
      }
    }
  }
  return null;
}

type Plan = { intent: Intent; target: Point; waypoint: Point | null; decision: Decision };
function plan(world: World, actor: Champion, enemy: Champion): Plan {
  const observed = facts(world, actor, enemy);
  const targetFor = (intent: Intent): Point | null => {
    if (intent.goal === 'return_home') return world.core.carrier === actor.id ? actor.home : null;
    if (intent.goal === 'collect_core') return world.core.carrier === null ? world.core : null;
    if (intent.goal === 'attack_enemy') return enemy.respawnAt <= world.tick ? enemy : null;
    if (intent.goal === 'retreat_home' || intent.goal === 'guard_home') return actor.home;
    return actor;
  };
  for (const rule of actor.playbook.rules) {
    if (!rule.when.all.every((condition) => matches(condition, observed))) continue;
    const target = targetFor(rule.intent);
    if (!target) continue;
    const waypoint = nextStep(world, actor, target, rule.intent.route);
    if (!sameCell(cell(actor), cell(target)) && !waypoint) continue;
    return {
      intent: rule.intent,
      target,
      waypoint,
      decision: {
        tick: world.tick,
        actorId: actor.id,
        ruleId: rule.id,
        label: rule.label,
        author: rule.author,
        goal: rule.intent.goal,
        executed: false,
        abilityExecuted: false,
      },
    };
  }
  const decoy = world.decoys.find(
    (item) => item.owner !== actor.id && distance(item, actor) <= 8000,
  );
  let intent: Intent = { goal: 'idle', route: 'direct', ability: 'none' };
  let target: Point = actor;
  let label = 'Hold position';
  // This novice baseline is fixed before trials; it deliberately values nearby distractions too highly.
  if (decoy) {
    target = decoy;
    label = 'Distracted by decoy';
    intent = { ...intent, goal: 'attack_enemy' };
  } else if (world.core.carrier === actor.id && distance(actor, enemy) > 5000) {
    target = actor.home;
    intent = { ...intent, goal: 'return_home' };
    label = 'Return the core';
  } else if (
    enemy.respawnAt <= world.tick &&
    (world.core.carrier === enemy.id || distance(actor, enemy) <= 5000)
  ) {
    target = enemy;
    intent = { ...intent, goal: 'attack_enemy' };
    label = 'Chase opponent';
  } else if (world.core.carrier === null) {
    target = world.core;
    intent = { ...intent, goal: 'collect_core' };
    label = 'Collect the core';
  } else {
    target = actor.home;
    intent = { ...intent, goal: 'guard_home' };
    label = 'Guard home';
  }
  return {
    intent,
    target,
    waypoint: nextStep(world, actor, target, intent.route),
    decision: {
      tick: world.tick,
      actorId: actor.id,
      ruleId: null,
      label,
      author: null,
      goal: intent.goal,
      executed: false,
      abilityExecuted: false,
    },
  };
}

export function step(input: World): World {
  if (input.status !== 'running') return copy(input);
  const world = copy(input);
  world.tick += 1;
  world.decoys = world.decoys.filter((item) => item.expiresAt > world.tick);
  for (const actor of world.champions) {
    if (actor.health === 0 && actor.respawnAt <= world.tick) {
      actor.health = 100;
      actor.x = actor.home.x;
      actor.y = actor.home.y;
      actor.intent = 'Respawned';
    }
  }
  const plans = world.champions.map((actor, index) =>
    world.tick % 4 === 0 && actor.health > 0
      ? plan(world, actor, world.champions[index === 0 ? 1 : 0])
      : null,
  );
  const event = (type: World['events'][number]['type'], actor: Champion, text: string) =>
    world.events.push({ tick: world.tick, type, actorId: actor.id, text });
  if (world.tick % 4 === 0) {
    const moves = plans.map((choice) => choice?.waypoint ?? null);
    for (const [i, actor] of world.champions.entries()) {
      const choice = plans[i];
      if (!choice) continue;
      actor.intent = choice.decision.label;
      if (choice.intent.ability === 'shield' && actor.shieldReadyAt <= world.tick) {
        actor.shieldUntil = world.tick + 30;
        actor.shieldReadyAt = world.tick + 100;
        choice.decision.abilityExecuted = true;
        event('shield', actor, `${actor.name} raised a shield`);
      }
      if (choice.intent.ability === 'decoy' && actor.decoyReadyAt <= world.tick) {
        world.decoys.push({ x: actor.x, y: actor.y, owner: actor.id, expiresAt: world.tick + 60 });
        actor.decoyReadyAt = world.tick + 160;
        choice.decision.abilityExecuted = true;
        event('decoy', actor, `${actor.name} placed a decoy`);
      }
      const move = moves[i];
      if (move) {
        world.metrics[actor.id].distance += distance(actor, move);
        actor.x = move.x;
        actor.y = move.y;
        choice.decision.executed = true;
      }
    }
  }
  const damage = [0, 0];
  for (const [i, actor] of world.champions.entries()) {
    const enemyIndex = i === 0 ? 1 : 0,
      enemy = world.champions[enemyIndex];
    if (actor.health <= 0) continue;
    if (enemy.health > 0 && distance(actor, enemy) <= 1000 && actor.attackReadyAt <= world.tick) {
      damage[enemyIndex]! += 20;
      actor.attackReadyAt = world.tick + 20;
      const choice = plans[i];
      if (choice && choice.intent.goal === 'attack_enemy' && world.tick % 4 === 0)
        choice.decision.executed = true;
    }
    const onHazard = world.arena.hazards.some((tile) => sameCell(tile, cell(actor)));
    if (onHazard && (world.tick + (world.seed % 120)) % 120 < 60 && world.tick % 10 === 0)
      damage[i]! += 10;
  }
  for (const [i, actor] of world.champions.entries()) {
    const taken = actor.shieldUntil > world.tick ? Math.floor(damage[i]! / 2) : damage[i]!;
    if (taken > 0) {
      actor.health = Math.max(0, actor.health - taken);
      actor.lastDamageAt = world.tick;
      world.metrics[actor.id].damageTaken += taken;
      if (actor.health === 0) {
        actor.respawnAt = world.tick + 40;
        actor.intent = 'Respawning';
        if (world.core.carrier === actor.id)
          world.core = { x: actor.x, y: actor.y, carrier: null, unheldSince: world.tick };
        event('defeat', actor, `${actor.name} was tagged out`);
      }
    }
  }
  if (world.core.carrier === null) {
    for (const actor of world.champions) {
      if (actor.health > 0 && distance(actor, world.core) <= 750) {
        world.core.carrier = actor.id;
        event('pickup', actor, `${actor.name} picked up the core`);
        break;
      }
    }
    if (world.core.carrier === null && world.tick - world.core.unheldSince >= 200)
      world.core = { ...CENTER, carrier: null, unheldSince: world.tick };
  }
  for (const actor of world.champions) {
    if (world.core.carrier === actor.id) {
      world.core.x = actor.x;
      world.core.y = actor.y;
      world.metrics[actor.id].possessionTicks += 1;
      if (actor.health > 0 && distance(actor, actor.home) <= 750) {
        actor.score += 1;
        event('capture', actor, `${actor.name} brought the core home`);
        world.core = { ...CENTER, carrier: null, unheldSince: world.tick };
        world.decoys = [];
        for (const unit of world.champions) {
          unit.x = unit.home.x;
          unit.y = unit.home.y;
          unit.health = 100;
          unit.respawnAt = 0;
          unit.attackReadyAt = world.tick;
          unit.shieldUntil = world.tick;
          unit.shieldReadyAt = world.tick;
          unit.decoyReadyAt = world.tick;
        }
        break;
      }
    }
    if (
      actor.health > 0 &&
      actor.health < 100 &&
      distance(actor, actor.home) <= 1000 &&
      world.tick - actor.lastDamageAt >= 40 &&
      world.tick % 20 === 0
    )
      actor.health = Math.min(100, actor.health + 5);
  }
  if (world.tick % 4 === 0)
    for (const choice of plans) {
      if (!choice) continue;
      const receipt = choice.decision;
      if (receipt.ruleId && (receipt.executed || receipt.abilityExecuted)) {
        const uses = world.metrics[receipt.actorId].ruleUses;
        uses[receipt.ruleId] = (uses[receipt.ruleId] ?? 0) + 1;
      }
      world.decisions.push(receipt);
    }
  world.decisions = world.decisions.slice(-40);
  world.events = world.events.slice(-40);
  if (world.tick >= MATCH_TICKS || world.champions.some((actor) => actor.score >= 3)) {
    world.status = 'finished';
    const [a, b] = world.champions;
    world.winner = a.score === b.score ? 'draw' : a.score > b.score ? 'a' : 'b';
  }
  return world;
}

export function runBranch(source: Snapshot, playbook?: Playbook): TrialBranch {
  let world = restore(source);
  if (playbook) world.champions[0].playbook = copy(playbook);
  world.status = 'running';
  const frames = [copy(world)];
  while (world.status === 'running') {
    world = step(world);
    if (world.tick % 10 === 0 || world.status === 'finished') frames.push(copy(world));
  }
  return {
    frames,
    finalHash: hash(world),
    score: world.champions[0].score,
    damage: world.metrics.a.damageTaken,
    distance: world.metrics.a.distance,
    ruleUses: Object.values(world.metrics.a.ruleUses).reduce((sum, value) => sum + value, 0),
  };
}
