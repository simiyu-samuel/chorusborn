import { parentPort, workerData } from 'node:worker_threads';
import type { Candidate, Snapshot } from '@chorusborn/contracts';
import { addLesson, runBranch } from '@chorusborn/sim';

const { source, candidate } = workerData as { source: Snapshot; candidate: Candidate };
const playbook = addLesson(source.state.champions[0].playbook, candidate);
parentPort!.postMessage({
  baseline: runBranch(source),
  candidateBranch: runBranch(source, playbook),
});
