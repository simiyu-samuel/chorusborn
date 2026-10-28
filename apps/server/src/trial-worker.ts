import { parentPort, workerData } from 'node:worker_threads';
import type { Candidate, Snapshot, LessonSource } from '@chorusborn/contracts';
import { addLesson, runBranch, snapshot, restore } from '@chorusborn/sim';

const { source, candidate, attribution, paired } = workerData as {
  source: Snapshot;
  candidate: Candidate;
  attribution?: { author: string; source: LessonSource };
  paired?: boolean;
};
const playbook = addLesson(source.state.champions[0].playbook, candidate, attribution);
let other;
if (paired) {
  const world = restore(source);
  world.contest.opening = world.contest.initiative = 'b';
  const opposite = snapshot(world);
  const { frames: _before, ...baseline } = runBranch(opposite);
  const { frames: _after, ...candidateBranch } = runBranch(opposite, playbook);
  other = { sourceHash: opposite.hash, baseline, candidateBranch };
}
parentPort!.postMessage({
  ...(other ? { paired: other } : {}),
  baseline: runBranch(source),
  candidateBranch: runBranch(source, playbook),
});
