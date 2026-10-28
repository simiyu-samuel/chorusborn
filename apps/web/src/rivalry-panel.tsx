import { useState } from 'react';
import { Swords, Radio, Check, Pause, ArrowRight } from 'lucide-react';
import type { StudioState } from '@chorusborn/contracts';
import './rivalry.css';
export function RivalryPanel({
  state,
  update,
  connect,
}: {
  state: StudioState;
  update: (state: StudioState) => void;
  connect: () => void;
}) {
  const [login, setLogin] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const { incoming, outgoing, match } = state.rivalry;
  const authenticated = state.twitch.status === 'authenticated';
  const command = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          path === '/api/rivalry/controls'
            ? { ...(body as Record<string, unknown>), matchId: match?.id }
            : body,
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      update(data as StudioState);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const slot = match?.self === 'b' ? 1 : 0;
  return (
    <section className="rivalry-panel" aria-label="Streamer rivalry">
      <div className="rivalry-heading">
        <div>
          <span className="eyebrow">
            <Swords size={14} /> STREAMER VS STREAMER
          </span>
          <h2>Your chat. Their chat. One arena.</h2>
        </div>
        <span className="rivalry-badge">{match ? 'TWO COMMUNITIES' : 'CHALLENGE A STREAMER'}</span>
      </div>
      <p className="rivalry-explainer">
        Each community teaches its own champion. Both streamers approve the match. Playbooks stay
        locked until the next round. Equal core claims stay contested; neither side gets a free
        pickup.
      </p>
      {error ? (
        <p role="alert" className="modal-error">
          {error}
        </p>
      ) : null}
      {match ? (
        <>
          <div className="rivalry-roster">
            {match.participants.map((channel, i) => (
              <div className={`rivalry-side team-${i === 0 ? 'a' : 'b'}`} key={channel.id}>
                <strong>{channel.login}</strong>
                <span>
                  {slot === i ? 'Your community' : 'Rival community'} · locked v
                  {state.world.champions[i]!.playbook.version}
                </span>
                <small>
                  {!match.verified[i]
                    ? 'Reconnect Twitch'
                    : match.ready[i]
                      ? 'Ready'
                      : state.world.status === 'running'
                        ? 'In the arena'
                        : 'Not ready'}
                </small>
              </div>
            ))}
          </div>
          <div className="rivalry-actions">
            {state.world.status === 'running' ? (
              <button
                className="secondary-button"
                disabled={busy || !authenticated}
                onClick={() => void command('/api/rivalry/controls', { action: 'pause' })}
              >
                <Pause size={14} />
                Pause rivalry
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={
                  busy || !authenticated || match.ready[slot] || !match.verified.every(Boolean)
                }
                onClick={() => void command('/api/rivalry/controls', { action: 'ready' })}
              >
                <Check size={14} />
                {match.ready[slot]
                  ? 'Waiting for rival'
                  : state.world.status === 'finished'
                    ? 'Ready for rematch'
                    : 'Ready for rivalry'}
              </button>
            )}
            <button
              className="secondary-button"
              disabled={busy || !authenticated}
              onClick={() => void command('/api/rivalry/controls', { action: 'leave' })}
            >
              End rivalry
            </button>
            <span>
              {state.world.status === 'finished'
                ? 'Rematch needs both coaches and pins the latest books.'
                : state.world.tick > 0
                  ? 'Resume keeps this round’s locked books.'
                  : 'Both coaches must be ready to start.'}
            </span>
          </div>
        </>
      ) : authenticated ? (
        <>
          {!outgoing ? (
            <form
              className="rivalry-invite"
              onSubmit={(event) => {
                event.preventDefault();
                void command('/api/rivalry/challenges', {
                  opponentLogin: login.trim().replace(/^@/, '').toLowerCase(),
                });
              }}
            >
              <label>
                Rival streamer username
                <input
                  aria-label="Rival streamer username"
                  value={login}
                  maxLength={26}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="their_twitch_username"
                  required
                />
              </label>
              <button className="primary-button" disabled={busy}>
                <Swords size={15} />
                Send challenge
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <div className="rivalry-incoming">
              <div>
                <strong>Challenge sent to {outgoing.toLogin}</strong>
                <p>
                  They will see it after connecting their own Twitch account here. Expires in ten
                  minutes.
                </p>
              </div>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() =>
                  void command(`/api/rivalry/challenges/${outgoing.id}`, { action: 'cancel' })
                }
              >
                Cancel challenge
              </button>
            </div>
          )}
          {incoming.map((challenge) => (
            <div className="rivalry-incoming" key={challenge.id}>
              <div>
                <strong>{challenge.from.login} challenges your community</strong>
                <p>Neutral core · Relay Garden · first to 3 · 60 seconds</p>
              </div>
              <div className="rivalry-actions">
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    void command(`/api/rivalry/challenges/${challenge.id}`, { action: 'accept' })
                  }
                >
                  Accept {challenge.from.login}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() =>
                    void command(`/api/rivalry/challenges/${challenge.id}`, { action: 'decline' })
                  }
                >
                  Decline {challenge.from.login}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <button className="secondary-button" onClick={connect}>
          <Radio size={14} />
          Connect Twitch to challenge
        </button>
      )}
      <p className="rivalry-local-note">
        Local preview: use separate browser profiles for the two Twitch accounts on this computer.
        Remote invitations need a hosted server; this localhost build is not reachable from another
        streamer’s computer.
      </p>
    </section>
  );
}
