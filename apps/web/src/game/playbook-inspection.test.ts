import { expect, it } from 'vitest';
import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import { addLesson, createPlaybook } from '@chorusborn/sim';
import { inspectPlaybook } from './playbook-inspection.js';

it('explains exact duplicates and uses only the pinned round execution counts', () => {
  const first = addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate);
  const second = addLesson(first, SAMPLE_LESSONS[0]!.candidate);
  const third = addLesson(second, SAMPLE_LESSONS[1]!.candidate);
  const source = JSON.stringify(third);
  expect(inspectPlaybook(third, second, { [first.rules[0]!.id]: 9 })).toEqual([
    { duplicateOf: undefined, shadowedBy: undefined, uses: null },
    { duplicateOf: undefined, shadowedBy: undefined, uses: 0 },
    { duplicateOf: 2, shadowedBy: 2, uses: 9 },
  ]);
  expect(JSON.stringify(third)).toBe(source);
  expect(inspectPlaybook(third, undefined).every((r) => r.uses === null)).toBe(true);
  const different = structuredClone(second);
  different.rules[0]!.intent.route = 'direct';
  expect(inspectPlaybook(different, different).every((r) => r.duplicateOf === undefined)).toBe(
    true,
  );
});

it('warns about a generic return rule blocking a narrower shield rule for the same goal', () => {
  const shield = addLesson(createPlaybook(), SAMPLE_LESSONS[2]!.candidate);
  shield.rules[0]!.when.all.push({ fact: 'self.shieldReady', op: 'eq', value: true });
  const book = addLesson(shield, SAMPLE_LESSONS[0]!.candidate);
  expect(inspectPlaybook(book, book)[1]).toMatchObject({ shadowedBy: 1, duplicateOf: undefined });
  book.rules.reverse();
  expect(inspectPlaybook(book, book).every((r) => r.shadowedBy === undefined)).toBe(true);
});
