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
// The provider supplies only this envelope; identity and job metadata are server-owned.
export const compilerResultSchema = z
  .strictObject({
    outcome: z.enum(['candidate', 'needs_clarification', 'unsupported', 'refused']),
    explanation: z.string().min(1).max(400),
    candidate: candidateSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if ((value.outcome === 'candidate') !== (value.candidate !== null))
      ctx.addIssue({ code: 'custom', message: 'Only a candidate outcome may contain rules.' });
  });
export type CompilerResult = z.infer<typeof compilerResultSchema>;
export const compilationSchema = z.strictObject({
  id: z.string().uuid(),
  status: z.enum(['running', 'complete', 'failed']),
  baseVersion: z.number().int().nonnegative(),
  baseHash: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.string().min(1).max(100),
  promptHash: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.string().datetime(),
  result: compilerResultSchema.nullable(),
  error: z.string().max(240).nullable(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});
export type Compilation = z.infer<typeof compilationSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type LessonSource = {
  proposalId: string;
  channelId: string;
  authorId: string;
  compilationId: string;
};
export type Rule = z.infer<typeof ruleSchema> & {
  id: string;
  author: string;
  source?: LessonSource;
};
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
  sampleId: string | null;
  source?: LessonSource;
  author?: string;
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
export const chatStatusSchema = z.enum([
  'not-connected',
  'connecting',
  'live',
  'reconnecting',
  'revoked',
  'error',
]);
export type ChatStatus = z.infer<typeof chatStatusSchema>;
export const chatProposalSchema = z.strictObject({
  id: z.string().uuid(),
  channelId: z.string().regex(/^\d{1,32}$/),
  messageId: z.string().min(1).max(128),
  author: z
    .strictObject({
      id: z.string().regex(/^\d{1,32}$/),
      login: z.string().regex(/^[a-z0-9_]{1,25}$/),
      name: z.string().min(1).max(100),
    })
    .nullable(),
  text: z.string().max(560).nullable(),
  receivedAt: z.number().int().nonnegative(),
  status: z.enum(['awaiting-compiler', 'compiled', 'rejected', 'removed']),
  compilation: compilationSchema.nullable().default(null),
  compileAttempts: z.number().int().min(0).max(3).default(0),
});
export type ChatProposal = z.infer<typeof chatProposalSchema>;
export type ChatIntake = {
  status: ChatStatus;
  message: string;
  channelId: string | null;
  paused: boolean;
  gaps: number;
  proposals: ChatProposal[];
  lastOutcome:
    'queued' | 'duplicate' | 'paused' | 'cooldown' | 'full' | 'invalid' | 'moderated' | null;
};
export const intakeControlSchema = z.strictObject({ action: z.enum(['pause', 'resume', 'retry']) });
export const proposalControlSchema = z.strictObject({ action: z.literal('reject') });
export type TwitchConnection = {
  configured: boolean;
  status: 'disconnected' | 'authenticated' | 'reconnect-required' | 'validation-unavailable';
  channel: { id: string; login: string } | null;
  expectedChannel: string;
  connectUrl: string | null;
  chat: ChatStatus;
};
export type StudioState = {
  mode: 'local-fixture';
  connected: boolean;
  twitch: TwitchConnection;
  intake: ChatIntake;
  compiler: { configured: boolean; model: string | null; remainingCalls: number };
  world: World;
  playbook: Playbook;
  overlayPath: string;
  samples: SampleLesson[];
  latestTrial: Omit<Trial, 'baseline' | 'candidateBranch'> | null;
};
export const controlSchema = z.strictObject({ action: z.enum(['pause', 'resume', 'reset']) });
export const trialRequestSchema = z.union([
  z.strictObject({ sampleId: z.string().min(1).max(64) }),
  z.strictObject({ proposalId: z.string().uuid() }),
]);
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

export const CHAT_EVENT_TYPES = [
  'channel.chat.message',
  'channel.chat.message_delete',
  'channel.chat.clear_user_messages',
  'channel.chat.clear',
] as const;
export type ChatEventType = (typeof CHAT_EVENT_TYPES)[number];
const providerId = z.string().min(1).max(128);
const twitchUserId = z.string().regex(/^\d{1,32}$/);
export const eventSubMessageSchema = z.object({
  metadata: z.object({
    message_id: providerId,
    message_type: z.enum([
      'session_welcome',
      'session_keepalive',
      'session_reconnect',
      'notification',
      'revocation',
    ]),
    message_timestamp: z.string().max(64),
    subscription_type: z.string().max(80).optional(),
    subscription_version: z.string().max(8).optional(),
  }),
  payload: z.object({
    session: z
      .object({
        id: providerId,
        status: z.string().max(64),
        keepalive_timeout_seconds: z.number().int().min(10).max(600).nullable(),
        reconnect_url: z.string().max(2048).nullable(),
      })
      .optional(),
    subscription: z
      .object({
        id: providerId,
        type: z.enum(CHAT_EVENT_TYPES),
        version: z.literal('1'),
        status: z.string().max(64),
        condition: z.object({ broadcaster_user_id: twitchUserId, user_id: twitchUserId }),
        transport: z.object({ method: z.literal('websocket'), session_id: providerId }).optional(),
      })
      .optional(),
    event: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type EventSubMessage = z.infer<typeof eventSubMessageSchema>;
export const chatMessageEventSchema = z.object({
  broadcaster_user_id: twitchUserId,
  chatter_user_id: twitchUserId,
  chatter_user_login: z.string().regex(/^[a-z0-9_]{1,25}$/),
  chatter_user_name: z.string().min(1).max(100),
  message_id: providerId,
  message: z.object({ text: z.string().max(2000) }),
  source_broadcaster_user_id: twitchUserId.nullable().optional(),
});
export const chatRemovalEventSchema = z.object({
  broadcaster_user_id: twitchUserId,
  target_user_id: twitchUserId.optional(),
  message_id: providerId.optional(),
});
