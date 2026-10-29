// Optional manual harness. Playwright owns a fresh app per test through its fixture.
import { createBrowserTestApp } from './browser-app.js';

const app = await createBrowserTestApp();
await app.listen({ host: '127.0.0.1', port: 3101 });
console.log('Browser tests: isolated in-memory studios and MOCK Twitch provider.');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });
