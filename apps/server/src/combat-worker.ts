import { parentPort } from 'node:worker_threads';
import { createCombatStudy } from '@chorusborn/sim';
parentPort!.postMessage(createCombatStudy());
