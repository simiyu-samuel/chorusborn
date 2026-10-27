import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatStore, parseTeaching } from './chat-store.js';
import { chatNotification } from '../../../tests/support/twitch-fixtures.js';
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
const channel = '123456';

describe('teaching command boundary', () => {
  it('normalizes commands, bounds text, and rejects ordinary chat, links and code blocks', () => {
    expect(parseTeaching('hello chat').kind).toBe('ordinary');
    expect(parseTeaching('!teacher move').kind).toBe('ordinary');
    expect(parseTeaching('！ＴＥＡＣＨ Go home.')).toEqual({ kind: 'lesson', text: 'Go home.' });
    for (const text of [
      '!teach',
      `!teach ${'x'.repeat(281)}`,
      '!teach https://example.com',
      '!teach ```run```',
      '!teach hello\nworld',
      '!teach <script>bad</script>',
    ])
      expect(parseTeaching(text).kind).toBe('invalid');
    expect(parseTeaching(`!teach ${'🦉'.repeat(280)}`).kind).toBe('lesson');
  });
  it('stores trusted attribution once across concurrent envelope/message duplicates', async () => {
    const store = new ChatStore(null),
      packet = chatNotification();
    await Promise.all([store.receive(channel, packet), store.receive(channel, packet)]);
    const duplicateMessage = structuredClone(packet);
    duplicateMessage.metadata.message_id = 'different-envelope';
    await store.receive(channel, duplicateMessage);
    expect(store.view(channel).proposals).toHaveLength(1);
    expect(store.view(channel).proposals[0]!.author).toEqual({
      id: '789',
      login: 'viewer_one',
      name: 'Viewer One',
    });
    expect(store.view(channel).lastOutcome).toBe('duplicate');
  });
  it('ignores ordinary and foreign-source shared chat and rejects stale/mismatched provenance', async () => {
    const now = Date.now(),
      store = new ChatStore(null, () => now);
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { message: { text: 'ordinary message' } }, now),
    );
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { source_broadcaster_user_id: '999' }, now),
    );
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { broadcaster_user_id: '999' }, now),
    );
    await store.receive(channel, chatNotification('channel.chat.message', {}, now - 600_001));
    await store.receive(channel, chatNotification('channel.chat.message', {}, now + 60_001));
    expect(store.view(channel).proposals).toHaveLength(0);
    expect(store.view(channel).lastOutcome).toBeNull();
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { source_broadcaster_user_id: channel }, now),
    );
    expect(store.view(channel).proposals).toHaveLength(1);
  });
  it('applies pause and user cooldown after deduplication, while retaining deletion handling', async () => {
    let now = Date.now();
    const store = new ChatStore(null, () => now);
    const first = chatNotification('channel.chat.message', {}, now);
    await store.receive(channel, first);
    await store.receive(channel, first);
    expect(store.view(channel).lastOutcome).toBe('duplicate');
    await store.receive(channel, chatNotification('channel.chat.message', {}, now));
    expect(store.view(channel).lastOutcome).toBe('cooldown');
    now += 30_000;
    await store.pause(channel, true);
    await store.receive(channel, chatNotification('channel.chat.message', {}, now));
    expect(store.view(channel).lastOutcome).toBe('paused');
    await store.receive(
      channel,
      chatNotification(
        'channel.chat.message_delete',
        { message_id: first.payload.event!.message_id },
        now,
      ),
    );
    expect(store.view(channel).proposals[0]!.text).toBeNull();
    await store.pause(channel, false);
    await store.receive(channel, chatNotification('channel.chat.message', {}, now));
    expect(store.view(channel).lastOutcome).toBe('queued');
  });
  it('redacts deleted text/identity and prevents out-of-order deletion or clears from resurrecting it', async () => {
    const now = Date.now(),
      store = new ChatStore(null, () => now);
    const deleted = chatNotification(
      'channel.chat.message',
      { message_id: 'removed-message' },
      now - 100,
    );
    await store.receive(
      channel,
      chatNotification('channel.chat.message_delete', { message_id: 'removed-message' }, now),
    );
    await store.receive(channel, deleted);
    expect(store.view(channel).proposals).toHaveLength(0);
    await store.receive(
      channel,
      chatNotification('channel.chat.clear_user_messages', { target_user_id: '789' }, now),
    );
    await store.receive(channel, chatNotification('channel.chat.message', {}, now - 50));
    expect(store.view(channel).lastOutcome).toBe('moderated');
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { chatter_user_id: '790' }, now),
    );
    await store.receive(channel, chatNotification('channel.chat.clear', {}, now + 1));
    expect(store.view(channel).proposals[0]).toMatchObject({
      status: 'removed',
      text: null,
      author: null,
    });
  });
  it('preserves later teachings when an earlier room clear arrives late', async () => {
    const now = Date.now(),
      store = new ChatStore(null, () => now);
    await store.receive(channel, chatNotification('channel.chat.message', {}, now));
    await store.receive(channel, chatNotification('channel.chat.clear', {}, now - 100));
    expect(store.view(channel).proposals[0]!.status).toBe('awaiting-compiler');
  });
  it('persists proposals, pauses, cooldowns and dedupe receipts across a restart', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'chorus-chat-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'chat.json'),
      first = new ChatStore(path);
    const packet = chatNotification();
    await first.receive(channel, packet);
    await first.pause(channel, true);
    const reopened = new ChatStore(path);
    await reopened.load();
    await reopened.receive(channel, packet);
    expect(reopened.view(channel).proposals).toHaveLength(1);
    expect(reopened.view(channel).paused).toBe(true);
    expect(reopened.view(channel).lastOutcome).toBe('duplicate');
    const contents = await readFile(path, 'utf8');
    expect(contents).not.toContain('access_token');
  });
  it('caps the pending queue, lets the coach reject, and preserves queued rows while trimming history', async () => {
    let now = Date.now();
    const store = new ChatStore(null, () => now);
    for (let i = 0; i < 50; i++)
      await store.receive(
        channel,
        chatNotification('channel.chat.message', { chatter_user_id: String(1000 + i) }, now),
      );
    await store.receive(
      channel,
      chatNotification('channel.chat.message', { chatter_user_id: '9999' }, now),
    );
    expect(store.view(channel).lastOutcome).toBe('full');
    const retainedId = store.view(channel).proposals.at(-1)!.id;
    for (let i = 0; i < 105; i++) {
      const proposal = store
        .view(channel)
        .proposals.find((item) => item.status === 'awaiting-compiler' && item.id !== retainedId)!;
      await store.reject(channel, proposal.id);
      now += 30_001;
      await store.receive(
        channel,
        chatNotification('channel.chat.message', { chatter_user_id: '9999' }, now),
      );
    }
    expect(store.view(channel).proposals).toHaveLength(100);
    expect(store.view(channel).proposals.find((item) => item.id === retainedId)?.status).toBe(
      'awaiting-compiler',
    );
    expect(await store.reject(channel, 'another-channel-id')).toBe(false);
  });
  it('does not publish a proposal when the atomic disk write fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'chorus-chat-disk-'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'chat.json');
    await mkdir(path);
    const store = new ChatStore(path);
    await expect(store.receive(channel, chatNotification())).rejects.toThrow();
    expect(store.view(channel).proposals).toHaveLength(0);
  });
});
