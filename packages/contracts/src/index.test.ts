import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS, candidateSchema } from './index.js';

describe('bounded lesson contract', () => {
  it('accepts the documented example and authored samples', () => {
    const documented = JSON.parse(
      readFileSync(
        new URL('../../../docs/examples/lesson-candidate.json', import.meta.url),
        'utf8',
      ),
    );
    expect(candidateSchema.safeParse(documented).success).toBe(true);
    for (const sample of SAMPLE_LESSONS)
      expect(candidateSchema.safeParse(sample.candidate).success).toBe(true);
  });
  it('rejects ownership injection, executable goals, invented facts and wrong types', () => {
    const valid = SAMPLE_LESSONS[0]!.candidate;
    const mutations = [
      { ...valid, ownerId: 'forged' },
      {
        ...valid,
        rules: [
          { ...valid.rules[0], intent: { goal: 'execute_code', route: 'direct', ability: 'none' } },
        ],
      },
      {
        ...valid,
        rules: [
          { ...valid.rules[0], when: { all: [{ fact: 'self.apiKey', op: 'eq', value: true }] } },
        ],
      },
      {
        ...valid,
        rules: [
          {
            ...valid.rules[0],
            when: { all: [{ fact: 'self.healthBps', op: 'lt', value: '3500' }] },
          },
        ],
      },
      {
        ...valid,
        rules: [
          {
            ...valid.rules[0],
            when: { all: [{ fact: 'self.carryingCore', op: 'gt', value: true }] },
          },
        ],
      },
    ];
    for (const mutation of mutations)
      expect(candidateSchema.safeParse(mutation).success).toBe(false);
  });
  it('bounds candidate size and numeric facts', () => {
    const valid = SAMPLE_LESSONS[0]!.candidate;
    expect(
      candidateSchema.safeParse({
        ...valid,
        rules: Array.from({ length: 4 }, () => valid.rules[0]),
      }).success,
    ).toBe(false);
    expect(
      candidateSchema.safeParse({
        ...valid,
        rules: [
          {
            ...valid.rules[0],
            when: { all: [{ fact: 'self.healthBps', op: 'lt', value: 10001 }] },
          },
        ],
      }).success,
    ).toBe(false);
  });
});
