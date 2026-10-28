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
    { duplicateOf: undefined, uses: null },
    { duplicateOf: undefined, uses: 0 },
    { duplicateOf: 2, uses: 9 },
  ]);
  expect(JSON.stringify(third)).toBe(source);
  expect(inspectPlaybook(third, undefined).every((r) => r.uses === null)).toBe(true);
  const different = structuredClone(second);
  different.rules[0]!.intent.route = 'direct';
  expect(inspectPlaybook(different, different).every((r) => r.duplicateOf === undefined)).toBe(
    true,
  );
});
