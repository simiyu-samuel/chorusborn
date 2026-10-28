import { expect, it } from 'vitest';
import { SAMPLE_LESSONS, chatProposalSchema, type StudioState } from '@chorusborn/contracts';
import { addLesson, createPlaybook, createRivalWorld } from '@chorusborn/sim';
import { lessonProgress } from './lesson-progress.js';
const id = '11111111-1111-4111-8111-111111111111';
const proposal = () =>
  chatProposalSchema.parse({
    id,
    channelId: '1',
    messageId: 'message',
    author: { id: '2', login: 'viewer', name: 'Viewer' },
    text: 'A synthetic lesson.',
    receivedAt: 1,
    status: 'awaiting-compiler',
  });
const book = () =>
  addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate, {
    author: 'Viewer',
    source: {
      proposalId: id,
      channelId: '1',
      authorId: '2',
      compilationId: '22222222-2222-4222-8222-222222222222',
    },
  });
const makeState = (): Pick<
  StudioState,
  'world' | 'playbook' | 'selfActor' | 'latestTrial' | 'mode'
> => ({
  world: createRivalWorld([
    { name: 'one', playbook: createPlaybook() },
    { name: 'two', playbook: createPlaybook() },
  ]),
  playbook: createPlaybook(),
  selfActor: 'b',
  latestTrial: null,
  mode: 'rivalry',
});
it('does not equate receiving, publishing and execution', () => {
  const state = makeState(),
    p = proposal();
  expect(lessonProgress(state, p).label).toBe('Received · awaiting review');
  state.playbook = book();
  expect(lessonProgress(state, p).label).toBe('Adopted · next round');
  state.world.champions[1].playbook = structuredClone(state.playbook);
  expect(lessonProgress(state, p).label).toBe('Adopted · in this round');
  const rule = state.playbook.rules[0]!;
  state.world.metrics.a.ruleUses[rule.id] = 12;
  expect(lessonProgress(state, p).label).toBe('Adopted · in this round');
  state.world.metrics.b.ruleUses[rule.id] = 3;
  delete state.world.champions[1].playbook.rules[0]!.source;
  expect(lessonProgress(state, p)).toMatchObject({
    label: 'Used in this round',
    detail: expect.stringContaining('3 recorded executions'),
  });
});
it('gives moderation precedence and never infers execution from the next book alone', () => {
  const state = makeState(),
    p = proposal();
  state.playbook = book();
  state.world.metrics.b.ruleUses[state.playbook.rules[0]!.id] = 10;
  expect(lessonProgress(state, p).label).toBe('Adopted · next round');
  state.world.champions[1].playbook = structuredClone(state.playbook);
  p.status = 'removed';
  p.text = null;
  p.author = null;
  expect(lessonProgress(state, p).label).toBe('Source removed');
  p.status = 'rejected';
  expect(lessonProgress(state, p).label).toBe('Rejected by coach');
});
