import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import { addLesson, createPlaybook } from '@chorusborn/sim';
import { Rivalries, type RivalParticipant } from './rivalry.js';
const setup = () => {
  const people = new Map<string, RivalParticipant>([
    [
      'one',
      { studioId: 'one', channel: { id: '1', login: 'streamer_one' }, playbook: createPlaybook() },
    ],
    [
      'two',
      { studioId: 'two', channel: { id: '2', login: 'streamer_two' }, playbook: createPlaybook() },
    ],
    [
      'third',
      { studioId: 'third', channel: { id: '3', login: 'outsider' }, playbook: createPlaybook() },
    ],
  ]);
  let time = 0;
  const rivals = new Rivalries(
    (id) => people.get(id) ?? null,
    () => time,
  );
  const accept = () => {
    rivals.invite('one', 'streamer_two');
    const id = rivals.view('two').incoming[0]!.id;
    rivals.respond('two', id, 'accept');
    return id;
  };
  return {
    rivals,
    people,
    accept,
    expire: () => {
      time += 600001;
    },
  };
};
describe('mutually authorized rivalry', () => {
  it('rejects spoofed participants, self/duplicate/expired challenges and uninvited acceptance', () => {
    const { rivals, accept, expire } = setup();
    expect(() => rivals.invite('unknown', 'streamer_two')).toThrow('verify');
    expect(() => rivals.invite('one', 'streamer_one')).toThrow('different');
    rivals.invite('one', 'streamer_two');
    const id = rivals.view('two').incoming[0]!.id;
    expect(() => rivals.invite('one', 'outsider')).toThrow('Cancel');
    expect(() => rivals.respond('third', id, 'accept')).toThrow('another');
    expect(() => rivals.respond('two', id, 'cancel')).toThrow('inviter');
    expire();
    expect(() => rivals.respond('two', id, 'accept')).toThrow('expired');
    const used = accept();
    expect(() => rivals.respond('two', used, 'accept')).toThrow('answered');
    expect(rivals.view('two').match?.self).toBe('b');
    expect(rivals.view('third').match).toBeNull();
  });
  it('starts only after both ready, advances once, pins both books and resumes/rematches by mutual consent', () => {
    const { rivals, people, accept } = setup();
    accept();
    rivals.control('one', 'ready');
    expect(rivals.current('two')!.world.status).toBe('paused');
    rivals.control('two', 'ready');
    expect(rivals.current('one')!.world.status).toBe('running');
    rivals.tick();
    expect(rivals.current('two')!.world.tick).toBe(1);
    people.get('two')!.playbook = addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate, {
      author: 'B viewer',
    });
    rivals.adopted('two');
    expect(rivals.current('one')!.world.champions[1].playbook.version).toBe(0);
    rivals.control('two', 'pause');
    rivals.control('one', 'ready');
    expect(rivals.current('one')!.world.status).toBe('paused');
    rivals.control('two', 'ready');
    expect(rivals.current('one')!.world.champions[1].playbook.version).toBe(0);
    for (let i = 0; i < 1200; i++) rivals.tick();
    expect(rivals.current('one')!.world.status).toBe('finished');
    rivals.control('two', 'ready');
    expect(rivals.current('one')!.world.status).toBe('finished');
    rivals.control('one', 'ready');
    expect(rivals.current('one')!.world).toMatchObject({
      tick: 0,
      status: 'running',
      winner: null,
    });
    expect(rivals.current('one')!.world.champions[1].playbook.version).toBe(1);
    expect(() => rivals.control('one', 'ready')).toThrow('already running');
  });
  it('clears readiness after adoption or lost authority and requires reconnection before resuming', () => {
    const { rivals, people, accept } = setup();
    accept();
    rivals.control('one', 'ready');
    rivals.adopted('two');
    expect(rivals.view('one').match?.ready).toEqual([false, false]);
    rivals.control('one', 'ready');
    rivals.control('two', 'ready');
    const peer = people.get('two')!;
    people.delete('two');
    rivals.syncAuthority();
    expect(rivals.current('one')!.world.status).toBe('paused');
    expect(rivals.view('one').match?.verified).toEqual([true, false]);
    expect(() => rivals.control('one', 'ready')).toThrow('reconnect');
    expect(() => rivals.control('two', 'leave')).toThrow('verify');
    people.set('two', peer);
    rivals.control('two', 'ready');
    expect(rivals.current('one')!.world.status).toBe('paused');
    rivals.control('one', 'ready');
    expect(rivals.current('one')!.world.status).toBe('running');
    rivals.control('two', 'leave');
    expect(rivals.current('one')).toBeUndefined();
  });
});
