import {
  eventSubMessageSchema,
  type ChatEventType,
  type ChatStatus,
  type EventSubMessage,
} from '@chorusborn/contracts';
import { TwitchFailure } from './twitch.js';

export type EventSocket = {
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: (() => void) | null;
  close(): void;
};
export type SocketFactory = (url: string) => EventSocket;
function nodeSocket(url: string): EventSocket {
  const native = new WebSocket(url);
  const socket: EventSocket = {
    onmessage: null,
    onclose: null,
    onerror: null,
    close: () => native.close(),
  };
  native.onmessage = (event) => socket.onmessage?.({ data: event.data });
  native.onclose = (event) => socket.onclose?.({ code: event.code });
  native.onerror = () => socket.onerror?.();
  return socket;
}
export type Subscription = { id: string; type: ChatEventType };
type Connection = {
  socket: EventSocket;
  sessionId: string | null;
  watchdog: ReturnType<typeof setTimeout> | null;
  migrating: boolean;
  welcomed: boolean;
  timeout: number;
  epoch: number;
  setup: Promise<void> | null;
};
type Options = {
  channelId: string;
  subscribe: (sessionId: string) => Promise<Subscription[]>;
  receive: (message: EventSubMessage) => Promise<void>;
  changed: () => void;
  revoked: () => void;
  socketFactory?: SocketFactory;
  random?: () => number;
};
export const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
export function validReconnectUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'wss:' &&
      url.hostname === 'eventsub.wss.twitch.tv' &&
      (!url.port || url.port === '443') &&
      ['/', '/ws'].includes(url.pathname) &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/** A server-only, receive-only transport. Standard WebSocket ping/pong is handled by Node. */
export class EventSub {
  status: ChatStatus = 'not-connected';
  message = 'Connect Twitch to receive lessons.';
  gaps = 0;
  private active: Connection | null = null;
  private replacement: Connection | null = null;
  private subscriptions = new Map<string, ChatEventType>();
  private stopped = true;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private epoch = 0;
  private chain = Promise.resolve();
  private queued = 0;
  private readonly socketFactory: SocketFactory;
  private readonly random: () => number;
  constructor(private readonly options: Options) {
    this.socketFactory = options.socketFactory ?? nodeSocket;
    this.random = options.random ?? Math.random;
  }
  private update(status: ChatStatus, message: string) {
    this.status = status;
    this.message = message;
    this.options.changed();
  }
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.update('connecting', 'Connecting to Twitch chat…');
    try {
      this.active = this.open(EVENTSUB_URL, false);
    } catch {
      this.lost();
    }
  }
  private discard(connection: Connection | null) {
    if (!connection) return;
    if (connection.watchdog) clearTimeout(connection.watchdog);
    connection.socket.onmessage = null;
    connection.socket.onclose = null;
    connection.socket.onerror = null;
    connection.socket.close();
  }
  stop() {
    this.stopped = true;
    this.epoch++;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    this.discard(this.active);
    this.discard(this.replacement);
    this.active = null;
    this.replacement = null;
    this.subscriptions.clear();
    this.update('not-connected', 'Twitch chat is disconnected.');
  }
  private current(connection: Connection) {
    return !this.stopped && (this.active === connection || this.replacement === connection);
  }
  private watch(connection: Connection) {
    if (connection.watchdog) clearTimeout(connection.watchdog);
    connection.watchdog = setTimeout(() => {
      if (this.current(connection)) this.lost();
    }, connection.timeout);
    connection.watchdog.unref();
  }
  private open(url: string, migrating: boolean): Connection {
    const socket = this.socketFactory(url);
    const connection: Connection = {
      socket,
      sessionId: null,
      watchdog: null,
      migrating,
      welcomed: false,
      timeout: 15_000,
      epoch: this.epoch,
      setup: null,
    };
    socket.onmessage = ({ data }) => {
      if (this.current(connection)) void this.read(connection, data);
    };
    socket.onclose = () => {
      if (this.current(connection)) this.lost();
    };
    socket.onerror = () => {
      if (this.current(connection)) this.lost();
    };
    this.watch(connection);
    return connection;
  }
  private lost(minDelay = 0) {
    if (this.stopped || this.retry) return;
    this.gaps++;
    this.epoch++;
    this.discard(this.active);
    this.discard(this.replacement);
    this.active = null;
    this.replacement = null;
    this.subscriptions.clear();
    const delay =
      Math.max(minDelay, Math.min(30_000, 1000 * 2 ** Math.min(this.attempts++, 5))) +
      Math.floor(this.random() * 500);
    this.update(
      'reconnecting',
      'Chat connection interrupted. Messages during this gap cannot be recovered. Retrying…',
    );
    this.retry = setTimeout(() => {
      this.retry = null;
      if (this.stopped) return;
      try {
        this.active = this.open(EVENTSUB_URL, false);
      } catch {
        this.lost();
      }
    }, delay);
    this.retry.unref();
  }
  fail(message = 'Chat intake stopped. Retry after resolving the problem.') {
    this.stop();
    this.gaps++;
    this.update('error', message);
  }
  private async read(connection: Connection, data: unknown) {
    if (typeof data !== 'string' || data.length > 65_536) {
      this.lost();
      return;
    }
    let packet: EventSubMessage;
    try {
      packet = eventSubMessageSchema.parse(JSON.parse(data));
    } catch {
      this.lost();
      return;
    }
    const { metadata, payload } = packet;
    if (metadata.message_type === 'session_welcome') {
      const session = payload.session;
      if (
        connection.welcomed ||
        !session ||
        session.status !== 'connected' ||
        !session.keepalive_timeout_seconds
      ) {
        this.lost();
        return;
      }
      connection.welcomed = true;
      connection.sessionId = session.id;
      connection.timeout = (session.keepalive_timeout_seconds + 2) * 1000;
      this.watch(connection);
      if (connection.migrating) {
        const previous = this.active;
        // A directed reconnect may arrive before all subscription responses.
        // Preserve that setup work before handing authority to the new socket.
        await previous?.setup;
        if (!this.current(connection)) return;
        this.active = connection;
        this.replacement = null;
        this.discard(previous);
        this.attempts = 0;
        this.update('live', 'Live Twitch chat connected.');
        return;
      }
      connection.setup = (async () => {
        try {
          const subscriptions = await this.options.subscribe(session.id);
          if (!this.current(connection)) return;
          this.subscriptions = new Map(subscriptions.map((item) => [item.id, item.type]));
          this.attempts = 0;
          this.update('live', 'Live Twitch chat connected.');
        } catch (error) {
          if (!this.current(connection)) return;
          if (error instanceof Error && error.message === 'reconnect') {
            this.stop();
            this.update('revoked', 'Twitch chat access was revoked. Reconnect Twitch.');
            this.options.revoked();
          } else this.lost(error instanceof TwitchFailure ? error.retryAfterMs : 0);
        }
      })();
      await connection.setup;
      return;
    }
    if (!connection.welcomed) {
      this.lost();
      return;
    }
    if (metadata.message_type === 'session_keepalive') {
      this.watch(connection);
      return;
    }
    if (metadata.message_type === 'session_reconnect') {
      const session = payload.session;
      if (
        !session ||
        session.id !== connection.sessionId ||
        !session.reconnect_url ||
        !validReconnectUrl(session.reconnect_url)
      ) {
        this.lost();
        return;
      }
      if (this.replacement || connection !== this.active) return;
      this.update('reconnecting', 'Moving to a new Twitch chat connection…');
      try {
        this.replacement = this.open(session.reconnect_url, true);
      } catch {
        this.lost();
      }
      return;
    }
    const subscription = payload.subscription;
    if (
      !subscription ||
      subscription.condition.broadcaster_user_id !== this.options.channelId ||
      subscription.condition.user_id !== this.options.channelId ||
      subscription.type !== metadata.subscription_type ||
      metadata.subscription_version !== '1'
    )
      return;
    const knownType = this.subscriptions.get(subscription.id);
    if (metadata.message_type === 'revocation') {
      if (knownType !== subscription.type) return;
      this.stop();
      this.update('revoked', 'Twitch revoked a chat subscription. Reconnect Twitch.');
      this.options.revoked();
      return;
    }
    if (metadata.message_type !== 'notification' || subscription.status !== 'enabled') return;
    this.watch(connection);
    // Notifications can race subscription responses. The serialized handler waits
    // for setup before checking the final subscription IDs.
    if (this.queued >= 100) {
      this.fail('Chat intake exceeded its buffer. Some messages may be missing; retry intake.');
      return;
    }
    this.queued++;
    this.chain = this.chain
      .then(async () => {
        await connection.setup;
        if (this.stopped || connection.epoch !== this.epoch) return;
        if (this.subscriptions.get(subscription.id) !== subscription.type) return;
        await this.options.receive(packet);
      })
      .catch(() => {
        if (!this.stopped)
          this.fail('Local lesson storage failed. Intake is stopped; check disk space and retry.');
      })
      .finally(() => {
        this.queued--;
      });
  }
}
