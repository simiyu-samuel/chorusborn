import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_LESSONS, type Compilation, type StudioState } from '@chorusborn/contracts';
import { createApp } from './app.js';
import { TwitchOAuth } from './twitch.js';
import { ChatStore } from './chat-store.js';
import { PROMPT_HASH, type CompileOutput } from './compiler.js';
import {
  MockEventSocket,
  chatNotification,
  subscriptionResponse,
} from '../../../tests/support/twitch-fixtures.js';
const output: CompileOutput = {
  result: {
    outcome: 'candidate',
    explanation: 'Supported rule.',
    candidate: SAMPLE_LESSONS[0]!.candidate,
  },
  inputTokens: 10,
  outputTokens: 20,
};
const closes: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of closes.splice(0).reverse()) await close();
});
async function boot(compile = vi.fn(async () => structuredClone(output))) {
  const directory = await mkdtemp(join(tmpdir(), 'chorusborn-teaching-'));
  closes.push(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'chat.json');
  const queue = new ChatStore(path);
  await queue.receive('123456', chatNotification());
  const proposal = queue.view('123456').proposals[0]!;
  const oauth = new TwitchOAuth(
    {
      clientId: 'test',
      clientSecret: 'private',
      redirectUri: 'http://localhost:3001/auth/twitch/callback',
      webOrigin: 'http://localhost:5173',
      channel: 'developersimiyu',
    },
    {
      fetch: async (url, init) => {
        if (String(url).endsWith('/token'))
          return Response.json({ access_token: 'test', refresh_token: 'refresh' });
        if (String(url).endsWith('/validate'))
          return Response.json({
            client_id: 'test',
            user_id: '123456',
            login: 'developersimiyu',
            scopes: ['user:read:chat'],
            expires_in: 3600,
          });
        if (String(url).endsWith('/revoke')) return new Response(null, { status: 200 });
        if (String(url).endsWith('/subscriptions')) return subscriptionResponse(String(init?.body));
        throw new Error('Unexpected endpoint');
      },
    },
  );
  const app = await createApp({
    storePath: null,
    chatStorePath: path,
    clock: false,
    twitch: oauth,
    compiler: { model: 'fixture/compiler', remainingCalls: 20, compile },
    socketFactory: (url) => new MockEventSocket(url),
  });
  closes.push(() => app.close());
  const initial = await app.inject('/api/demo/state');
  const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
  const begin = await app.inject({ url: '/auth/twitch/start', headers: { cookie } });
  const state = new URL(begin.headers.location!).searchParams.get('state');
  await app.inject({ url: `/auth/twitch/callback?state=${state}&code=test`, headers: { cookie } });
  const post = (url: string, payload: Record<string, unknown> = {}) =>
    app.inject({ method: 'POST', url, headers: { cookie }, payload });
  const get = async () =>
    (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json<StudioState>();
  return { app, post, get, compile, proposal, oauth };
}
describe('community teach → prove → adopt', () => {
  it('binds compiled evidence to the source and base policy, credits the viewer and keeps rounds pinned', async () => {
    const { app, post, get, proposal, compile } = await boot();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/twitch/proposals/${proposal.id}/compile`,
          payload: {},
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (await post(`/api/twitch/proposals/${proposal.id}/compile`, { author: 'fake' })).statusCode,
    ).toBe(422);
    expect((await post(`/api/twitch/proposals/${randomUUID()}/compile`)).statusCode).toBe(404);
    expect((await post(`/api/twitch/proposals/${proposal.id}/compile`)).statusCode).toBe(200);
    await post(`/api/twitch/proposals/${proposal.id}/compile`);
    expect(compile).toHaveBeenCalledTimes(1);
    const trial = (await post('/api/demo/trials', { proposalId: proposal.id })).json();
    expect(trial.author).toBe('Viewer One');
    expect(trial.source.authorId).toBe('789');
    expect(trial.candidateBranch.frames[0].champions[0].playbook.rules[0].author).toBe(
      'Viewer One',
    );
    const adopted = await post('/api/demo/adoptions', { trialId: trial.id, expectedVersion: 0 });
    expect(adopted.statusCode, adopted.body).toBe(200);
    const state = await get();
    expect(state.playbook.rules[0]!.source?.proposalId).toBe(proposal.id);
    expect(state.playbook.rules[0]!.author).toBe('Viewer One');
    expect((await post(`/api/twitch/proposals/${proposal.id}/compile`)).statusCode).toBe(409);
    expect(state.world.champions[0].playbook.version).toBe(0);
    await post('/api/demo/controls', { action: 'reset' });
    const overlay = (
      await app.inject(state.overlayPath.replace('/overlay?', '/api/demo/overlay?'))
    ).json();
    expect(overlay.world.champions[0].playbook.rules[0].author).toBe('Viewer One');
    expect(overlay.world.champions[0].playbook.rules[0].source).toBeUndefined();
    expect(overlay.intake).toBeUndefined();
    expect((await post('/api/demo/trials', { proposalId: proposal.id })).statusCode).toBe(422);
    expect(
      (await post('/api/demo/adoptions', { trialId: trial.id, expectedVersion: 1 })).statusCode,
    ).toBe(409);
  });
  it('rejects a source after proving and prevents adoption or model resurrection', async () => {
    const { post, get, proposal } = await boot();
    await post(`/api/twitch/proposals/${proposal.id}/compile`);
    const trial = (await post('/api/demo/trials', { proposalId: proposal.id })).json();
    await post(`/api/twitch/proposals/${proposal.id}`, { action: 'reject' });
    expect(
      (await post('/api/demo/adoptions', { trialId: trial.id, expectedVersion: 0 })).statusCode,
    ).toBe(409);
    expect((await post(`/api/twitch/proposals/${proposal.id}/compile`)).statusCode).toBe(404);
    expect((await get()).intake.proposals[0]!.compilation).toBeNull();
  });
  it('deduplicates in-flight jobs and discards a result when the source is rejected mid-call', async () => {
    let finish!: (value: CompileOutput) => void;
    const promise = new Promise<CompileOutput>((resolve) => {
      finish = resolve;
    });
    const compile = vi.fn(async () => promise);
    const { post, get, proposal } = await boot(compile);
    const first = post(`/api/twitch/proposals/${proposal.id}/compile`).then((r) => r);
    await vi.waitFor(() => expect(compile).toHaveBeenCalledTimes(1));
    expect((await post(`/api/twitch/proposals/${proposal.id}/compile`)).statusCode).toBe(409);
    await post(`/api/twitch/proposals/${proposal.id}`, { action: 'reject' });
    finish(output);
    await first;
    expect((await get()).intake.proposals[0]!.compilation).toBeNull();
  });
  it('invalidates a completed trial on disconnect and suppresses an in-flight result after authority loss', async () => {
    let finish!: (value: CompileOutput) => void;
    const compile = vi.fn(
      async () =>
        new Promise<CompileOutput>((resolve) => {
          finish = resolve;
        }),
    );
    const { post, get, proposal } = await boot(compile);
    const pending = post(`/api/twitch/proposals/${proposal.id}/compile`).then((r) => r);
    await vi.waitFor(() => expect(compile).toHaveBeenCalled());
    await post('/api/twitch/disconnect');
    finish(output);
    await pending;
    expect((await get()).intake.proposals).toEqual([]);
    expect((await post('/api/demo/trials', { proposalId: proposal.id })).statusCode).toBe(422);
  });
  it('keeps failed calls explicit and enforces a durable three-attempt limit', async () => {
    const { post, get, proposal, compile } = await boot(
      vi.fn(async () => {
        throw new Error('private provider detail');
      }),
    );
    for (let i = 0; i < 3; i++) await post(`/api/twitch/proposals/${proposal.id}/compile`);
    expect((await post(`/api/twitch/proposals/${proposal.id}/compile`)).statusCode).toBe(409);
    expect(compile).toHaveBeenCalledTimes(3);
    const compilation = (await get()).intake.proposals[0]!.compilation!;
    expect(compilation.status).toBe('failed');
    expect(compilation.error).not.toContain('private provider detail');
  });
});

describe('durable compiler source lifecycle', () => {
  it('recovers interrupted work and erases generated results on Twitch moderation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chorusborn-jobs-'));
    closes.push(() => rm(directory, { recursive: true, force: true }));
    const path = join(directory, 'chat.json'),
      store = new ChatStore(path);
    await store.receive('123456', chatNotification());
    const p = store.view('123456').proposals[0]!;
    const job: Compilation = {
      id: randomUUID(),
      status: 'running',
      baseVersion: 0,
      baseHash: 'a'.repeat(64),
      model: 'fixture/compiler',
      promptHash: PROMPT_HASH,
      createdAt: new Date().toISOString(),
      result: null,
      error: null,
      inputTokens: 0,
      outputTokens: 0,
    };
    expect(await store.beginCompile('123456', p.id, job)).toBe(true);
    const restored = new ChatStore(path);
    await restored.load();
    expect(restored.view('123456').proposals[0]!.compilation?.status).toBe('failed');
    await store.receive(
      '123456',
      chatNotification('channel.chat.message_delete', { message_id: p.messageId }),
    );
    expect(
      await store.finishCompile('123456', p.id, { ...job, status: 'complete', ...output }),
    ).toBe(false);
    expect(store.view('123456').proposals[0]).toMatchObject({
      status: 'removed',
      text: null,
      author: null,
      compilation: null,
    });
  });
});
