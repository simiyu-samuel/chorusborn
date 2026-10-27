import { createApp } from './app.js';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { GroqCompiler } from './compiler.js';
import { readTwitchConfig, TwitchOAuth } from './twitch.js';

try {
  loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const app = await createApp({
  logger: true,
  compiler: process.env.GROQ_API_KEY?.trim()
    ? new GroqCompiler(process.env.GROQ_API_KEY.trim())
    : undefined,
  twitch: new TwitchOAuth(readTwitchConfig(process.env)),
});
await app.listen({ host: '127.0.0.1', port: 3001 });
console.log('Chorusborn fixture server: http://127.0.0.1:3001');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });
