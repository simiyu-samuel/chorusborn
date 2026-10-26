import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { readTwitchConfig, TwitchOAuth, type TwitchConfig } from './twitch.js';

const config: TwitchConfig = {
  clientId: 'test-client',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:3001/auth/twitch/callback',
  webOrigin: 'http://localhost:5173',
  channel: 'developersimiyu',
};
const identity = {
  client_id: config.clientId,
  user_id: '123456',
  login: config.channel,
  scopes: ['user:read:chat'],
  expires_in: 3600,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const tokens = { access_token: 'test-access', refresh_token: 'refresh +&=' };
function provider() {
  return vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith('/token')) return json(tokens);
    if (String(url).endsWith('/validate')) return json(identity);
    if (String(url).endsWith('/revoke')) return new Response(null, { status: 200 });
    throw new Error('Unexpected provider endpoint.');
  });
}
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
async function boot(fetcher = provider(), now?: () => number) {
  const oauth = new TwitchOAuth(config, { fetch: fetcher, now });
  const app = await createApp({ storePath: null, clock: false, twitch: oauth });
  cleanups.push(() => app.close());
  return { app, oauth, fetcher };
}
async function studio(app: Awaited<ReturnType<typeof createApp>>) {
  const response = await app.inject('/api/demo/state');
  return response.headers['set-cookie']!.toString().split(';')[0]!;
}
async function start(app: Awaited<ReturnType<typeof createApp>>, cookie: string) {
  const response = await app.inject({ url: '/auth/twitch/start', headers: { cookie } });
  expect(response.statusCode).toBe(302);
  return new URL(response.headers.location!).searchParams.get('state')!;
}
const callback = (state: string) => `/auth/twitch/callback?state=${state}&code=test-code`;
async function signedIn(oauth: TwitchOAuth) {
  const state = new URL(oauth.begin('owner')).searchParams.get('state')!;
  await oauth.complete(oauth.consume('owner', state)!, 'test-code');
}

describe('Twitch configuration and state', () => {
  it('keeps fixture mode credential-free and fails closed on partial or unsafe configuration', () => {
    expect(readTwitchConfig({})).toBeNull();
    expect(() => readTwitchConfig({ TWITCH_CLIENT_ID: 'id' })).toThrow();
    const env = { TWITCH_CLIENT_ID: 'id', TWITCH_CLIENT_SECRET: 'secret' };
    expect(readTwitchConfig(env)?.webOrigin).toBe('http://localhost:5173');
    expect(() => readTwitchConfig({ ...env, WEB_ORIGIN: 'https://other.example' })).toThrow();
    expect(() =>
      readTwitchConfig({
        ...env,
        TWITCH_REDIRECT_URI: 'http://localhost:3001/auth/twitch/callback/',
      }),
    ).toThrow();
  });
  it('binds unpredictable single-use state to its browser, expires it, and supersedes old attempts', () => {
    let time = 0;
    const oauth = new TwitchOAuth(config, { now: () => time });
    const firstUrl = new URL(oauth.begin('one'));
    expect(firstUrl.searchParams.get('scope')).toBe('user:read:chat');
    expect(firstUrl.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    const first = firstUrl.searchParams.get('state')!;
    expect(oauth.consume('two', first)).toBeNull();
    expect(oauth.consume('one', first)).not.toBeNull();
    expect(oauth.consume('one', first)).toBeNull();
    const expired = new URL(oauth.begin('one')).searchParams.get('state')!;
    time += 10 * 60_000;
    expect(oauth.consume('one', expired)).toBeNull();
    const stale = new URL(oauth.begin('one')).searchParams.get('state')!;
    const fresh = new URL(oauth.begin('one')).searchParams.get('state')!;
    expect(stale).not.toBe(fresh);
    expect(oauth.consume('one', stale)).toBeNull();
    expect(oauth.consume('one', fresh)).not.toBeNull();
  });
});

describe('Twitch OAuth HTTP flow', () => {
  it('exchanges server-side, validates identity, and exposes no bearer material', async () => {
    const { app, fetcher } = await boot();
    const initial = await app.inject('/api/demo/state');
    expect(initial.headers['set-cookie']).toContain('SameSite=Lax');
    const cookie = initial.headers['set-cookie']!.toString().split(';')[0]!;
    const state = await start(app, cookie);
    const response = await app.inject({ url: callback(state), headers: { cookie } });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(`${config.webOrigin}/?twitch=connected`);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json();
    expect(body.twitch.status).toBe('authenticated');
    expect(body.twitch.channel).toEqual({ id: identity.user_id, login: config.channel });
    expect(body.twitch.chat).toBe('not-connected');
    expect(JSON.stringify(body)).not.toMatch(/test-access|test-secret|refresh_token/);
    const request = fetcher.mock.calls[0]![1]!;
    const params = new URLSearchParams(request.body as URLSearchParams);
    expect(params.get('client_secret')).toBe(config.clientSecret);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('redirect_uri')).toBe(config.redirectUri);
    expect((await app.inject({ url: callback(state), headers: { cookie } })).statusCode).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects missing/cross-browser state and foreign-origin controls without calling Twitch', async () => {
    const { app, fetcher } = await boot();
    const one = await studio(app),
      two = await studio(app);
    const state = await start(app, one);
    expect((await app.inject(callback(state))).statusCode).toBe(400);
    expect((await app.inject({ url: callback(state), headers: { cookie: two } })).statusCode).toBe(
      400,
    );
    expect(
      (
        await app.inject({
          url: '/auth/twitch/start',
          headers: { cookie: one, 'sec-fetch-site': 'cross-site' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/twitch/disconnect',
          payload: {},
          headers: { cookie: one, origin: 'https://other.example' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ method: 'POST', url: '/api/twitch/disconnect', payload: {} })).statusCode,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (await app.inject({ url: callback(state), headers: { cookie: one } })).headers.location,
    ).toContain('twitch=connected');
    expect(
      (await app.inject({ url: '/api/demo/state', headers: { cookie: two } })).json().twitch
        .channel,
    ).toBeNull();
  });
  it('handles denial without exchange and consumes the state', async () => {
    const { app, fetcher } = await boot();
    const cookie = await studio(app),
      state = await start(app, cookie);
    const denial = await app.inject({
      url: `/auth/twitch/callback?state=${state}&error=access_denied`,
      headers: { cookie },
    });
    expect(denial.headers.location).toContain('twitch=denied');
    expect((await app.inject({ url: callback(state), headers: { cookie } })).statusCode).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    [{ client_id: 'another-client' }, 'failed'],
    [{ scopes: [] }, 'failed'],
    [{ user_id: null }, 'failed'],
    [{ login: 'another_channel' }, 'wrong-channel'],
  ])(
    'rejects invalid provider identity %j and revokes the unused token',
    async (override, result) => {
      const fetcher = provider();
      fetcher.mockImplementation(async (url) =>
        String(url).endsWith('/token')
          ? json(tokens)
          : String(url).endsWith('/validate')
            ? json({ ...identity, ...override })
            : new Response(null, { status: 200 }),
      );
      const { app } = await boot(fetcher),
        cookie = await studio(app),
        state = await start(app, cookie);
      const response = await app.inject({ url: callback(state), headers: { cookie } });
      expect(response.headers.location).toBe(`${config.webOrigin}/?twitch=${result}`);
      expect(fetcher.mock.calls.at(-1)![0]).toBe('https://id.twitch.tv/oauth2/revoke');
      expect(
        (await app.inject({ url: '/api/demo/state', headers: { cookie } })).json().twitch.channel,
      ).toBeNull();
    },
  );
  it('redacts provider errors and clears local authority even if revocation is unavailable', async () => {
    const { app, fetcher } = await boot();
    const cookie = await studio(app),
      state = await start(app, cookie);
    fetcher.mockRejectedValueOnce(new Error('secret-bearing provider failure'));
    const failed = await app.inject({ url: callback(state), headers: { cookie } });
    expect(failed.headers.location).toBe(`${config.webOrigin}/?twitch=failed`);
    expect(failed.body).not.toContain('secret-bearing');
    const retry = await start(app, cookie);
    await app.inject({ url: callback(retry), headers: { cookie } });
    fetcher.mockRejectedValueOnce(new Error('provider offline'));
    const disconnected = await app.inject({
      method: 'POST',
      url: '/api/twitch/disconnect',
      payload: {},
      headers: { cookie },
    });
    expect(disconnected.json().revoked).toBe(false);
    expect(disconnected.json().state.twitch.channel).toBeNull();
  });
});

describe('Twitch session lifecycle', () => {
  it('validates within the hour and serializes reactive refresh with encoded refresh credentials', async () => {
    let time = 0;
    const fetcher = provider(),
      oauth = new TwitchOAuth(config, { fetch: fetcher, now: () => time });
    await signedIn(oauth);
    fetcher.mockClear();
    time = 54 * 60_000;
    await oauth.validateDue('owner');
    expect(fetcher).not.toHaveBeenCalled();
    time = 56 * 60_000;
    fetcher
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ ...tokens, access_token: 'new-access' }))
      .mockResolvedValueOnce(json(identity));
    await Promise.all([oauth.validateDue('owner'), oauth.validateDue('owner')]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const params = new URLSearchParams(fetcher.mock.calls[1]![1]!.body as URLSearchParams);
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe(tokens.refresh_token);
    expect(oauth.publicState('owner').status).toBe('authenticated');
    await oauth.validateDue('owner');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('shows transient validation failure, recovers, and ends a revoked session', async () => {
    const fetcher = provider(),
      oauth = new TwitchOAuth(config, { fetch: fetcher });
    await signedIn(oauth);
    fetcher.mockRejectedValueOnce(new Error('network'));
    await oauth.validateDue('owner', true);
    expect(oauth.publicState('owner').status).toBe('validation-unavailable');
    await oauth.validateDue('owner', true);
    expect(oauth.publicState('owner').status).toBe('authenticated');
    fetcher.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 400));
    await oauth.validateDue('owner', true);
    expect(oauth.publicState('owner').status).toBe('reconnect-required');
    expect(oauth.publicState('owner').channel).toBeNull();
  });
  it('does not resurrect a session when disconnect races the code exchange', async () => {
    let finish!: (response: Response) => void;
    const fetcher = provider();
    fetcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const oauth = new TwitchOAuth(config, { fetch: fetcher });
    const state = new URL(oauth.begin('owner')).searchParams.get('state')!;
    const completion = oauth.complete(oauth.consume('owner', state)!, 'test-code');
    const assertion = expect(completion).rejects.toThrow('reconnect');
    await oauth.disconnect('owner');
    finish(json(tokens));
    await assertion;
    expect(oauth.publicState('owner').channel).toBeNull();
    expect(fetcher.mock.calls.at(-1)![0]).toBe('https://id.twitch.tv/oauth2/revoke');
  });
});
