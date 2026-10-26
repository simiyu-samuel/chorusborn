import { randomBytes } from 'node:crypto';
import type { TwitchConnection } from '@chorusborn/contracts';

export type TwitchConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webOrigin: string;
  channel: string;
};
type Tokens = { access: string; refresh: string };
type Identity = { id: string; login: string; scopes: string[] };
type Session = { tokens: Tokens; identity: Identity; checkedAt: number; uncertain: boolean };
type Pending = { owner: string; expiresAt: number; revision: number };
type Dependencies = { fetch?: typeof fetch; now?: () => number };
export class TwitchFailure extends Error {
  constructor(public readonly reason: 'unavailable' | 'reconnect' | 'wrong-channel') {
    super(reason);
  }
}
const REQUIRED_SCOPE = 'user:read:chat';
const STATE_LIFETIME = 10 * 60_000;
const VALIDATION_INTERVAL = 55 * 60_000;
const transientFailure = () => new TwitchFailure('unavailable');
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw transientFailure();
  return value as Record<string, unknown>;
};
const boundedString = (value: unknown, max = 2048): string => {
  if (typeof value !== 'string' || !value.length || value.length > max) throw transientFailure();
  return value;
};

export function readTwitchConfig(env: NodeJS.ProcessEnv): TwitchConfig | null {
  const clientId = env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId && !clientSecret) return null;
  if (!clientId || !clientSecret) throw new Error('Set both Twitch client credentials in .env.');
  const redirectUri = env.TWITCH_REDIRECT_URI ?? 'http://localhost:3001/auth/twitch/callback';
  const webOrigin = env.WEB_ORIGIN ?? 'http://localhost:5173';
  const redirect = new URL(redirectUri);
  const web = new URL(webOrigin);
  // This milestone is local-only. Never silently use a host supplied by an incoming request.
  if (
    redirect.origin !== 'http://localhost:3001' ||
    redirect.pathname !== '/auth/twitch/callback' ||
    redirect.search ||
    redirect.hash ||
    redirect.username ||
    redirect.password ||
    !['http://localhost:5173', 'http://localhost:3001'].includes(web.origin) ||
    web.pathname !== '/' ||
    web.search ||
    web.hash ||
    web.username ||
    web.password
  )
    throw new Error('Use the documented localhost Twitch callback and studio origin.');
  const channel = (env.TWITCH_CHANNEL ?? 'developersimiyu').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(channel))
    throw new Error('TWITCH_CHANNEL must be a channel login.');
  return { clientId, clientSecret, redirectUri, webOrigin: web.origin, channel };
}

/** Local OAuth sessions are server-memory only: no bearer credentials enter the fixture JSON store. */
export class TwitchOAuth {
  private readonly sessions = new Map<string, Session>();
  private readonly pending = new Map<string, Pending>();
  private readonly revisions = new Map<string, number>();
  private readonly maintenance = new Map<string, Promise<void>>();
  private readonly notices = new Map<string, 'reconnect'>();
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private closed = false;
  constructor(
    readonly config: TwitchConfig | null,
    dependencies: Dependencies = {},
  ) {
    this.fetcher = dependencies.fetch ?? fetch;
    this.now = dependencies.now ?? Date.now;
  }
  publicState(owner: string): TwitchConnection {
    const session = this.sessions.get(owner);
    return {
      configured: Boolean(this.config),
      status: session
        ? session.uncertain
          ? 'validation-unavailable'
          : 'authenticated'
        : this.notices.has(owner)
          ? 'reconnect-required'
          : 'disconnected',
      channel: session ? { id: session.identity.id, login: session.identity.login } : null,
      expectedChannel: this.config?.channel ?? 'developersimiyu',
      connectUrl: this.config ? `${this.config.webOrigin}/?connect=twitch` : null,
      chat: 'not-connected',
    };
  }
  begin(owner: string) {
    if (!this.config || this.closed) throw transientFailure();
    for (const [key, value] of this.pending)
      if (value.owner === owner || value.expiresAt <= this.now()) this.pending.delete(key);
    if (this.pending.size >= 20) throw transientFailure();
    const revision = (this.revisions.get(owner) ?? 0) + 1;
    this.revisions.set(owner, revision);
    const state = randomBytes(32).toString('hex');
    this.pending.set(state, { owner, revision, expiresAt: this.now() + STATE_LIFETIME });
    const url = new URL('https://id.twitch.tv/oauth2/authorize');
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPE,
      state,
      force_verify: 'true',
    }).toString();
    return url.toString();
  }
  consume(owner: string, state: unknown): Pending | null {
    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) return null;
    const pending = this.pending.get(state);
    // A different browser must not be able to consume the initiating browser's state.
    if (!pending || pending.owner !== owner) return null;
    this.pending.delete(state);
    return pending.expiresAt > this.now() && this.current(pending) ? pending : null;
  }
  private current(pending: Pending) {
    return !this.closed && this.revisions.get(pending.owner) === pending.revision;
  }
  private async fetchResponse(url: string, init: RequestInit) {
    try {
      return await this.fetcher(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw transientFailure();
    }
  }
  private async json(response: Response) {
    try {
      return record(await response.json());
    } catch {
      throw transientFailure();
    }
  }
  private async token(params: Record<string, string>): Promise<Tokens> {
    const response = await this.fetchResponse('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config!.clientId,
        client_secret: this.config!.clientSecret,
        ...params,
      }),
    });
    if (!response.ok)
      throw new TwitchFailure([400, 401].includes(response.status) ? 'reconnect' : 'unavailable');
    const body = await this.json(response);
    return { access: boundedString(body.access_token), refresh: boundedString(body.refresh_token) };
  }
  private async identity(access: string): Promise<Identity> {
    const response = await this.fetchResponse('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${access}` },
    });
    if (response.status === 401) throw new TwitchFailure('reconnect');
    if (!response.ok) throw transientFailure();
    const data = await this.json(response);
    if (
      data.client_id !== this.config!.clientId ||
      !Array.isArray(data.scopes) ||
      !data.scopes.includes(REQUIRED_SCOPE) ||
      !data.scopes.every((scope) => typeof scope === 'string') ||
      typeof data.expires_in !== 'number' ||
      data.expires_in <= 0
    )
      throw new TwitchFailure('reconnect');
    const id = boundedString(data.user_id, 32);
    const login = boundedString(data.login, 25);
    if (!/^\d+$/.test(id) || !/^[a-z0-9_]+$/.test(login)) throw new TwitchFailure('reconnect');
    if (login !== this.config!.channel) throw new TwitchFailure('wrong-channel');
    return { id, login, scopes: data.scopes as string[] };
  }
  private async revoke(access: string) {
    if (!this.config) return false;
    try {
      const response = await this.fetchResponse('https://id.twitch.tv/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.config.clientId, token: access }),
      });
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }
  async complete(pending: Pending, code: string) {
    if (!this.config || !this.current(pending)) throw new TwitchFailure('reconnect');
    const tokens = await this.token({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });
    try {
      const identity = await this.identity(tokens.access);
      if (!this.current(pending)) throw new TwitchFailure('reconnect');
      this.sessions.set(pending.owner, {
        tokens,
        identity,
        checkedAt: this.now(),
        uncertain: false,
      });
      this.notices.delete(pending.owner);
    } catch (error) {
      await this.revoke(tokens.access);
      throw error;
    }
  }
  async validateDue(owner: string, force = false) {
    const existing = this.maintenance.get(owner);
    if (existing) return existing;
    const session = this.sessions.get(owner);
    if (!session || (!force && this.now() - session.checkedAt < VALIDATION_INTERVAL)) return;
    const operation = (async () => {
      let replacement: Tokens | undefined;
      try {
        let identity: Identity;
        try {
          identity = await this.identity(session.tokens.access);
        } catch (error) {
          if (!(error instanceof TwitchFailure) || error.reason !== 'reconnect') throw error;
          replacement = await this.token({
            grant_type: 'refresh_token',
            refresh_token: session.tokens.refresh,
          });
          identity = await this.identity(replacement.access);
        }
        if (identity.id !== session.identity.id) throw new TwitchFailure('reconnect');
        if (this.sessions.get(owner) !== session || this.closed) {
          if (replacement) await this.revoke(replacement.access);
          return;
        }
        if (replacement) session.tokens = replacement;
        session.identity = identity;
        session.checkedAt = this.now();
        session.uncertain = false;
      } catch (error) {
        if (replacement) await this.revoke(replacement.access);
        if (this.sessions.get(owner) !== session) return;
        if (error instanceof TwitchFailure && error.reason !== 'unavailable') {
          this.sessions.delete(owner);
          this.notices.set(owner, 'reconnect');
        } else {
          session.uncertain = true;
          // Retry transient validation failures soon, without flooding Twitch.
          session.checkedAt = this.now() - VALIDATION_INTERVAL + 60_000;
        }
      }
    })();
    this.maintenance.set(owner, operation);
    try {
      await operation;
    } finally {
      this.maintenance.delete(owner);
    }
  }
  owners() {
    return [...this.sessions.keys()];
  }
  async disconnect(owner: string) {
    this.revisions.set(owner, (this.revisions.get(owner) ?? 0) + 1);
    for (const [state, pending] of this.pending)
      if (pending.owner === owner) this.pending.delete(state);
    const session = this.sessions.get(owner);
    this.sessions.delete(owner);
    this.notices.delete(owner);
    // Clear local authority first; provider availability cannot keep a local session alive.
    return { revoked: session ? await this.revoke(session.tokens.access) : true };
  }
  close() {
    this.closed = true;
    this.sessions.clear();
    this.pending.clear();
  }
}
