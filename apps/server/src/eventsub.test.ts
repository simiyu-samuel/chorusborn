import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_EVENT_TYPES } from '@chorusborn/contracts';
import { EventSub, EVENTSUB_URL, validReconnectUrl } from './eventsub.js';
import { TwitchFailure } from './twitch.js';
import { MockEventSocket, chatNotification } from '../../../tests/support/twitch-fixtures.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanups.splice(0)) close();
  vi.useRealTimers();
});
const flush = () => vi.advanceTimersByTimeAsync(0);
function setup() {
  vi.useFakeTimers();
  const sockets: MockEventSocket[] = [];
  const subscribe = vi.fn(async (_id: string) =>
    CHAT_EVENT_TYPES.map((type) => ({ id: `fixture-${type}`, type })),
  );
  const receive = vi.fn(async () => {}),
    changed = vi.fn(),
    revoked = vi.fn();
  const transport = new EventSub({
    channelId: '123456',
    subscribe,
    receive,
    changed,
    revoked,
    random: () => 0,
    socketFactory: (url) => {
      const socket = new MockEventSocket(url);
      sockets.push(socket);
      return socket;
    },
  });
  cleanups.push(() => transport.stop());
  transport.start();
  return { transport, sockets, subscribe, receive, revoked };
}
function reconnect(url: string) {
  return {
    metadata: {
      message_id: 'reconnect',
      message_type: 'session_reconnect',
      message_timestamp: new Date().toISOString(),
    },
    payload: {
      session: {
        id: 'fixture-session',
        status: 'reconnecting',
        keepalive_timeout_seconds: null,
        reconnect_url: url,
      },
    },
  };
}

describe('EventSub transport', () => {
  it('subscribes after welcome and accepts only the bound subscription and channel', async () => {
    const { sockets, transport, subscribe, receive } = setup();
    expect(sockets[0]!.url).toBe(EVENTSUB_URL);
    expect(subscribe).not.toHaveBeenCalled();
    sockets[0]!.welcome();
    await flush();
    expect(subscribe).toHaveBeenCalledWith('fixture-session');
    expect(transport.status).toBe('live');
    const valid = chatNotification();
    sockets[0]!.emit(valid);
    await flush();
    expect(receive).toHaveBeenCalledTimes(1);
    const foreign = structuredClone(valid);
    foreign.payload.subscription!.condition.broadcaster_user_id = '999';
    sockets[0]!.emit(foreign);
    const unregistered = structuredClone(valid);
    unregistered.payload.subscription!.id = 'not-ours';
    sockets[0]!.emit(unregistered);
    await flush();
    expect(receive).toHaveBeenCalledTimes(1);
  });
  it('waits for subscription setup when a notification races the HTTP response', async () => {
    const { sockets, subscribe, receive } = setup();
    let finish!: (value: Awaited<ReturnType<typeof subscribe>>) => void;
    subscribe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    sockets[0]!.welcome();
    sockets[0]!.emit(chatNotification());
    await flush();
    expect(receive).not.toHaveBeenCalled();
    finish(CHAT_EVENT_TYPES.map((type) => ({ type, id: `fixture-${type}` })));
    await flush();
    expect(receive).toHaveBeenCalledTimes(1);
  });
  it('migrates using the exact reconnect URL without resubscribing or closing early', async () => {
    const { sockets, transport, subscribe, receive } = setup();
    sockets[0]!.welcome();
    await flush();
    const url = 'wss://eventsub.wss.twitch.tv/ws?reconnect=opaque%2Fvalue';
    sockets[0]!.emit(reconnect(url));
    expect(sockets[1]!.url).toBe(url);
    expect(sockets[0]!.closed).toBe(false);
    sockets[0]!.emit(chatNotification());
    sockets[1]!.welcome('migrated-session');
    await flush();
    expect(sockets[0]!.closed).toBe(true);
    expect(transport.gaps).toBe(0);
    expect(transport.status).toBe('live');
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(receive).toHaveBeenCalledTimes(1);
  });
  it('declares a gap and resubscribes after an unexpected close or a keepalive timeout', async () => {
    const { sockets, transport, subscribe } = setup();
    sockets[0]!.welcome();
    await flush();
    sockets[0]!.lose();
    expect(transport.status).toBe('reconnecting');
    expect(transport.message).toContain('cannot be recovered');
    await vi.advanceTimersByTimeAsync(1000);
    sockets[1]!.welcome('fresh-session');
    await flush();
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(transport.gaps).toBe(1);
    await vi.advanceTimersByTimeAsync(12_001);
    expect(transport.status).toBe('reconnecting');
    expect(transport.gaps).toBe(2);
  });
  it('keeps subscription IDs when a directed reconnect races initial setup', async () => {
    const { sockets, transport, subscribe, receive } = setup();
    let finish!: (value: Awaited<ReturnType<typeof subscribe>>) => void;
    subscribe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    sockets[0]!.welcome();
    sockets[0]!.emit(reconnect('wss://eventsub.wss.twitch.tv/ws?reconnect=setup-race'));
    sockets[1]!.welcome('migrated-session');
    await flush();
    expect(sockets[0]!.closed).toBe(false);
    finish(CHAT_EVENT_TYPES.map((type) => ({ type, id: `fixture-${type}` })));
    await flush();
    sockets[1]!.emit(chatNotification());
    await flush();
    expect(transport.status).toBe('live');
    expect(transport.gaps).toBe(0);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(receive).toHaveBeenCalledOnce();
  });
  it('closes a revoked subscription and stops receiving', async () => {
    const { sockets, transport, receive, revoked } = setup();
    sockets[0]!.welcome();
    await flush();
    const packet = chatNotification();
    packet.metadata.message_type = 'revocation';
    packet.payload.subscription!.status = 'authorization_revoked';
    sockets[0]!.emit(packet);
    await flush();
    expect(transport.status).toBe('revoked');
    expect(revoked).toHaveBeenCalledOnce();
    expect(sockets[0]!.closed).toBe(true);
    sockets[0]!.emit(chatNotification());
    await flush();
    expect(receive).not.toHaveBeenCalled();
  });
  it('rejects untrusted reconnect destinations and oversized/malformed frames', async () => {
    const { sockets, transport } = setup();
    sockets[0]!.welcome();
    await flush();
    expect(validReconnectUrl('wss://eventsub.wss.twitch.tv/?token=opaque')).toBe(true);
    for (const url of [
      'ws://eventsub.wss.twitch.tv/ws',
      'wss://eventsub.wss.twitch.tv.evil.test/ws',
      'wss://user@eventsub.wss.twitch.tv/ws',
      'wss://eventsub.wss.twitch.tv:444/ws',
    ])
      expect(validReconnectUrl(url)).toBe(false);
    sockets[0]!.emit(reconnect('wss://untrusted.example/ws'));
    expect(sockets).toHaveLength(1);
    expect(transport.status).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    sockets[1]!.welcome();
    await flush();
    sockets[1]!.onmessage?.({ data: 'x'.repeat(65_537) });
    expect(transport.gaps).toBe(2);
  });
  it('respects subscription rate-limit backoff and stops on authorization failure', async () => {
    const { sockets, transport, subscribe, revoked } = setup();
    subscribe.mockRejectedValueOnce(new TwitchFailure('unavailable', 60_000));
    sockets[0]!.welcome();
    await flush();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(sockets).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(2);
    subscribe.mockRejectedValueOnce(new TwitchFailure('reconnect'));
    sockets[1]!.welcome();
    await flush();
    expect(transport.status).toBe('revoked');
    expect(revoked).toHaveBeenCalledOnce();
  });
  it('fails visibly on storage failure or buffer overflow and cancels reconnects on stop', async () => {
    const { sockets, transport, receive } = setup();
    sockets[0]!.welcome();
    await flush();
    receive.mockRejectedValueOnce(new Error('disk unavailable'));
    sockets[0]!.emit(chatNotification());
    await flush();
    expect(transport.status).toBe('error');
    expect(transport.message).toContain('storage failed');
    transport.start();
    sockets[1]!.welcome();
    await flush();
    for (let i = 0; i < 101; i++) sockets[1]!.emit(chatNotification());
    expect(transport.status).toBe('error');
    expect(transport.message).toContain('buffer');
    transport.start();
    sockets[2]!.lose();
    transport.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(3);
  });
});
