import { setTimeout as delay } from 'node:timers/promises';
import { readCloudConfig } from './config.js';
import { Bus } from './bus.js';
import { startAuthority } from './authority.js';
const bus = new Bus(readCloudConfig(process.env));
await bus.connect();
let authority: Awaited<ReturnType<typeof startAuthority>> | undefined;
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    closing = true;
    void (async () => {
      try {
        await authority?.stop();
      } finally {
        bus.close();
        process.exit(0);
      }
    })();
  });
// During a rollout the old daemon may still hold its lease. Wait rather than split matches.
while (!closing && !authority) {
  try {
    authority = await startAuthority(bus, process.env);
  } catch {
    console.error('Game authority not ready; waiting for lease or infrastructure.');
    await delay(5000);
  }
}
if (authority) {
  console.log('Chorusborn game authority ready.');
  try {
    await authority.done();
  } catch {
    console.error('Game authority stopped; no further commands accepted.');
    bus.close();
    process.exit(1);
  }
}
