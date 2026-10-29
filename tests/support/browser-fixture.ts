import { test as base } from '@playwright/test';
import { createBrowserTestApp } from './browser-app.js';

// Browsers and Vite may be reused, but studios, OAuth sessions, chat sockets,
// compiler state and game clocks must not leak from one scenario to the next.
// Keep one Playwright worker: the callback/proxy intentionally use fixed port 3101.
export const test = base.extend<{ arena: void }>({
  arena: [
    async ({}, use) => {
      const app = await createBrowserTestApp();
      try {
        await app.listen({ host: '127.0.0.1', port: 3101 });
        await use();
      } finally {
        await app.close();
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
