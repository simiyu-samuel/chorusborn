import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Leaf, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { World } from '@chorusborn/contracts';
import { ArenaFallback } from './game/arena-fallback.js';
import { coreContested, intentCue, recentEvents, visibleLesson } from './game/presentation.js';
import { RoundResult } from './game/round-result.js';
import { useArenaSound } from './game/sound.js';
export { ChampionPortrait } from './game/champion-portrait.js';
const GameScene = lazy(() => import('./game/scene.js'));

export class GraphicsBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onUnavailable: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
let webGLSupported: boolean | undefined;
export function canUseWebGL() {
  if (webGLSupported !== undefined) return webGLSupported;
  try {
    const canvas = document.createElement('canvas'),
      context = canvas.getContext('webgl2');
    if (!context) return (webGLSupported = false);
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return (webGLSupported = true);
  } catch {
    return (webGLSupported = false);
  }
}
function useVisualSettings() {
  const [reducedMotion, setMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [lowEffects, setLow] = useState(() => {
    try {
      const stored = localStorage.getItem('chorusborn.low-effects');
      return stored === null ? window.matchMedia('(max-width: 640px)').matches : stored === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setMotion(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  const toggleLow = () =>
    setLow((value) => {
      try {
        localStorage.setItem('chorusborn.low-effects', String(!value));
      } catch {
        /* Private browsing can disable storage. */
      }
      return !value;
    });
  return { reducedMotion, setMotion, lowEffects, toggleLow };
}
export function Arena({
  world,
  label = 'Core Run arena',
  interactive = true,
  animate = true,
  mode = 'training',
  suspended = false,
}: {
  world: World;
  label?: string;
  interactive?: boolean;
  animate?: boolean;
  mode?: 'training' | 'replay' | 'rivalry';
  suspended?: boolean;
}) {
  const [available, setAvailable] = useState(canUseWebGL),
    [ready, setReady] = useState(false);
  const settings = useVisualSettings(),
    sound = useArenaSound(world, interactive && !suspended);
  const reducedMotion = settings.reducedMotion;
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  const unavailable = useCallback(() => setAvailable(false), []),
    renderReady = useCallback(() => setReady(true), []);
  const capture = recentEvents(world, 20).findLast((e) => e.type === 'capture');
  const lesson = visibleLesson(world, mode === 'rivalry' ? 'both' : 'a');
  const contested = coreContested(world);
  const summary = `${label}. ${world.champions[0].name} ${world.champions[0].score}, ${world.champions[1].name} ${world.champions[1].score}. ${world.status}. ${world.core.carrier === null ? (contested ? 'Core contested. Equal claims; neither champion has possession.' : 'Core available.') : `${world.champions.find((c) => c.id === world.core.carrier)?.name} carrying core.`}`;
  const fallback = (
    <div className="graphics-fallback">
      <ArenaFallback world={world} label={label} reducedMotion={reducedMotion} />
      <span>Compatibility view · 3D graphics unavailable</span>
    </div>
  );
  return (
    <div
      className="game-view"
      data-renderer={suspended ? 'suspended' : available && ready ? 'webgl' : 'compatibility'}
      data-fighter-kit="acrobat-v1"
      data-motion={reducedMotion || !animate ? 'reduced' : 'full'}
    >
      <div className="arena-presentation">
        <div className="game-viewport" role="img" aria-label={summary}>
          {suspended ? (
            <div className="graphics-loading">Replay open</div>
          ) : available ? (
            <GraphicsBoundary fallback={fallback} onUnavailable={unavailable}>
              <Suspense fallback={<div className="graphics-loading">Opening Relay Garden…</div>}>
                <GameScene
                  world={world}
                  animate={animate}
                  reducedMotion={reducedMotion}
                  lowEffects={settings.lowEffects || mode === 'replay'}
                  markers={markers}
                  onReady={renderReady}
                  onUnavailable={unavailable}
                />
              </Suspense>
            </GraphicsBoundary>
          ) : (
            fallback
          )}
          {available && !suspended ? (
            <div className="game-markers" aria-hidden="true">
              {world.champions.map((actor, index) => (
                <div
                  key={actor.id}
                  ref={(element) => {
                    markers.current[index] = element;
                  }}
                  className={`game-marker team-${actor.id}`}
                >
                  <strong>
                    <i className={actor.id === 'a' ? 'diamond' : 'hex'} />
                    {actor.name}
                    {world.core.carrier === actor.id ? <b className="carrier-mark">◆</b> : null}
                  </strong>
                  <span className="game-health">
                    <i style={{ width: `${actor.health}%` }} />
                  </span>
                  {actor.shieldUntil > world.tick ? (
                    <small>SHIELDED</small>
                  ) : actor.health <= 0 ? (
                    <small>RESPAWNING</small>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {available && !suspended ? (
            <div className="game-object-markers" aria-hidden="true">
              {world.champions.map((actor, index) => (
                <div
                  key={`home-${actor.id}`}
                  ref={(element) => {
                    markers.current[index + 2] = element;
                  }}
                  className={`home-marker team-${actor.id}`}
                >
                  {actor.name.toUpperCase()} HOME
                </div>
              ))}
              {world.decoys.map((decoy, index) => (
                <div
                  key={`${decoy.owner}-${decoy.expiresAt}-${index}`}
                  ref={(element) => {
                    markers.current[index + 4] = element;
                  }}
                  className="decoy-marker"
                >
                  DECOY
                </div>
              ))}
            </div>
          ) : null}
          <div className="garden-wordmark" aria-hidden="true">
            <span>CORE RUN</span>
            <strong>Relay Garden</strong>
            <small>
              {mode === 'rivalry' ? 'Neutral opening' : 'Carrier dilemma'} · seed {world.seed}
            </small>
          </div>
          <div className="game-mode-tag">
            {mode === 'replay'
              ? `REPLAY · TICK ${world.tick}`
              : world.status === 'finished'
                ? 'ROUND COMPLETE'
                : world.status === 'paused'
                  ? `${mode === 'rivalry' ? 'RIVALRY' : 'TRAINING'} · PAUSED`
                  : `${mode === 'rivalry' ? 'RIVALRY' : 'TRAINING'} · LIVE`}
          </div>
        </div>
        {mode !== 'replay' && !suspended ? <RoundResult world={world} /> : null}
      </div>
      <div className="game-lower-third">
        <div className={`game-cue ${world.core.carrier === null ? '' : 'has-core'}`}>
          <span className="core-symbol">◆</span>
          <div>
            <small>
              {capture
                ? 'CAPTURE'
                : world.core.carrier === null
                  ? contested
                    ? 'CORE CONTESTED'
                    : 'THE OBJECTIVE'
                  : 'CORE POSSESSION'}
            </small>
            <strong>
              {capture
                ? `${world.champions.find((c) => c.id === capture.actorId)?.name} brings it home`
                : world.core.carrier === null
                  ? contested
                    ? 'Equal claims · win the contest to collect'
                    : 'The core is waiting'
                  : `${world.champions.find((c) => c.id === world.core.carrier)?.name} · ${intentCue(world, world.core.carrier)}`}
            </strong>
          </div>
        </div>
        {lesson ? (
          <div className="game-lesson-credit">
            <i />
            <span>
              Lesson used <b>{lesson.author}</b>
              {mode === 'rivalry'
                ? ` · ${world.champions.find((c) => c.id === lesson.actorId)?.name}`
                : ''}
            </span>
          </div>
        ) : (
          <span className="garden-rule">FIRST TO 3 · 60 SECONDS</span>
        )}
      </div>
      {interactive ? (
        <div className="game-preferences" aria-label="Game presentation settings">
          <button aria-pressed={settings.lowEffects} onClick={settings.toggleLow}>
            <Leaf size={12} />
            {settings.lowEffects ? 'Low effects' : 'Full effects'}
          </button>
          <button
            aria-pressed={settings.reducedMotion}
            onClick={() => settings.setMotion((value) => !value)}
          >
            <Sparkles size={12} />
            {settings.reducedMotion ? 'Reduced motion' : 'Motion on'}
          </button>
          <button
            aria-pressed={sound.enabled}
            disabled={sound.unavailable}
            onClick={() => void sound.toggle()}
          >
            {sound.enabled ? <Volume2 size={12} /> : <VolumeX size={12} />}{' '}
            {sound.unavailable ? 'Sound unavailable' : sound.enabled ? 'Sound on' : 'Sound off'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
