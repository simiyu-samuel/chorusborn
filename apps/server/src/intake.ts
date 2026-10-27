import type { ChatIntake } from '@chorusborn/contracts';
import { ChatStore } from './chat-store.js';
import { EventSub, type SocketFactory } from './eventsub.js';
import { TwitchOAuth, TwitchFailure } from './twitch.js';

type Channel = { members: Set<string>; transport: EventSub };
export class TwitchIntake {
  private readonly channels = new Map<string, Channel>();
  private readonly bindings = new Map<string, string>();
  private readonly unsubscribe: () => void;
  constructor(
    private readonly oauth: TwitchOAuth,
    private readonly store: ChatStore,
    private readonly changed: (owner: string) => void,
    private readonly socketFactory?: SocketFactory,
  ) {
    this.unsubscribe = oauth.onChange((owner) => this.sync(owner));
  }
  sync(owner: string) {
    const state = this.oauth.publicState(owner);
    const channelId = state.status === 'authenticated' ? state.channel?.id : undefined;
    const previousId = this.bindings.get(owner);
    if (previousId && previousId !== channelId) {
      const previous = this.channels.get(previousId);
      previous?.members.delete(owner);
      this.bindings.delete(owner);
      if (previous && !previous.members.size) {
        previous.transport.stop();
        this.channels.delete(previousId);
      }
    }
    if (!channelId) {
      this.changed(owner);
      return;
    }
    let channel = this.channels.get(channelId);
    if (!channel) {
      const members = new Set<string>();
      const notify = () => {
        for (const member of members) this.changed(member);
      };
      const transport = new EventSub({
        channelId,
        socketFactory: this.socketFactory,
        changed: notify,
        subscribe: async (sessionId) => {
          const member = [...members].find(
            (candidate) => this.oauth.publicState(candidate).status === 'authenticated',
          );
          if (!member) throw new TwitchFailure('reconnect');
          return this.oauth.createChatSubscriptions(member, sessionId);
        },
        receive: async (packet) => {
          if (!members.size) return;
          await this.store.receive(channelId, packet);
          notify();
        },
        revoked: () => {
          for (const member of [...members]) this.oauth.invalidate(member);
        },
      });
      channel = { members, transport };
      this.channels.set(channelId, channel);
    }
    channel.members.add(owner);
    this.bindings.set(owner, channelId);
    channel.transport.start();
    this.changed(owner);
  }
  view(owner: string): ChatIntake {
    const state = this.oauth.publicState(owner);
    const channelId = state.status === 'authenticated' ? this.bindings.get(owner) : undefined;
    const channel = channelId ? this.channels.get(channelId) : undefined;
    if (!channelId || !channel)
      return {
        status: 'not-connected',
        message:
          state.status === 'validation-unavailable'
            ? 'Twitch validation is unavailable. Intake is stopped until verification recovers.'
            : 'Connect Twitch to receive lessons.',
        channelId: null,
        paused: false,
        gaps: 0,
        proposals: [],
        lastOutcome: null,
      };
    return {
      status: channel.transport.status,
      message: channel.transport.message,
      gaps: channel.transport.gaps,
      channelId,
      ...this.store.view(channelId),
    };
  }
  private authorized(owner: string) {
    const channelId = this.bindings.get(owner);
    if (!channelId || this.oauth.publicState(owner).status !== 'authenticated')
      throw new TwitchFailure('reconnect');
    return { channelId, channel: this.channels.get(channelId)! };
  }
  async control(owner: string, action: 'pause' | 'resume' | 'retry') {
    const { channelId, channel } = this.authorized(owner);
    if (action === 'retry') {
      channel.transport.stop();
      channel.transport.start();
    } else await this.store.pause(channelId, action === 'pause');
    for (const member of channel.members) this.changed(member);
  }
  async reject(owner: string, proposalId: string) {
    const { channelId, channel } = this.authorized(owner);
    const found = await this.store.reject(channelId, proposalId);
    for (const member of channel.members) this.changed(member);
    return found;
  }
  async close() {
    this.unsubscribe();
    for (const channel of this.channels.values()) channel.transport.stop();
    this.channels.clear();
    this.bindings.clear();
    await this.store.flush();
  }
}
