// Explicit provider fixtures for unit/browser tests. Production imports none of this file.
import { randomUUID } from 'node:crypto';
import type { ChatEventType, EventSubMessage } from '@chorusborn/contracts';
import type { EventSocket } from '../../apps/server/src/eventsub.js';

export class MockEventSocket implements EventSocket {
  onmessage: EventSocket['onmessage'] = null;
  onclose: EventSocket['onclose'] = null;
  onerror: EventSocket['onerror'] = null;
  closed = false;
  constructor(readonly url = 'wss://eventsub.wss.twitch.tv/ws') {}
  close() {
    this.closed = true;
  }
  emit(packet: unknown) {
    this.onmessage?.({ data: JSON.stringify(packet) });
  }
  welcome(sessionId = 'fixture-session') {
    this.emit({
      metadata: {
        message_id: randomUUID(),
        message_type: 'session_welcome',
        message_timestamp: new Date().toISOString(),
      },
      payload: {
        session: {
          id: sessionId,
          status: 'connected',
          keepalive_timeout_seconds: 10,
          reconnect_url: null,
        },
      },
    });
  }
  lose() {
    this.onclose?.({ code: 1006 });
  }
}
export function chatNotification(
  type: ChatEventType = 'channel.chat.message',
  overrides: Record<string, unknown> = {},
  timestamp = Date.now(),
): EventSubMessage {
  const event =
    type === 'channel.chat.message'
      ? {
          broadcaster_user_id: '123456',
          chatter_user_id: '789',
          chatter_user_login: 'viewer_one',
          chatter_user_name: 'Viewer One',
          message_id: randomUUID(),
          message: { text: '!teach Take a cautious route home when carrying the core.' },
          source_broadcaster_user_id: null,
        }
      : { broadcaster_user_id: '123456' };
  return {
    metadata: {
      message_id: randomUUID(),
      message_type: 'notification',
      message_timestamp: new Date(timestamp).toISOString(),
      subscription_type: type,
      subscription_version: '1',
    },
    payload: {
      subscription: {
        id: `fixture-${type}`,
        type,
        version: '1',
        status: 'enabled',
        condition: { broadcaster_user_id: '123456', user_id: '123456' },
        transport: { method: 'websocket', session_id: 'fixture-session' },
      },
      event: { ...event, ...overrides },
    },
  };
}
export function subscriptionResponse(body: string) {
  const request = JSON.parse(body);
  return Response.json(
    { data: [{ ...request, id: `fixture-${request.type}`, status: 'enabled', cost: 0 }] },
    { status: 202 },
  );
}
