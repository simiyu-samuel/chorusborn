import { createApp } from './app.js';

const app = await createApp({ logger: true });
await app.listen({ host: '127.0.0.1', port: 3001 });
console.log('Chorusborn fixture server: http://127.0.0.1:3001');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });
