import { describe, expect, test } from 'vitest';
import { randomBytes } from 'node:crypto';
import { Vault } from './crypto.js';
import { readCloudConfig } from './config.js';
import { createApp, type AppCheckpoint } from '../app.js';
import { readTwitchConfig } from '../twitch.js';

describe('cloud trust and recovery', () => {
  test('encrypted envelopes bind key, purpose and environment and reject tampering', () => {
    const key = randomBytes(32).toString('hex'),
      vault = new Vault(key, 'test:');
    const sealed = vault.seal({ refresh: 'private-token' }, 'checkpoint');
    expect(sealed).not.toContain('private-token');
    expect(vault.open(sealed, 'checkpoint')).toEqual({ refresh: 'private-token' });
    expect(() => vault.open(sealed, 'stream')).toThrow();
    expect(() => new Vault(key, 'other:').open(sealed, 'checkpoint')).toThrow();
    expect(() =>
      new Vault(randomBytes(32).toString('hex'), 'test:').open(sealed, 'checkpoint'),
    ).toThrow();
    const changed = Buffer.from(sealed, 'base64');
    changed[30] = changed[30]! ^ 1;
    expect(() => vault.open(changed.toString('base64'), 'checkpoint')).toThrow();
  });
  test('cloud config rejects preview access and implicit or insecure origins', () => {
    const valid = {
      REDIS_URL: 'rediss://redis.example:6379',
      CHORUSBORN_STATE_KEY: 'a'.repeat(64),
      PUBLIC_ORIGIN: 'https://arena.example',
    };
    expect(readCloudConfig(valid).origin).toBe('https://arena.example');
    expect(() => readCloudConfig({ ...valid, VERCEL_ENV: 'preview' })).toThrow();
    expect(() => readCloudConfig({ ...valid, PUBLIC_ORIGIN: 'http://arena.example' })).toThrow();
    expect(() =>
      readCloudConfig({ ...valid, PUBLIC_ORIGIN: 'https://arena.example/path' }),
    ).toThrow();
    expect(() => readCloudConfig({ ...valid, REDIS_URL: 'redis://redis.example' })).toThrow();
    expect(
      readTwitchConfig({
        TWITCH_CLIENT_ID: 'x',
        TWITCH_CLIENT_SECRET: 'y',
        WEB_ORIGIN: valid.PUBLIC_ORIGIN,
        TWITCH_REDIRECT_URI: `${valid.PUBLIC_ORIGIN}/auth/twitch/callback`,
      })?.webOrigin,
    ).toBe(valid.PUBLIC_ORIGIN);
    expect(() =>
      readTwitchConfig({
        TWITCH_CLIENT_ID: 'x',
        TWITCH_CLIENT_SECRET: 'y',
        WEB_ORIGIN: valid.PUBLIC_ORIGIN,
        TWITCH_REDIRECT_URI: 'https://attacker.example/auth/twitch/callback',
      }),
    ).toThrow();
  });
  test('recovery keeps identity and locked policy, pauses the saved arena, and enforces HTTPS origin/cookie', async () => {
    const origin = 'https://arena.example';
    const app = await createApp({ storePath: null, clock: false, publicOrigin: origin });
    const first = await app.inject({ url: '/api/demo/state', headers: { host: 'arena.example' } });
    expect(first.headers['set-cookie']).toContain('Secure');
    const cookie = String(first.headers['set-cookie']).split(';')[0]!;
    const checkpoint = (app as typeof app & { checkpoint(): AppCheckpoint }).checkpoint();
    checkpoint.arenas[0]!.world.status = 'running';
    checkpoint.arenas[0]!.world.tick = 17;
    checkpoint.arenas[0]!.world.metrics.a.possessionTicks = 12;
    await app.close();
    const restored = await createApp({
      storePath: null,
      clock: false,
      publicOrigin: origin,
      initialCheckpoint: checkpoint,
    });
    const headers = { host: 'arena.example', cookie };
    const state = (await restored.inject({ url: '/api/demo/state', headers })).json();
    expect(state.world.status).toBe('paused');
    expect(state.world.tick).toBe(17);
    expect(state.world.metrics.a.possessionTicks).toBe(12);
    expect(state.overlayPath).toBe(first.json().overlayPath);
    expect(
      (
        await restored.inject({
          url: '/api/demo/state',
          headers: { ...headers, origin: 'https://attacker.example' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await restored.inject({
          url: '/api/demo/state',
          headers: { ...headers, host: 'attacker.example' },
        })
      ).statusCode,
    ).toBe(403);
    await restored.close();
  });
  test('new cloud visitors expire stale anonymous demos while retaining verified channel books', async () => {
    const origin = 'https://arena.example';
    const first = await createApp({ storePath: null, clock: false, publicOrigin: origin });
    await first.inject({ url: '/api/demo/state', headers: { host: 'arena.example' } });
    await first.inject({ url: '/api/demo/state', headers: { host: 'arena.example' } });
    const saved = (first as typeof first & { checkpoint(): AppCheckpoint }).checkpoint();
    for (const arena of saved.arenas) arena.touchedAt = Date.now() - 21 * 60_000;
    saved.studios[1]!.channel = { id: '111', login: 'retained_streamer' };
    const retainedId = saved.studios[1]!.id,
      expiredId = saved.studios[0]!.id;
    await first.close();
    const restored = await createApp({
      storePath: null,
      clock: false,
      publicOrigin: origin,
      initialCheckpoint: saved,
    });
    await restored.inject({ url: '/api/demo/state', headers: { host: 'arena.example' } });
    const after = (restored as typeof restored & { checkpoint(): AppCheckpoint }).checkpoint();
    expect(after.studios).toHaveLength(2);
    expect(after.studios.some((s) => s.id === retainedId)).toBe(true);
    expect(after.studios.some((s) => s.id === expiredId)).toBe(false);
    await restored.close();
  });
});
