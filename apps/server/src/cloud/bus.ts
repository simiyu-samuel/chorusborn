import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Vault } from './crypto.js';
import type { CloudConfig } from './config.js';
export type CloudRequest = {
  id: string;
  expires: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  payload?: string;
};
export type CloudResponse = {
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
};
export function redisClient(config: CloudConfig, commandTimeout = 5000) {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
  });
  // Never log the connection URL, credentials or raw protocol payloads.
  client.on('error', () => {});
  return client;
}
export const LEASE_MS = 15_000;
export class Bus {
  readonly redis: Redis;
  readonly vault: Vault;
  constructor(readonly config: CloudConfig) {
    this.redis = redisClient(config);
    this.vault = new Vault(config.key, config.namespace);
  }
  key(suffix: string) {
    return this.config.namespace + suffix;
  }
  async connect() {
    await this.redis.connect();
  }
  async acquire(token: string) {
    return (await this.redis.set(this.key('lease'), token, 'PX', LEASE_MS, 'NX')) === 'OK';
  }
  async renew(token: string) {
    return (
      Number(
        await this.redis.eval(
          `if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end
      redis.call('PEXPIRE',KEYS[1],ARGV[2]); return 1`,
          1,
          this.key('lease'),
          token,
          LEASE_MS,
        ),
      ) === 1
    );
  }
  async release(token: string) {
    await this.redis.eval(
      `if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`,
      1,
      this.key('lease'),
      token,
    );
  }
  async checkpoint<T>() {
    const value = await this.redis.get(this.key('checkpoint'));
    return value ? this.vault.open<T>(value, 'checkpoint') : undefined;
  }
  async save(token: string, checkpoint: unknown, response?: { id: string; value: CloudResponse }) {
    const sealed = this.vault.seal(checkpoint, 'checkpoint');
    const result = await this.redis.eval(
      `
      if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end
      redis.call('SET',KEYS[2],ARGV[2]);
      if ARGV[3] ~= '' then
        redis.call('SET',KEYS[3],ARGV[4],'EX',600);
        redis.call('SET',KEYS[4],'done','EX',600);
        redis.call('PUBLISH',KEYS[5],ARGV[3] .. ':' .. ARGV[4]);
      end
      return 1`,
      5,
      this.key('lease'),
      this.key('checkpoint'),
      this.key(`reply:${response?.id ?? '-'}`),
      this.key(`receipt:${response?.id ?? '-'}`),
      this.key('replies'),
      token,
      sealed,
      response?.id ?? '',
      response ? this.vault.seal(response.value, 'reply') : '',
    );
    if (Number(result) !== 1) throw new Error('Game authority lease lost.');
  }
  async claim(token: string, id: string) {
    return Number(
      await this.redis.eval(
        `
      if redis.call('GET',KEYS[1]) ~= ARGV[1] then return -1 end
      if redis.call('EXISTS',KEYS[2]) == 1 then return 0 end
      redis.call('SET',KEYS[2],'started','EX',600); return 1`,
        2,
        this.key('lease'),
        this.key(`receipt:${id}`),
        token,
      ),
    );
  }
  async publish(token: string, id: string, role: 'coach' | 'overlay', packet: unknown) {
    const result = await this.redis.eval(
      `if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end
      redis.call('PUBLISH',KEYS[2],ARGV[2]); return 1`,
      2,
      this.key('lease'),
      this.key(`stream:${id}:${role}`),
      token,
      this.vault.seal(packet, 'stream'),
    );
    if (Number(result) !== 1) throw new Error('Game authority lease lost.');
  }
  close() {
    this.redis.disconnect();
  }
}
/** One multiplexed reply subscription per gateway instance; no request affinity required. */
export class Rpc {
  private readonly subscriber: Redis;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: CloudResponse) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(readonly bus: Bus) {
    this.subscriber = redisClient(bus.config);
    this.subscriber.on('message', (_channel, value) => {
      const separator = value.indexOf(':');
      const id = value.slice(0, separator),
        item = this.pending.get(id);
      if (!item) return;
      try {
        item.resolve(bus.vault.open<CloudResponse>(value.slice(separator + 1), 'reply'));
      } catch {
        item.reject(new Error('Invalid game response.'));
      }
      clearTimeout(item.timer);
      this.pending.delete(id);
    });
  }
  async connect() {
    await this.subscriber.connect();
    await this.subscriber.subscribe(this.bus.key('replies'));
  }
  async request(
    input: Omit<CloudRequest, 'id' | 'expires'>,
    id = randomUUID(),
  ): Promise<CloudResponse> {
    if (this.pending.size >= 30) throw new Error('Gateway capacity reached.');
    const prior = await this.bus.redis.get(this.bus.key(`reply:${id}`));
    if (prior) return this.bus.vault.open<CloudResponse>(prior, 'reply');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Game authority timed out. Check the studio before repeating an action.'));
      }, 40000);
      this.pending.set(id, { resolve, reject, timer });
      const request: CloudRequest = { ...input, id, expires: Date.now() + 35000 };
      void this.bus.redis
        .eval(
          `
        if redis.call('EXISTS',KEYS[1]) == 0 then return -1 end
        if redis.call('LLEN',KEYS[2]) >= 100 then return 0 end
        redis.call('RPUSH',KEYS[2],ARGV[1]); redis.call('EXPIRE',KEYS[2],60); return 1`,
          2,
          this.bus.key('lease'),
          this.bus.key('requests'),
          this.bus.vault.seal(request, 'request'),
        )
        .then((result) => {
          if (Number(result) !== 1)
            throw new Error('The game authority is starting or busy. Retry shortly.');
        })
        .catch((error: Error) => {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error);
        });
    });
  }
  close() {
    this.subscriber.disconnect();
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error('Gateway closing.'));
    }
    this.pending.clear();
  }
}
