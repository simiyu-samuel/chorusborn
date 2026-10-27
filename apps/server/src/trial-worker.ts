import { parentPort, workerData } from 'node:worker_threads';
import type { Candidate, Snapshot, LessonSource } from '@chorusborn/contracts';
import { addLesson, runBranch } from '@chorusborn/sim';

const { source, candidate, attribution } = workerData as {
  source: Snapshot;
  candidate: Candidate;
  attribution?: { author: string; source: LessonSource };
};
const playbook = addLesson(source.state.champions[0].playbook, candidate, attribution);
parentPort!.postMessage({
  baseline: runBranch(source),
  candidateBranch: runBranch(source, playbook),
});
