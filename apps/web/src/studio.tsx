import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Layers3,
  LoaderCircle,
  Maximize2,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Swords,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import type { StudioState, Trial, World } from '@chorusborn/contracts';
import { Arena, ChampionPortrait } from './arena.js';
import { roundPressure } from './game/presentation.js';
import { inspectPlaybook } from './game/playbook-inspection.js';
import { describeCondition } from './lesson.js';
import { RivalryPanel } from './rivalry-panel.js';
import { ChatQueue } from './chat-queue.js';
import { GuideShare, ViewerReminder } from './viewer/reminder.js';

const isLocalStudio = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'The request could not be completed.');
  return data as T;
}

function useStudio() {
  const [state, setState] = useState<StudioState | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'online' | 'reconnecting'>(
    'connecting',
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 500;
    const connect = async () => {
      try {
        const value = await request<StudioState>('/api/demo/state');
        if (!active) return;
        setState(value);
        setError(null);
        socket = new WebSocket(
          `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/demo`,
        );
        socket.onopen = () => {
          if (active) {
            setConnection('online');
            delay = 500;
          }
        };
        socket.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            if (active && packet.type === 'state') setState(packet.state);
          } catch {
            if (active) setError('Received an unreadable arena update. Reconnect the studio.');
          }
        };
        socket.onclose = () => {
          if (active) {
            setConnection('reconnecting');
            retry = setTimeout(connect, delay);
            delay = Math.min(delay * 2, 5000);
          }
        };
        socket.onerror = () => {
          if (active) setConnection('reconnecting');
        };
      } catch (cause) {
        if (active) {
          setError((cause as Error).message);
          setConnection('reconnecting');
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 5000);
        }
      }
    };
    void connect();
    return () => {
      active = false;
      clearTimeout(retry);
      socket?.close();
    };
  }, []);
  return { state, setState, connection, error, setError };
}

function Mark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path
        d="M27 12a12 12 0 1 0 0 16m-4-12a6 6 0 1 0 0 8"
        fill="none"
        stroke="#172119"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Scoreboard({ world, rivalry = false }: { world: World; rivalry?: boolean }) {
  const seconds = Math.max(0, 60 - Math.floor(world.tick / 20));
  const pressure = roundPressure(world);
  return (
    <div className="scoreboard" role="group" aria-label="Round scoreboard">
      <div className="team-label violet">
        <span className="team-icon">
          <ChampionPortrait />
        </span>
        <span>
          {world.champions[0].name.toUpperCase()}
          <small>
            {rivalry ? `Streamer · v${world.champions[0].playbook.version}` : 'Your champion'}
          </small>
        </span>
      </div>
      <div className="score-center">
        <div>
          <b>{world.champions[0].score}</b>
          <span>:</span>
          <b>{world.champions[1].score}</b>
        </div>
        <small>
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')} <i />{' '}
          {world.status === 'finished' ? 'FINAL' : world.status.toUpperCase()}
        </small>
      </div>
      {pressure ? <span className="round-pressure">{pressure}</span> : null}
      <div className="team-label amber">
        <span>
          {world.champions[1].name.toUpperCase()}
          <small>
            {rivalry ? `Streamer · v${world.champions[1].playbook.version}` : 'Baseline opponent'}
          </small>
        </span>
        <span className="team-icon">
          <ChampionPortrait team="b" color="#e4a348" />
        </span>
      </div>
    </div>
  );
}

function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={ref}
      onCancel={close}
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal-header">
        <div>
          <span className="eyebrow">CHORUSBORN LAB</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TrialView({
  trial,
  activeVersion,
  onAdopt,
  adopting,
}: {
  trial: Trial;
  activeVersion: number;
  onAdopt: () => void;
  adopting: boolean;
}) {
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false);
  const max = Math.max(trial.baseline.frames.length, trial.candidateBranch.frames.length) - 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setFrame((value) => {
          if (value >= max) {
            setPlaying(false);
            return max;
          }
          return value + 1;
        }),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, max]);
  const before = trial.baseline.frames[Math.min(frame, trial.baseline.frames.length - 1)]!;
  const after =
    trial.candidateBranch.frames[Math.min(frame, trial.candidateBranch.frames.length - 1)]!;
  const stale = activeVersion !== trial.baseVersion;
  return (
    <>
      <p className="modal-intro">
        {trial.candidate.summary}
        {trial.author ? ` · Taught by ${trial.author}` : ' · Authored sample'}
      </p>
      <div className="comparison-grid">
        <div className="branch">
          <div className="branch-title">
            <span className="eyebrow">CURRENT PLAYBOOK</span>
            <span>v{trial.baseVersion}</span>
          </div>
          <Arena
            world={before}
            label="Current playbook branch"
            mode="replay"
            interactive={false}
            animate={playing}
          />
          <div className="branch-stats">
            <span>
              <b>{trial.baseline.score}</b> captures
            </span>
            <span>
              <b>{trial.baseline.damage}</b> damage taken
            </span>
          </div>
        </div>
        <div className="branch candidate">
          <div className="branch-title">
            <span className="eyebrow">WITH YOUR LESSON</span>
            <span>Candidate</span>
          </div>
          <Arena
            world={after}
            label="Candidate lesson branch"
            mode="replay"
            interactive={false}
            animate={playing}
          />
          <div className="branch-stats">
            <span>
              <b>{trial.candidateBranch.score}</b> captures
            </span>
            <span>
              <b>{trial.candidateBranch.damage}</b> damage taken
            </span>
          </div>
        </div>
      </div>
      <div className="replay-controls">
        <button
          className="icon-button"
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          onClick={() => {
            if (frame >= max) setFrame(0);
            setPlaying((value) => !value);
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <input
          aria-label="Replay timeline"
          type="range"
          min="0"
          max={max}
          value={frame}
          onChange={(event) => {
            setPlaying(false);
            setFrame(Number(event.target.value));
          }}
        />
        <span>5× playback</span>
        <button
          className="icon-button"
          aria-label="Restart replay"
          onClick={() => {
            setFrame(0);
            setPlaying(false);
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="evidence-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Same starting state. One changed playbook.</strong>
          <p>
            {trial.scenario === 'neutral'
              ? 'Neutral opening · replay shows your initiative first'
              : 'Carrier fixture'}{' '}
            · opponent {trial.opponent.name} v{trial.opponent.version} · seed {trial.seed} · tick{' '}
            {trial.sourceTick} · {trial.sourceHash.slice(0, 12)}. Results cover this scenario only;
            broader evaluation is still to come. Rule-use receipts: {trial.candidateBranch.ruleUses}
            .
          </p>
        </div>
      </div>
      {trial.paired ? (
        <div className="evidence-note">
          <div>
            <strong>Both starting initiatives tested</strong>
            <p>
              Your initiative first: current {trial.baseline.score} → candidate{' '}
              {trial.candidateBranch.score} captures.
            </p>
            <p>
              Opponent initiative first: current {trial.paired.baseline.score} → candidate{' '}
              {trial.paired.candidateBranch.score} captures.
            </p>
            <p>
              Total across both starts: current {trial.baseline.score + trial.paired.baseline.score}{' '}
              → candidate {trial.candidateBranch.score + trial.paired.candidateBranch.score}{' '}
              captures. Second source: {trial.paired.sourceHash.slice(0, 12)}. The replay above
              shows the first start only.
            </p>
          </div>
        </div>
      ) : null}
      <div className="modal-footer">
        <span>
          {trial.adopted
            ? 'Adopted. Reset the arena to use the new playbook.'
            : stale
              ? 'Playbook changed. Run a new trial before adopting.'
              : 'Your current round keeps its pinned playbook.'}
        </span>
        <button
          className="primary-button"
          disabled={trial.adopted || stale || adopting}
          onClick={onAdopt}
        >
          {adopting ? (
            <LoaderCircle size={16} className="spin" />
          ) : trial.adopted ? (
            <Check size={16} />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {trial.adopted ? 'Lesson adopted' : 'Adopt for next round'}
        </button>
      </div>
    </>
  );
}

export function App() {
  const { state, setState, connection, error, setError } = useStudio();
  const [tab, setTab] = useState<'studio' | 'playbook' | 'trials'>('studio');
  const [selected, setSelected] = useState('core-discipline');
  const [scenario, setScenario] = useState<'carrier' | 'neutral'>('carrier');
  const [orderBusy, setOrderBusy] = useState(false);
  const [busy, setBusy] = useState(false),
    [adopting, setAdopting] = useState(false);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [settings, setSettings] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const connectHandled = useRef(false);
  useEffect(() => {
    if (!state || connectHandled.current) return;
    const query = new URLSearchParams(location.search);
    const result = query.get('twitch');
    const connect = query.get('connect') === 'twitch';
    if (!result && !connect) return;
    connectHandled.current = true;
    history.replaceState(null, '', location.pathname);
    setSettings(true);
    if (connect) {
      if (state.twitch.configured) location.assign('/auth/twitch/start');
      else
        setConnectionNotice('Add the Twitch app credentials to .env and restart the server first.');
    } else {
      setConnectionNotice(
        result === 'connected' && state.twitch.status === 'authenticated'
          ? 'Twitch account verified. The lesson queue shows the current chat connection status.'
          : result === 'denied'
            ? 'Twitch sign-in was cancelled. Your local champion is still available.'
            : result === 'wrong-channel'
              ? 'This studio belongs to a different Twitch channel. Reconnect its owner, or use a separate browser profile for another streamer.'
              : 'Twitch sign-in did not complete. Try connecting again from this studio.',
      );
    }
  }, [state]);
  const disconnectTwitch = async () => {
    setDisconnecting(true);
    try {
      const result = await request<{ state: StudioState; revoked: boolean }>(
        '/api/twitch/disconnect',
        {},
      );
      setState(result.state);
      setConnectionNotice(
        result.revoked
          ? 'Twitch disconnected.'
          : 'Disconnected locally. Twitch could not confirm revocation; remove Chorusborn in Twitch Settings → Connections if needed.',
      );
    } catch (cause) {
      setConnectionNotice((cause as Error).message);
    } finally {
      setDisconnecting(false);
    }
  };
  const chatCommand = async (path: string, body: unknown) => {
    try {
      setState(await request<StudioState>(path, body));
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const perform = useCallback(
    async (action: 'pause' | 'resume' | 'reset' | 'rematch') => {
      setControlBusy(true);
      try {
        setState(await request<StudioState>('/api/demo/controls', { action }));
        setError(null);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setControlBusy(false);
      }
    },
    [setState, setError],
  );
  const moveRule = async (index: number, direction: number) => {
    if (!state || orderBusy) return;
    const ruleIds = state.playbook.rules.map((r) => r.id);
    const target = index + direction;
    if (target < 0 || target >= ruleIds.length) return;
    [ruleIds[index], ruleIds[target]] = [ruleIds[target]!, ruleIds[index]!];
    setOrderBusy(true);
    try {
      setState(
        await request<StudioState>('/api/demo/playbook/order', {
          expectedVersion: state.playbook.version,
          ruleIds,
        }),
      );
      setTrial(null);
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setOrderBusy(false);
    }
  };
  const prove = async (proposalId?: string) => {
    setBusy(true);
    setError(null);
    try {
      setTrial(
        await request<Trial>(
          '/api/demo/trials',
          proposalId ? { proposalId, scenario } : { sampleId: selected, scenario },
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!trial?.source || !state) return;
    const source = state.intake.proposals.find((item) => item.id === trial.source!.proposalId);
    if (
      !source ||
      ['removed', 'rejected'].includes(source.status) ||
      source.compilation?.id !== trial.source.compilationId
    )
      setTrial(null);
  }, [state, trial]);
  const adopt = async () => {
    if (!trial || !state) return;
    setAdopting(true);
    try {
      const next = await request<StudioState>('/api/demo/adoptions', {
        trialId: trial.id,
        expectedVersion: state.playbook.version,
      });
      setState(next);
      setTrial({ ...trial, adopted: true });
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setAdopting(false);
    }
  };
  const openLastTrial = async () => {
    if (!state?.latestTrial) return;
    try {
      setTrial(await request<Trial>(`/api/demo/trials/${state.latestTrial.id}`));
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const world = state?.world;
  const ownActor = world?.champions.find((c) => c.id === state?.selfActor);
  const championName = state?.championName ?? 'Mica';
  const ruleInspection = state
    ? inspectPlaybook(state.playbook, ownActor?.playbook, world?.metrics[state.selfActor].ruleUses)
    : [];
  const nextRound = world && state.playbook.version !== ownActor?.playbook.version;
  const receipts =
    world?.decisions
      .filter(
        (item) =>
          item.actorId === state?.selfActor &&
          item.ruleId &&
          (item.executed || item.abilityExecuted),
      )
      .slice(-3) ?? [];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Chorusborn home">
          <Mark />
          <span>
            chorusborn<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">C</span>
          <span>
            Creator workspace
            <small>{isLocalStudio ? 'Local development lab' : 'Community champion lab'}</small>
          </span>
          <ChevronRight size={15} />
        </div>
        <p className="nav-caption">YOUR STUDIO</p>
        <nav aria-label="Studio navigation">
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}>
            <Layers3 size={18} />
            Training grounds
            <span className="nav-indicator" />
          </button>
          <button className={tab === 'playbook' ? 'active' : ''} onClick={() => setTab('playbook')}>
            <BookOpen size={18} />
            Playbook<span className="nav-count">{state?.playbook.rules.length ?? 0}</span>
          </button>
          <button className={tab === 'trials' ? 'active' : ''} onClick={() => setTab('trials')}>
            <FlaskConical size={18} />
            Replay lab
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-icon">
            <Users size={18} />
          </span>
          <h3>
            A champion.
            <br />A thousand teachers.
          </h3>
          <p>The best next move could come from anyone.</p>
          <button onClick={() => setSettings(true)}>
            About this build <ArrowUpRight size={14} />
          </button>
        </div>
        <a className="combat-lab-link" href="/guide" target="_blank" rel="noreferrer">
          <BookOpen size={16} /> How to play <ArrowUpRight size={13} />
        </a>
        <a className="combat-lab-link" href="/combat-lab">
          <Swords size={16} /> Combat lab <ArrowUpRight size={13} />
        </a>
        <div className="sidebar-bottom">
          <button onClick={() => setSettings(true)}>
            <Settings2 size={17} />
            Connections & setup
          </button>
          <a href="https://github.com/simiyu-samuel/chorusborn" target="_blank" rel="noreferrer">
            <Terminal size={17} />
            View the build <ArrowUpRight size={13} />
          </a>
          <div className="profile">
            <span>LC</span>
            <div>
              {state?.twitch.channel?.login ?? 'Demo coach'}
              <small>
                {state?.twitch.status === 'authenticated'
                  ? 'Twitch account verified'
                  : 'Fixture workspace'}
              </small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="muted">Workspace</span>
            <ChevronRight size={13} />
            <span>Champion studio</span>
          </div>
          <div>
            <span className={`connection ${connection === 'online' ? 'connected' : ''}`}>
              <i />
              {connection === 'online'
                ? 'Engine connected'
                : connection === 'connecting'
                  ? 'Connecting…'
                  : 'Reconnecting…'}
            </span>
            <button
              className="icon-button help-button"
              onClick={() => setSettings(true)}
              aria-label="About this build"
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">RAISED BY CHAT. PROVEN IN THE ARENA.</div>
              <h1>
                {tab === 'studio'
                  ? 'Great minds play together.'
                  : tab === 'playbook'
                    ? 'A little wiser. Together.'
                    : 'Good advice deserves proof.'}
              </h1>
              <p>
                {tab === 'studio'
                  ? 'Meet your champion. Find a better move. See what sticks.'
                  : tab === 'playbook'
                    ? 'Every accepted lesson becomes part of your champion’s playbook.'
                    : 'Compare the same moment with two different playbooks.'}
              </p>
            </div>
            <a
              className={`secondary-button ${!state ? 'disabled' : ''}`}
              href={state?.overlayPath ?? '#'}
              target="_blank"
              rel="noreferrer"
            >
              <MonitorPlay size={16} />
              Open overlay
              <ArrowUpRight size={14} />
            </a>
          </div>
          {error ? (
            <div className="error-banner" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          <div className="fixture-banner">
            <FlaskConical size={15} />
            <span>
              <strong>Sample replay lab</strong> · Sample tactics and a fixture arena.{' '}
              {state?.twitch.status === 'authenticated'
                ? state.intake.status === 'live'
                  ? state.compiler.configured
                    ? 'Live Twitch lessons and the Groq compiler are connected.'
                    : 'Live Twitch lessons are collected below. Configure Groq to compile them.'
                  : 'Twitch account verified. Check the lesson queue for connection status.'
                : state?.compiler.configured
                  ? 'Groq compiler ready. Connect Twitch to teach from chat.'
                  : 'Twitch and the language compiler are not connected.'}
            </span>
            <button onClick={() => setSettings(true)}>
              Build status
              <ArrowUpRight size={13} />
            </button>
          </div>
          {tab === 'studio' ? (
            <>
              {state ? (
                <RivalryPanel state={state} update={setState} connect={() => setSettings(true)} />
              ) : null}
              <GuideShare />
              <section className="proof-scenario">
                <label htmlFor="proof-scenario">Lesson test scenario</label>
                <select
                  id="proof-scenario"
                  value={scenario}
                  onChange={(event) => setScenario(event.target.value as 'carrier' | 'neutral')}
                >
                  <option value="carrier">Carrier dilemma · starts with the core</option>
                  <option value="neutral">Neutral opening · both starting initiatives</option>
                </select>
                <p>
                  {scenario === 'neutral'
                    ? 'Tests retrieval from both homes, twice with opposite initiative. Uses your rival’s locked book when a rivalry is attached; otherwise the baseline.'
                    : 'Tests delivery from the authored carrier fixture. Choose neutral opening to test retrieval.'}
                </p>
              </section>
              {state ? (
                <ChatQueue
                  state={state}
                  connect={() => setSettings(true)}
                  command={chatCommand}
                  prove={prove}
                />
              ) : null}
              <div className="studio-grid">
                <section className="arena-card">
                  <div className="card-heading">
                    <div>
                      <span className="live-square" />
                      {state?.mode === 'rivalry' ? 'THE RIVALRY ARENA' : 'THE TRAINING GROUNDS'}
                    </div>
                    <span className="mode-chip">
                      Core Run <span>·</span> {state?.mode === 'rivalry' ? 'Rivalry' : 'Training'}
                    </span>
                  </div>
                  {world ? (
                    <>
                      <p className="sr-only" role="status">
                        {world.status === 'finished'
                          ? world.winner === 'draw'
                            ? 'Round drawn. Final score ' +
                              world.champions.map((c) => c.score).join(' to ')
                            : `${world.champions.find((c) => c.id === world.winner)?.name} wins the round.`
                          : world.status === 'paused'
                            ? 'Round paused.'
                            : 'Round running.'}
                      </p>
                      <Scoreboard world={world} rivalry={state?.mode === 'rivalry'} />
                      <div className="arena-stage">
                        <div className="arena-corner">
                          <span className="small-dot" />
                          CARRIER DILEMMA<span>SCENARIO 01</span>
                        </div>
                        <Arena
                          world={world}
                          mode={state?.mode === 'rivalry' ? 'rivalry' : 'training'}
                          suspended={trial !== null}
                        />
                        {world.status === 'paused' ? (
                          <div className="stage-state">
                            <Pause size={11} />
                            Arena paused
                          </div>
                        ) : world.status === 'finished' ? (
                          <div className="stage-state finished">
                            <Swords size={12} />
                            {world.winner === 'draw'
                              ? 'Round drawn'
                              : `${world.champions.find((c) => c.id === world.winner)?.name} wins the round`}
                          </div>
                        ) : null}
                      </div>
                      <div className="arena-toolbar">
                        <div>
                          <button
                            className="primary-button"
                            disabled={
                              controlBusy || connection !== 'online' || state?.mode === 'rivalry'
                            }
                            onClick={() =>
                              void perform(
                                world.status === 'running'
                                  ? 'pause'
                                  : world.status === 'finished'
                                    ? 'rematch'
                                    : 'resume',
                              )
                            }
                          >
                            {world.status === 'running' ? <Pause size={15} /> : <Play size={15} />}
                            {state?.mode === 'rivalry'
                              ? 'Use rivalry controls above'
                              : world.status === 'running'
                                ? 'Pause round'
                                : world.status === 'finished'
                                  ? 'Play again'
                                  : 'Start round'}
                          </button>
                          <button
                            className="icon-button reset-button"
                            disabled={
                              controlBusy || connection !== 'online' || state?.mode === 'rivalry'
                            }
                            onClick={() => void perform('reset')}
                            aria-label="Reset arena for next round"
                          >
                            <RotateCcw size={17} />
                          </button>
                          <span className="round-book">
                            Round v{ownActor?.playbook.version}
                            {nextRound ? <em>v{state.playbook.version} ready next round</em> : null}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          onClick={() =>
                            state && window.open(state.overlayPath, '_blank', 'noopener,noreferrer')
                          }
                          aria-label="Open full arena overlay"
                        >
                          <Maximize2 size={17} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="loading-state">
                      <LoaderCircle className="spin" size={24} />
                      <p>Opening your training grounds…</p>
                    </div>
                  )}
                </section>
                <section className="lesson-bench">
                  <div className="bench-heading">
                    <span className="eyebrow">THINK TOGETHER</span>
                    <h2>
                      The lesson bench<span>{state?.samples.length ?? 3}</span>
                    </h2>
                    <p>A good idea is only the beginning.</p>
                  </div>
                  <div className="sample-caption">
                    <span>SAMPLE TACTICS</span>
                    <span>LOCAL FIXTURES</span>
                  </div>
                  <div className="sample-list">
                    {state?.samples.map((item, i) => (
                      <button
                        key={item.id}
                        className={`lesson-option ${selected === item.id ? 'selected' : ''}`}
                        onClick={() => setSelected(item.id)}
                        aria-pressed={selected === item.id}
                      >
                        <div className="lesson-option-top">
                          <span className={`lesson-avatar avatar-${i}`}>
                            {i === 0 ? (
                              <ArrowDownLeft size={16} />
                            ) : i === 1 ? (
                              <ShieldCheck size={16} />
                            ) : (
                              <Swords size={16} />
                            )}
                          </span>
                          <span>{item.category}</span>
                          <span className="radio-dot" />
                        </div>
                        <h3>{item.title}</h3>
                        <p>“{item.text}”</p>
                        <div className="lesson-option-bottom">
                          <span>Authored sample</span>
                          <span>{item.candidate.rules.length} rule</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="bench-footer">
                    <p>
                      <ShieldCheck size={14} />
                      Test it first. You decide what stays.
                    </p>
                    <button
                      className="primary-button full-width"
                      disabled={busy || !state || connection !== 'online'}
                      onClick={() => void prove()}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <FlaskConical size={16} />
                      )}
                      {busy ? 'Simulating both playbooks…' : 'Prove this lesson'}
                      {!busy ? <ArrowRight size={16} /> : null}
                    </button>
                  </div>
                </section>
              </div>
              <div className="bottom-grid">
                <section className="champion-card">
                  <div className="champion-profile">
                    <div className="portrait-backdrop">
                      <ChampionPortrait
                        team={state?.selfActor ?? 'a'}
                        color={state?.selfActor === 'b' ? '#e4a348' : '#b7a0fb'}
                      />
                    </div>
                    <div>
                      <span className="eyebrow">YOUR CHAMPION</span>
                      <h2>
                        {championName}
                        <span className="small-tag">v{state?.playbook.version ?? 0}</span>
                      </h2>
                      <p>A work in progress. A team effort.</p>
                    </div>
                  </div>
                  <div className="champion-stats">
                    <div>
                      <strong>{state?.playbook.rules.length ?? 0}</strong>
                      <span>learned tactics</span>
                    </div>
                    <div>
                      <strong>
                        {world
                          ? Object.values(world.metrics[state?.selfActor ?? 'a'].ruleUses).reduce(
                              (a, b) => a + b,
                              0,
                            )
                          : 0}
                      </strong>
                      <span>lesson uses this round</span>
                    </div>
                    <button className="text-button" onClick={() => setTab('playbook')}>
                      View playbook
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="receipts-card">
                  <div className="mini-heading">
                    <span>
                      <Radio size={15} />
                      THE PAPER TRAIL
                    </span>
                    <span className="small-tag">Engine receipts</span>
                  </div>
                  {receipts.length ? (
                    <div className="receipt-list">
                      {receipts.map((item, i) => (
                        <div key={`${item.tick}-${i}`}>
                          <span className="receipt-dot" />
                          <p>
                            <strong>{item.label}</strong>
                            <small>
                              {item.author} · tick {item.tick} · actual rule execution
                            </small>
                          </p>
                          <Check size={13} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-receipts">
                      <div className="receipt-symbol">
                        <Sparkles size={19} />
                      </div>
                      <p>
                        Teach a little. Leave a mark.
                        <small>Adopt a lesson, reset the arena, and watch for its first use.</small>
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : tab === 'playbook' ? (
            <section className="detail-card">
              <div className="detail-heading">
                <BookOpen size={22} />
                <div>
                  <h2>
                    {championName}’s playbook{' '}
                    <span className="small-tag">v{state?.playbook.version ?? 0}</span>
                  </h2>
                  <p>
                    Newest lessons run first. The first applicable rule controls the move; the fixed
                    baseline handles the rest. More lessons do not add speed or strength. Move rules
                    up/down to save a new version for the next round; the active round stays locked.
                  </p>
                </div>
              </div>
              {state?.playbook.rules.length ? (
                state.playbook.rules.map((rule, i) => (
                  <div className="playbook-rule" key={rule.id}>
                    <span className="rule-number">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{rule.label}</h3>
                      <p>
                        {rule.when.all
                          .map((condition) => describeCondition(condition, championName))
                          .join(' AND ')}
                      </p>
                      <span>
                        {rule.intent.goal.replaceAll('_', ' ')} · {rule.intent.route} route ·{' '}
                        {rule.intent.ability === 'none'
                          ? 'no ability request'
                          : rule.intent.ability}
                      </span>
                      <small>Contributed in the local lab · {rule.author}</small>
                      <small>
                        {ruleInspection[i]?.uses === null
                          ? 'Not in this round’s locked book'
                          : `Executed ${ruleInspection[i]?.uses ?? 0} times this round`}
                      </small>
                      {ruleInspection[i]?.duplicateOf !== undefined ? (
                        <small>
                          Repeats rule {String(ruleInspection[i]!.duplicateOf).padStart(2, '0')};
                          adds no new behavior. The earlier rule takes priority.
                        </small>
                      ) : ruleInspection[i]?.shadowedBy !== undefined ? (
                        <small role="note">
                          Blocked by higher-priority rule{' '}
                          {String(ruleInspection[i]!.shadowedBy).padStart(2, '0')} with matching or
                          broader conditions for the same goal. Move this rule up to give it
                          priority.
                        </small>
                      ) : null}
                    </div>
                    <div className="rule-order" aria-label={`Priority for rule ${i + 1}`}>
                      <button
                        className="icon-button"
                        aria-label={`Move rule ${i + 1} up`}
                        disabled={orderBusy || i === 0}
                        onClick={() => void moveRule(i, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Move rule ${i + 1} down`}
                        disabled={orderBusy || i === state.playbook.rules.length - 1}
                        onClick={() => void moveRule(i, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-detail">
                  <ChampionPortrait />
                  <h3>The first chapter is yours.</h3>
                  <p>
                    Prove a sample tactic in the training grounds, then adopt it to begin{' '}
                    {championName}’s playbook.
                  </p>
                  <button className="primary-button" onClick={() => setTab('studio')}>
                    Find a better move
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="detail-card">
              <div className="detail-heading">
                <FlaskConical size={22} />
                <div>
                  <h2>The replay lab</h2>
                  <p>Change a playbook. Keep the starting state.</p>
                </div>
              </div>
              {state?.latestTrial ? (
                <div className="saved-trial">
                  <span className="eyebrow">LATEST LOCAL EXPERIMENT</span>
                  <h3>{state.latestTrial.candidate.summary}</h3>
                  <p>
                    Fixture seed {state.latestTrial.seed} · base v{state.latestTrial.baseVersion} ·{' '}
                    {state.latestTrial.adopted ? 'Adopted' : 'Awaiting coach review'}
                  </p>
                  <button className="primary-button" onClick={() => void openLastTrial()}>
                    Open comparison
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="empty-detail">
                  <FlaskConical size={44} />
                  <h3>Let’s put an idea to the test.</h3>
                  <p>
                    Choose a sample lesson to compare two complete simulations from the same fixture
                    state.
                  </p>
                  <button className="primary-button" onClick={() => setTab('studio')}>
                    Choose a lesson
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="page-footer">
            <span>
              <span className="small-dot" />
              Chorusborn / build 0.1
            </span>
            <span>
              Raised by chat. Proven in the arena.<span className="footer-star">✳</span>
            </span>
          </footer>
        </div>
      </main>
      {trial ? (
        <Modal title="A better move, put to the test." wide close={() => setTrial(null)}>
          <TrialView
            key={trial.id}
            trial={trial}
            activeVersion={state?.playbook.version ?? 0}
            onAdopt={() => void adopt()}
            adopting={adopting}
          />
          {error ? (
            <p className="modal-error" role="alert">
              {error}
            </p>
          ) : null}
        </Modal>
      ) : null}
      {settings ? (
        <Modal title="A clear view of the build." close={() => setSettings(false)}>
          <p className="modal-intro">This is the working Chorusborn prototype.</p>
          <section className="twitch-connection" aria-label="Twitch connection">
            <div className="detail-heading">
              <Radio size={22} />
              <div>
                <h2>
                  {state?.twitch.status === 'authenticated'
                    ? `Connected as ${state.twitch.channel?.login}`
                    : state?.twitch.status === 'reconnect-required'
                      ? 'Reconnect Twitch'
                      : state?.twitch.status === 'validation-unavailable'
                        ? 'Twitch verification unavailable'
                        : 'Bring your community in'}
                </h2>
                <p>
                  {state?.twitch.channel
                    ? state.intake.message
                    : 'Connect your own Twitch broadcaster account. Each streamer uses their own browser profile.'}
                </p>
              </div>
            </div>
            {connectionNotice ? (
              <p className="connection-notice" role="status">
                {connectionNotice}
              </p>
            ) : null}
            {!state?.twitch.configured ? (
              <p className="settings-note">
                Enter TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in the local .env file, then restart
                the server. Credentials stay on this machine.
              </p>
            ) : null}
            {state?.twitch.channel ? (
              <button
                className="secondary-button"
                disabled={disconnecting}
                onClick={() => void disconnectTwitch()}
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect Twitch'}
              </button>
            ) : state?.twitch.connectUrl ? (
              <a className="primary-button" href={state.twitch.connectUrl}>
                Connect Twitch
                <ArrowUpRight size={16} />
              </a>
            ) : (
              <button className="primary-button" disabled>
                Connect Twitch
              </button>
            )}
            <p className="settings-note">
              Requests chat-read access only. No chat messages are sent.{' '}
              {isLocalStudio
                ? 'This local build keeps Twitch tokens in server memory; restart requires sign-in again.'
                : 'Hosted sessions are encrypted in private storage and revalidated on recovery. Recovered matches pause before play resumes.'}
            </p>
          </section>
          <div className="build-status">
            <p>
              <Check size={16} />
              <span>Server-owned arena and live state stream</span>
            </p>
            <p>
              <Check size={16} />
              <span>Exact snapshot comparison and action receipts</span>
            </p>
            <p>
              <Check size={16} />
              <span>Coach adoption, pinned rounds and persistent playbooks</span>
            </p>
            <p>
              <Radio size={16} />
              <span>Twitch sign-in, EventSub lesson intake, and chat moderation</span>
            </p>
            <p className="pending">
              <Sparkles size={16} />
              <span>Groq lesson compiler available · broader evaluation upcoming</span>
            </p>
          </div>
          <p className="settings-note">
            Sample lessons are authored fixtures.{' '}
            {isLocalStudio
              ? 'This local server saves playbooks on this machine; active rounds and trials are session data.'
              : 'This hosted prototype saves encrypted playbook, session and arena checkpoints in private storage. Recovery pauses running rounds; recent uncommitted ticks or chat events may be lost.'}
          </p>
          <a
            className="secondary-button"
            href="https://github.com/simiyu-samuel/chorusborn"
            target="_blank"
            rel="noreferrer"
          >
            Follow the source
            <ArrowUpRight size={14} />
          </a>
        </Modal>
      ) : null}
    </div>
  );
}

export function Overlay() {
  const [mode, setMode] = useState<'local-fixture' | 'rivalry'>('local-fixture');
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    let active = true,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      try {
        const result = await request<{ world: World; mode: 'local-fixture' | 'rivalry' }>(
          `/api/demo/overlay?${query}`,
        );
        if (!active) return;
        setWorld(result.world);
        setMode(result.mode);
        setError(null);
        socket = new WebSocket(
          `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/demo?${query}`,
        );
        socket.onopen = () => {
          if (active) setOnline(true);
        };
        socket.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            if (active && packet.type === 'overlay') {
              setWorld(packet.world);
              setMode(packet.mode ?? 'local-fixture');
            }
          } catch {
            if (active) setError('Unreadable overlay update.');
          }
        };
        socket.onclose = () => {
          if (active) {
            setOnline(false);
            retry = setTimeout(connect, 1500);
          }
        };
      } catch (cause) {
        if (active) {
          setError((cause as Error).message);
          retry = setTimeout(connect, 3000);
        }
      }
    };
    void connect();
    return () => {
      active = false;
      clearTimeout(retry);
      socket?.close();
    };
  }, []);
  return (
    <main className="overlay">
      <div className="overlay-brand">
        <Mark />
        <strong>chorusborn.</strong>
        <span>
          {mode === 'rivalry' ? 'LOCAL RIVALRY' : 'LOCAL FIXTURE'} · READ-ONLY{' '}
          {online ? '' : '· RECONNECTING'}
        </span>
      </div>
      <ViewerReminder />
      {error ? <p role="alert">{error}</p> : null}
      {!online && world ? (
        <div className="broadcast-stale" role="status">
          <Radio size={14} /> Signal interrupted · showing last received state
        </div>
      ) : null}
      {world ? (
        <>
          <Scoreboard world={world} rivalry={mode === 'rivalry'} />
          <Arena
            world={world}
            interactive={false}
            animate={online}
            mode={mode === 'rivalry' ? 'rivalry' : 'training'}
          />
        </>
      ) : (
        <p>Opening the arena…</p>
      )}
    </main>
  );
}
