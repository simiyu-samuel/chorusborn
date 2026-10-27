import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  chatMessageEventSchema,
  chatRemovalEventSchema,
  chatProposalSchema,
  type ChatProposal,
  type ChatIntake,
  type EventSubMessage,
} from '@chorusborn/contracts';

type Receipt = {
  id: string;
  at: number;
  sourceAt: number;
  kind: string;
  messageId?: string;
  userId?: string;
};
type Channel = {
  paused: boolean;
  proposals: ChatProposal[];
  receipts: Receipt[];
  cooldowns: Record<string, number>;
};
type Data = Record<string, Channel>;
const DAY = 86_400_000;
const fresh = (): Channel => ({ paused: false, proposals: [], receipts: [], cooldowns: {} });
const id = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 128;
export function parseTeaching(text: string): {
  kind: 'ordinary' | 'invalid' | 'lesson';
  text?: string;
} {
  const normalized = text.normalize('NFKC').trim();
  if (!/^!teach(?:\s|$)/i.test(normalized)) return { kind: 'ordinary' };
  const lesson = normalized.slice(6).trim();
  if (
    !lesson ||
    [...lesson].length > 280 ||
    /[\u0000-\u001f\u007f]|https?:\/\/|www\.|```|<[^>]*>/i.test(lesson)
  )
    return { kind: 'invalid' };
  return { kind: 'lesson', text: lesson };
}

/** Local durable command queue. Ordinary chat text is never written here. */
export class ChatStore {
  private data: Data = {};
  private writes: Promise<void> = Promise.resolve();
  private outcomes = new Map<string, ChatIntake['lastOutcome']>();
  constructor(
    private readonly path: string | null,
    private readonly now: () => number = Date.now,
  ) {}
  async load() {
    if (!this.path) return;
    try {
      const raw = await readFile(this.path, 'utf8');
      if (raw.length > 20_000_000) throw new Error('Local chat store is too large.');
      const data = JSON.parse(raw) as Data;
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length > 20)
        throw new Error('Invalid chat store.');
      for (const [channelId, channel] of Object.entries(data)) {
        if (
          !/^\d{1,32}$/.test(channelId) ||
          !channel ||
          typeof channel.paused !== 'boolean' ||
          !Array.isArray(channel.proposals) ||
          channel.proposals.length > 100 ||
          !Array.isArray(channel.receipts) ||
          channel.receipts.length > 5000 ||
          !channel.cooldowns ||
          typeof channel.cooldowns !== 'object' ||
          Array.isArray(channel.cooldowns)
        )
          throw new Error('Invalid chat channel store.');
        channel.proposals = channel.proposals.map((proposal) => chatProposalSchema.parse(proposal));
        if (channel.proposals.some((proposal) => proposal.channelId !== channelId))
          throw new Error('Mismatched chat channel.');
        for (const receipt of channel.receipts) {
          if (
            !receipt ||
            !id(receipt.id) ||
            !Number.isFinite(receipt.at) ||
            !Number.isFinite(receipt.sourceAt) ||
            ![
              'teach',
              'channel.chat.message_delete',
              'channel.chat.clear_user_messages',
              'channel.chat.clear',
            ].includes(receipt.kind) ||
            (receipt.messageId !== undefined && !id(receipt.messageId)) ||
            (receipt.userId !== undefined && !/^\d{1,32}$/.test(receipt.userId))
          )
            throw new Error('Invalid chat receipt.');
        }
        for (const [userId, until] of Object.entries(channel.cooldowns))
          if (!/^\d{1,32}$/.test(userId) || !Number.isFinite(until))
            throw new Error('Invalid chat cooldown.');
      }
      this.data = data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  private mutate<T>(channelId: string, change: (channel: Channel) => T): Promise<T> {
    const operation = this.writes.then(async () => {
      if (!/^\d{1,32}$/.test(channelId)) throw new Error('Invalid channel ID.');
      const next = structuredClone(this.data);
      if (!next[channelId] && Object.keys(next).length >= 20)
        throw new Error('Local channel capacity reached.');
      const channel = next[channelId] ?? fresh();
      const now = this.now();
      channel.proposals = channel.proposals.filter(
        (proposal) => proposal.receivedAt >= now - 30 * DAY,
      );
      channel.receipts = channel.receipts.filter((receipt) => receipt.at >= now - DAY);
      channel.cooldowns = Object.fromEntries(
        Object.entries(channel.cooldowns).filter(([, until]) => until > now),
      );
      const result = change(channel);
      // Never evict a live dedupe receipt to admit another command.
      if (channel.receipts.length > 5000) throw new Error('Local receipt capacity reached.');
      next[channelId] = channel;
      if (this.path) {
        await mkdir(dirname(this.path), { recursive: true });
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, this.path);
      }
      this.data = next;
      return result;
    });
    this.writes = operation.then(
      () => {},
      () => {},
    );
    return operation;
  }
  view(channelId: string) {
    const channel = this.data[channelId] ?? fresh();
    return {
      paused: channel.paused,
      proposals: channel.proposals.filter(
        (proposal) => proposal.receivedAt >= this.now() - 30 * DAY,
      ),
      lastOutcome: this.outcomes.get(channelId) ?? null,
    };
  }
  async pause(channelId: string, paused: boolean) {
    await this.mutate(channelId, (channel) => {
      channel.paused = paused;
    });
  }
  async reject(channelId: string, proposalId: string) {
    return this.mutate(channelId, (channel) => {
      const proposal = channel.proposals.find((item) => item.id === proposalId);
      if (!proposal) return false;
      if (proposal.status === 'awaiting-compiler') proposal.status = 'rejected';
      return true;
    });
  }
  async receive(channelId: string, packet: EventSubMessage) {
    const { metadata, payload } = packet;
    if (
      metadata.message_type !== 'notification' ||
      !payload.subscription ||
      !payload.event ||
      payload.subscription.condition.broadcaster_user_id !== channelId ||
      payload.subscription.condition.user_id !== channelId
    )
      return;
    const sourceAt = Date.parse(metadata.message_timestamp),
      now = this.now();
    if (!Number.isFinite(sourceAt) || sourceAt < now - 10 * 60_000 || sourceAt > now + 60_000)
      return;
    const type = payload.subscription.type;
    if (type === 'channel.chat.message') {
      const parsed = chatMessageEventSchema.safeParse(payload.event);
      if (
        !parsed.success ||
        parsed.data.broadcaster_user_id !== channelId ||
        (parsed.data.source_broadcaster_user_id &&
          parsed.data.source_broadcaster_user_id !== channelId)
      )
        return;
      const event = parsed.data,
        teaching = parseTeaching(event.message.text);
      if (teaching.kind === 'ordinary') return;
      const outcome = await this.mutate(channelId, (channel): ChatIntake['lastOutcome'] => {
        if (
          channel.receipts.some(
            (receipt) =>
              receipt.id === metadata.message_id || receipt.messageId === event.message_id,
          )
        )
          return 'duplicate';
        channel.receipts.push({
          id: metadata.message_id,
          messageId: event.message_id,
          at: now,
          sourceAt,
          kind: 'teach',
        });
        if (
          channel.receipts.some(
            (receipt) =>
              receipt.sourceAt >= sourceAt &&
              (receipt.kind === 'channel.chat.clear' ||
                (receipt.kind === 'channel.chat.clear_user_messages' &&
                  receipt.userId === event.chatter_user_id)),
          )
        )
          return 'moderated';
        if (teaching.kind === 'invalid') return 'invalid';
        if (channel.paused) return 'paused';
        if ((channel.cooldowns[event.chatter_user_id] ?? 0) > now) return 'cooldown';
        if (
          channel.proposals.filter((proposal) => proposal.status === 'awaiting-compiler').length >=
          50
        )
          return 'full';
        channel.cooldowns[event.chatter_user_id] = now + 30_000;
        channel.proposals.unshift({
          id: randomUUID(),
          channelId,
          messageId: event.message_id,
          author: {
            id: event.chatter_user_id,
            login: event.chatter_user_login,
            name: event.chatter_user_name,
          },
          text: teaching.text!,
          receivedAt: now,
          status: 'awaiting-compiler',
        });
        let historySlots =
          100 -
          channel.proposals.filter((proposal) => proposal.status === 'awaiting-compiler').length;
        channel.proposals = channel.proposals.filter(
          (proposal) => proposal.status === 'awaiting-compiler' || historySlots-- > 0,
        );
        return 'queued';
      });
      this.outcomes.set(channelId, outcome);
      return;
    }
    const parsed = chatRemovalEventSchema.safeParse(payload.event);
    if (!parsed.success || parsed.data.broadcaster_user_id !== channelId) return;
    const event = parsed.data;
    if (type === 'channel.chat.message_delete' && !event.message_id) return;
    if (type === 'channel.chat.clear_user_messages' && !event.target_user_id) return;
    await this.mutate(channelId, (channel) => {
      if (channel.receipts.some((receipt) => receipt.id === metadata.message_id)) return;
      channel.receipts.push({
        id: metadata.message_id,
        at: now,
        sourceAt,
        kind: type,
        ...(type === 'channel.chat.message_delete' ? { messageId: event.message_id } : {}),
        ...(type === 'channel.chat.clear_user_messages' ? { userId: event.target_user_id } : {}),
      });
      for (const proposal of channel.proposals) {
        // A later teach must not be removed by an out-of-order earlier room clear.
        const teachAt =
          channel.receipts.find(
            (receipt) => receipt.kind === 'teach' && receipt.messageId === proposal.messageId,
          )?.sourceAt ?? proposal.receivedAt;
        const matches =
          type === 'channel.chat.message_delete'
            ? proposal.messageId === event.message_id
            : teachAt <= sourceAt &&
              (type === 'channel.chat.clear' || proposal.author?.id === event.target_user_id);
        if (matches) {
          proposal.text = null;
          proposal.author = null;
          proposal.status = 'removed';
        }
      }
    });
    this.outcomes.set(channelId, 'moderated');
  }
  async flush() {
    await this.writes;
  }
}
