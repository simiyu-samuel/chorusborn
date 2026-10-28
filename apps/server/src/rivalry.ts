import { randomUUID, randomInt } from 'node:crypto';
import type {
  ChannelIdentity,
  Playbook,
  RivalChallenge,
  RivalryState,
  World,
} from '@chorusborn/contracts';
import { createRivalWorld, hash, step } from '@chorusborn/sim';
export type RivalParticipant = { studioId: string; channel: ChannelIdentity; playbook: Playbook };
type Challenge = RivalChallenge & { owner: string };
type Match = {
  id: string;
  owners: [string, string];
  channels: [ChannelIdentity, ChannelIdentity];
  world: World;
  ready: [string | null, string | null];
};
export class RivalFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Process-local matches. Channel authority is resolved fresh for every operation. */
export class Rivalries {
  private readonly challenges = new Map<string, Challenge>();
  private readonly matches = new Map<string, Match>();
  constructor(
    private readonly participant: (owner: string) => RivalParticipant | null,
    private readonly now = Date.now,
  ) {}
  private prune() {
    for (const [id, challenge] of this.challenges)
      if (challenge.expiresAt <= this.now()) this.challenges.delete(id);
  }
  current(owner: string) {
    return [...this.matches.values()].find((m) => m.owners.includes(owner));
  }
  private authorized(owner: string) {
    const participant = this.participant(owner);
    if (!participant) throw new RivalFailure(403, 'Connect and verify your Twitch channel first.');
    return participant;
  }
  view(owner: string): RivalryState {
    this.prune();
    const who = this.participant(owner),
      match = this.current(owner);
    const clean = ({ owner: _owner, ...challenge }: Challenge): RivalChallenge => challenge;
    return {
      incoming: who
        ? [...this.challenges.values()].filter((c) => c.toLogin === who.channel.login).map(clean)
        : [],
      outgoing: who
        ? (() => {
            const c = [...this.challenges.values()].find((c) => c.owner === owner);
            return c ? clean(c) : null;
          })()
        : null,
      match: match
        ? {
            id: match.id,
            self: match.owners[0] === owner ? 'a' : 'b',
            participants: match.channels,
            ready: match.ready.map(Boolean) as [boolean, boolean],
            verified: match.owners.map(
              (id, i) => this.participant(id)?.channel.id === match.channels[i]!.id,
            ) as [boolean, boolean],
          }
        : null,
    };
  }
  invite(owner: string, toLogin: string) {
    this.prune();
    const who = this.authorized(owner);
    if (who.channel.login === toLogin) throw new RivalFailure(422, 'Choose a different streamer.');
    if (this.current(owner))
      throw new RivalFailure(409, 'End the current rivalry before sending another challenge.');
    if ([...this.challenges.values()].some((c) => c.owner === owner))
      throw new RivalFailure(409, 'Cancel the current invitation first.');
    if (this.challenges.size >= 100)
      throw new RivalFailure(429, 'The local challenge queue is full.');
    const challenge: Challenge = {
      id: randomUUID(),
      owner,
      from: structuredClone(who.channel),
      toLogin,
      expiresAt: this.now() + 10 * 60_000,
    };
    this.challenges.set(challenge.id, challenge);
  }
  respond(owner: string, id: string, action: 'accept' | 'decline' | 'cancel') {
    this.prune();
    const who = this.authorized(owner),
      challenge = this.challenges.get(id);
    if (!challenge) throw new RivalFailure(404, 'This challenge expired or was already answered.');
    if (action === 'cancel') {
      if (challenge.owner !== owner)
        throw new RivalFailure(403, 'Only the inviter may cancel this challenge.');
      this.challenges.delete(id);
      return;
    }
    if (who.channel.login !== challenge.toLogin || who.channel.id === challenge.from.id)
      throw new RivalFailure(403, 'This invitation belongs to another Twitch channel.');
    if (action === 'decline') {
      this.challenges.delete(id);
      return;
    }
    const from = this.authorized(challenge.owner);
    if (from.channel.id !== challenge.from.id || from.channel.login !== challenge.from.login)
      throw new RivalFailure(409, 'The inviting channel changed. Request a new challenge.');
    if (this.current(owner) || this.current(challenge.owner))
      throw new RivalFailure(409, 'A participant is already in a rivalry.');
    const world = createRivalWorld(
      [
        { name: from.channel.login, playbook: from.playbook },
        { name: who.channel.login, playbook: who.playbook },
      ],
      42,
      randomInt(2) === 0 ? 'a' : 'b',
    );
    const match: Match = {
      id: randomUUID(),
      owners: [challenge.owner, owner],
      channels: [structuredClone(from.channel), structuredClone(who.channel)],
      world,
      ready: [null, null],
    };
    this.matches.set(match.id, match);
    for (const [key, c] of this.challenges)
      if (match.owners.includes(c.owner) || match.channels.some((p) => p.login === c.toLogin))
        this.challenges.delete(key);
  }
  control(owner: string, action: 'ready' | 'pause' | 'leave') {
    this.authorized(owner);
    const match = this.current(owner);
    if (!match) throw new RivalFailure(409, 'No active rivalry.');
    if (action === 'leave') {
      this.matches.delete(match.id);
      return;
    }
    if (action === 'pause') {
      if (match.world.status === 'running') match.world.status = 'paused';
      match.ready = [null, null];
      return;
    }
    if (match.world.status === 'running')
      throw new RivalFailure(409, 'This match is already running.');
    const participants = match.owners.map((id) => this.participant(id));
    if (participants.some((p, i) => !p || p.channel.id !== match.channels[i]!.id))
      throw new RivalFailure(409, 'Both streamers must reconnect before readying.');
    const index = match.owners[0] === owner ? 0 : 1;
    match.ready[index] = hash(participants[index]!.playbook);
    if (!match.ready.every(Boolean)) return;
    if (match.ready.some((version, i) => version !== hash(participants[i]!.playbook))) {
      match.ready = [null, null];
      throw new RivalFailure(409, 'A playbook changed. Both streamers must ready again.');
    }
    if (match.world.status === 'finished' || match.world.tick === 0) {
      match.world = createRivalWorld(
        participants.map((p) => ({ name: p!.channel.login, playbook: p!.playbook })) as [
          { name: string; playbook: Playbook },
          { name: string; playbook: Playbook },
        ],
        match.world.seed,
        match.world.status === 'finished'
          ? match.world.contest.opening === 'a'
            ? 'b'
            : 'a'
          : match.world.contest.opening,
      );
    }
    match.world.status = 'running';
    match.ready = [null, null];
  }
  adopted(owner: string) {
    const match = this.current(owner);
    if (match && match.world.status !== 'running') match.ready = [null, null];
  }
  syncAuthority() {
    for (const match of this.matches.values())
      if (
        match.owners.some(
          (owner, i) => this.participant(owner)?.channel.id !== match.channels[i]!.id,
        )
      ) {
        if (match.world.status === 'running') match.world.status = 'paused';
        match.ready = [null, null];
      }
  }
  tick(): string[] {
    const changed: string[] = [];
    for (const match of this.matches.values())
      if (match.world.status === 'running') {
        match.world = step(match.world);
        if (match.world.tick % 2 === 0 || match.world.status === 'finished')
          changed.push(...match.owners);
      }
    return changed;
  }
}
