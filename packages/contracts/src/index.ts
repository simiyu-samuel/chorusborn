import { z } from 'zod';

const booleanCondition = z.strictObject({
  fact: z.enum([
    'self.carryingCore',
    'enemy.carryingCore',
    'core.available',
    'self.shieldReady',
    'self.decoyReady',
  ]),
  op: z.enum(['eq', 'neq']),
  value: z.boolean(),
});
const numericOperator = z.enum(['eq', 'lt', 'lte', 'gt', 'gte']);
export const conditionSchema = z.union([
  booleanCondition,
  z.strictObject({
    fact: z.literal('self.healthBps'),
    op: numericOperator,
    value: z.number().int().min(0).max(10_000),
  }),
  z.strictObject({
    fact: z.literal('enemy.distanceUnits'),
    op: numericOperator,
    value: z.number().int().min(0).max(50_000),
  }),
]);
export const intentSchema = z.strictObject({
  goal: z.enum([
    'collect_core',
    'return_home',
    'attack_enemy',
    'retreat_home',
    'guard_home',
    'idle',
  ]),
  route: z.enum(['direct', 'balanced', 'cautious']),
  ability: z.enum(['none', 'shield', 'decoy']),
});
export const ruleSchema = z.strictObject({
  label: z.string().min(1).max(64),
  when: z.strictObject({ all: z.array(conditionSchema).min(1).max(4) }),
  intent: intentSchema,
});
export const candidateSchema = z.strictObject({
  contractVersion: z.literal('1'),
  summary: z.string().min(1).max(240),
  rules: z.array(ruleSchema).min(1).max(3),
});
export type Candidate = z.infer<typeof candidateSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type Rule = z.infer<typeof ruleSchema> & { id: string; author: string };
export type Playbook = { version: number; rules: Rule[] };
export type ActorId = 'a' | 'b';
export type Point = { x: number; y: number };
export type Champion = Point & {
  id: ActorId;
  name: string;
  health: number;
  score: number;
  home: Point;
  attackReadyAt: number;
  shieldReadyAt: number;
  shieldUntil: number;
  decoyReadyAt: number;
  respawnAt: number;
  lastDamageAt: number;
  intent: string;
  playbook: Playbook;
};
export type Decision = {
  tick: number;
  actorId: ActorId;
  ruleId: string | null;
  label: string;
  author: string | null;
  goal: string;
  executed: boolean;
  abilityExecuted: boolean;
};
export type GameEvent = {
  tick: number;
  type: 'capture' | 'defeat' | 'pickup' | 'shield' | 'decoy';
  actorId: ActorId;
  text: string;
};
export type ActorMetrics = {
  damageTaken: number;
  distance: number;
  possessionTicks: number;
  ruleUses: Record<string, number>;
};
export type World = {
  engineVersion: 'core-run/0.1.0';
  codecVersion: 1;
  seed: number;
  tick: number;
  status: 'running' | 'paused' | 'finished';
  winner: ActorId | 'draw' | null;
  arena: { id: string; width: number; height: number; walls: Point[]; hazards: Point[] };
  champions: [Champion, Champion];
  core: Point & { carrier: ActorId | null; unheldSince: number };
  decoys: (Point & { owner: ActorId; expiresAt: number })[];
  decisions: Decision[];
  events: GameEvent[];
  metrics: Record<ActorId, ActorMetrics>;
};
export type Snapshot = { codecVersion: 1; hash: string; state: World };
export type SampleLesson = {
  id: string;
  title: string;
  text: string;
  category: string;
  candidate: Candidate;
};
export type TrialBranch = {
  frames: World[];
  finalHash: string;
  score: number;
  damage: number;
  distance: number;
  ruleUses: number;
};
export type Trial = {
  id: string;
  sampleId: string;
  baseVersion: number;
  candidate: Candidate;
  sourceHash: string;
  sourceTick: number;
  seed: number;
  baseline: TrialBranch;
  candidateBranch: TrialBranch;
  createdAt: string;
  adopted: boolean;
};
export type TwitchConnection = {
  configured: boolean;
  status: 'disconnected' | 'authenticated' | 'reconnect-required' | 'validation-unavailable';
  channel: { id: string; login: string } | null;
  expectedChannel: string;
  connectUrl: string | null;
  chat: 'not-connected';
};
export type StudioState = {
  mode: 'local-fixture';
  connected: false;
  twitch: TwitchConnection;
  world: World;
  playbook: Playbook;
  overlayPath: string;
  samples: SampleLesson[];
  latestTrial: Omit<Trial, 'baseline' | 'candidateBranch'> | null;
};
export const controlSchema = z.strictObject({ action: z.enum(['pause', 'resume', 'reset']) });
export const trialRequestSchema = z.strictObject({ sampleId: z.string().min(1).max(64) });
export const adoptRequestSchema = z.strictObject({
  trialId: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
});

export const SAMPLE_LESSONS: SampleLesson[] = [
  {
    id: 'core-discipline',
    title: 'Eyes on the objective',
    category: 'OBJECTIVE',
    text: 'When carrying the core, ignore distractions and take a cautious route home.',
    candidate: {
      contractVersion: '1',
      summary: 'Prioritize a cautious return home whenever carrying the core.',
      rules: [
        {
          label: 'Bring the core home',
          when: { all: [{ fact: 'self.carryingCore', op: 'eq', value: true }] },
          intent: { goal: 'return_home', route: 'cautious', ability: 'none' },
        },
      ],
    },
  },
  {
    id: 'live-to-return',
    title: 'Live to run another day',
    category: 'SURVIVAL',
    text: 'Retreat home when health drops below 35 percent.',
    candidate: {
      contractVersion: '1',
      summary: 'Retreat along a cautious route when health is below 35%.',
      rules: [
        {
          label: 'Recover before returning',
          when: { all: [{ fact: 'self.healthBps', op: 'lt', value: 3500 }] },
          intent: { goal: 'retreat_home', route: 'cautious', ability: 'none' },
        },
      ],
    },
  },
  {
    id: 'shield-the-core',
    title: 'Protect the delivery',
    category: 'DEFENSE',
    text: 'While carrying the core, head home and use the shield when it is ready.',
    candidate: {
      contractVersion: '1',
      summary: 'Return home and request a shield while carrying the core.',
      rules: [
        {
          label: 'Shield the delivery',
          when: { all: [{ fact: 'self.carryingCore', op: 'eq', value: true }] },
          intent: { goal: 'return_home', route: 'balanced', ability: 'shield' },
        },
      ],
    },
  },
];
