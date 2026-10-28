import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Swords, SkipForward, Sparkles } from 'lucide-react';
import type { CombatStudy } from '@chorusborn/contracts';
import { canUseWebGL, GraphicsBoundary } from '../arena.js';
import { fighterPose } from './combat-motion.js';
import { FighterGlyph } from './fighter-glyph.js';
import './combat-lab.css';
const CombatScene = lazy(() => import('./combat-scene.js'));

export function CombatLab() {
  const [study, setStudy] = useState<CombatStudy | null>(null),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState(0);
  const [tick, setTick] = useState(0),
    [playing, setPlaying] = useState(false),
    [rate, setRate] = useState(1);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [webgl, setWebgl] = useState(canUseWebGL),
    [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []),
    unavailable = useCallback(() => setWebgl(false), []);
  const deck = useRef<HTMLElement>(null);
  const onRendered = useCallback((value: number) => {
    const tick = String(Math.floor(value));
    if (deck.current?.getAttribute('data-rendered-tick') !== tick)
      deck.current?.setAttribute('data-rendered-tick', tick);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch('/api/demo/combat-study', { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message);
        return data as CombatStudy;
      })
      .then(setStudy)
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)'),
      changed = () => setReduced(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!playing || !study) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        delta = (((now - last) * 20) / 1000) * rate;
      last = now;
      setTick((t) => Math.min(240, t + delta));
    }, 50);
    return () => clearInterval(timer);
  }, [playing, study, rate]);
  useEffect(() => {
    if (tick >= 240) setPlaying(false);
  }, [tick]);
  const seek = (value: number) => {
    setPlaying(false);
    setTick(Math.max(0, Math.min(240, value)));
  };
  const action = (kind: number) => {
    if (!study) return;
    const hit = study.strikes.find(
      (e) => e.actorId === 'a' && Math.floor(e.tick / 20) % 3 === kind,
    );
    if (hit) seek(hit.tick - 2);
  };
  const frame = study?.frames[Math.floor(tick)],
    recent = study?.strikes.filter((e) => e.tick <= tick && tick - e.tick < 10) ?? [];
  const fallback = study ? (
    <div className="combat-compatible">
      <svg viewBox="0 0 600 340" aria-hidden="true">
        <g transform="translate(225 285)">
          <FighterGlyph pose={fighterPose(study, 'a', tick, reduced)} team="a" />
        </g>
        <g transform="translate(375 285) scale(-1 1)">
          <FighterGlyph pose={fighterPose(study, 'b', tick, reduced)} team="b" />
        </g>
      </svg>
      <small>Compatibility view · 3D unavailable</small>
    </div>
  ) : null;
  return (
    <main className="combat-lab">
      <header className="combat-header">
        <a href="/">
          <ArrowLeft size={16} /> Back to studio
        </a>
        <span>CHORUSBORN / MOVEMENT LAB</span>
        <span className="combat-build-tag">ANIMATION PROTOTYPE</span>
      </header>
      <div className="combat-intro">
        <div>
          <span className="eyebrow">MICA × ROOK</span>
          <h1>Make every hit count.</h1>
          <p>Jump. Spin. Strike. Land. A closer look at our new fighters.</p>
        </div>
        <div className="combat-study-note">
          <Swords size={18} />
          <span>
            Recorded sparring<small>12 seconds · current tag and shield rules</small>
          </span>
        </div>
      </div>
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>Retry study</button>
        </div>
      ) : null}
      {!study && !error ? <p role="status">Preparing the sparring replay…</p> : null}
      {study && frame ? (
        <>
          <section
            ref={deck}
            className="combat-deck"
            aria-label="Combat animation preview"
            data-renderer={webgl && ready ? 'webgl' : 'compatibility'}
            data-tick={Math.floor(tick)}
            data-motion={reduced ? 'reduced' : 'full'}
          >
            <div className="combat-health-row">
              {frame.champions.map((c) => (
                <div key={c.id} className={`combat-health team-${c.id}`}>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.health} HP</span>
                  </div>
                  <div className="fighter-health-track">
                    <i style={{ width: `${c.health}%` }} />
                  </div>
                  <small>{fighterPose(study, c.id, tick, reduced).move}</small>
                </div>
              ))}
            </div>
            <div
              className="combat-canvas"
              role="img"
              aria-label={`Sparring replay at ${(tick / 20).toFixed(1)} seconds. Mica ${frame.champions[0].health} health. Rook ${frame.champions[1].health} health.`}
            >
              {webgl ? (
                <GraphicsBoundary fallback={fallback} onUnavailable={unavailable}>
                  <Suspense
                    fallback={<div className="graphics-loading">Opening the sparring deck…</div>}
                  >
                    <CombatScene
                      study={study}
                      tick={tick}
                      playing={playing}
                      rate={rate}
                      reducedMotion={reduced}
                      onReady={onReady}
                      onRendered={onRendered}
                      onUnavailable={unavailable}
                    />
                  </Suspense>
                </GraphicsBoundary>
              ) : (
                fallback
              )}
            </div>
            <div className="combat-scene-label">
              <span>THE SPARRING DECK</span>
              <b>
                {playing ? 'REPLAYING' : 'PAUSED'} · {(tick / 20).toFixed(1)} / 12.0s
              </b>
            </div>
            <div className="combat-hit-cues" aria-hidden="true">
              {recent.map((e) => (
                <span key={`${e.tick}-${e.actorId}`} className={e.shielded ? 'shield-contact' : ''}>
                  {e.shielded ? 'SHIELD' : 'TAG'} · {e.targetId === 'a' ? 'Mica' : 'Rook'} −
                  {e.damage}
                </span>
              ))}
            </div>
          </section>
          <div className="combat-transport">
            <button
              className="primary-button"
              onClick={() => {
                if (tick >= 240) setTick(0);
                setPlaying((v) => !v);
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? 'Pause sparring' : 'Play sparring'}
            </button>
            <button className="icon-button" onClick={() => seek(0)} aria-label="Restart sparring">
              <RotateCcw size={17} />
            </button>
            <input
              type="range"
              min="0"
              max="240"
              step="1"
              value={Math.floor(tick)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Sparring timeline"
            />
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label="Playback speed"
            >
              <option value=".5">½× speed</option>
              <option value="1">1× speed</option>
            </select>
            <button
              className="motion-toggle"
              aria-pressed={reduced}
              onClick={() => setReduced((v) => !v)}
            >
              <Sparkles size={14} />
              {reduced ? 'Reduced motion' : 'Full motion'}
            </button>
          </div>
          <section className="combat-moves" aria-label="Preview a move">
            <span>JUMP TO A MOVE</span>
            <button onClick={() => action(0)}>
              <SkipForward size={13} /> Aerial kick
            </button>
            <button onClick={() => action(1)}>
              <SkipForward size={13} /> Spinning strike
            </button>
            <button onClick={() => action(2)}>
              <SkipForward size={13} /> Somersault
            </button>
            <button onClick={() => seek(20)}>Shield contact</button>
            <button
              onClick={() => {
                const knockout = study.frames.find((w) => w.champions.some((c) => c.health === 0));
                if (knockout) seek(knockout.tick);
              }}
            >
              Tagged out
            </button>
          </section>
          <footer className="combat-footnote">
            <p>
              Jumps and spins are visual choreography. Health, shields and contacts follow the
              recorded simulation.
            </p>
            <span>Fixed sparring study · your live playbook is unchanged</span>
          </footer>
        </>
      ) : null}
    </main>
  );
}
