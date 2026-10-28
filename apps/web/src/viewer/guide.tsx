import { useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Flag,
  Shield,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import { ChampionPortrait } from '../game/champion-portrait.js';
import { CopyText } from './copy-text.js';
import './viewer.css';

const examples = [
  {
    title: 'Race for the core',
    note: 'Direct takes the shortest route without avoiding hazard cost. Fast can also mean risky.',
    text: '!teach When the core is available, collect it by the direct route.',
  },
  {
    title: 'Make the delivery',
    note: 'Cautious favors avoiding hazards, even when the route is longer.',
    text: '!teach When carrying the core, return home by a cautious route.',
  },
  {
    title: 'Shield the contest',
    note: 'Protect the approach before possession. The engine uses shield only when its cooldown is ready.',
    text: '!teach When the core is available, collect it directly and use shield when ready.',
  },
  {
    title: 'Protect the carrier',
    note: 'This applies after pickup. It cannot help win the opening claim.',
    text: '!teach When carrying the core, head home and use shield when ready.',
  },
  {
    title: 'Chase their carrier',
    note: 'Pressure the opponent while they have the objective.',
    text: '!teach When the opponent carries the core, attack them.',
  },
  {
    title: 'Live to run again',
    note: 'Retreat trades immediate pressure for a chance to recover at home.',
    text: '!teach When health drops below 35 percent, retreat home cautiously.',
  },
];
const stages = [
  [
    '01',
    'Received',
    'Your !teach message enters your channel’s queue. It has not changed the champion.',
  ],
  [
    '02',
    'Reviewed & tested',
    'The coach checks what it means and compares the current book with the candidate. Some lessons need clarification or perform worse.',
  ],
  [
    '03',
    'Adopted',
    'The coach chooses to save it. The running round keeps its locked book; the new version enters a fresh round.',
  ],
  [
    '04',
    'Used',
    'A matching rule actually executes a move or ability. The arena credits its author. That credit is an execution record, not proof it caused a win.',
  ],
];

function FieldDiagram() {
  return (
    <div
      className="viewer-field"
      role="img"
      aria-label="Two champions start at opposite home gates. Collect the neutral core in the middle and carry it back to your own gate to score."
    >
      <div className="viewer-home violet">
        <ChampionPortrait />
        <span>Your home gate</span>
      </div>
      <div className="viewer-core-path" aria-hidden="true">
        <span>← BRING IT HOME</span>
        <b>◆</b>
        <span>BRING IT HOME →</span>
      </div>
      <div className="viewer-home amber">
        <ChampionPortrait team="b" color="#edb65e" />
        <span>Their home gate</span>
      </div>
    </div>
  );
}
export function ViewerGuide() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'How to play — Chorusborn';
    return () => {
      document.title = previous;
    };
  }, []);
  return (
    <main className="viewer-guide">
      <a className="viewer-skip" href="#teaching">
        Skip to teaching examples
      </a>
      <header className="viewer-nav">
        <a href="/" className="viewer-brand">
          chorusborn<span>◆</span>
        </a>
        <nav aria-label="Viewer guide">
          <a href="#rules">The game</a>
          <a href="#teaching">Teach</a>
          <a href="#lesson-journey">Your lesson</a>
        </nav>
        <a href="/" className="viewer-studio-link">
          Coach studio <ArrowUpRight size={15} />
        </a>
      </header>
      <section className="viewer-hero" aria-labelledby="viewer-title">
        <div>
          <span className="eyebrow">THE VIEWER’S FIELD GUIDE</span>
          <h1 id="viewer-title">
            Your chat.
            <br />
            Their next move.
          </h1>
          <p>
            Two streamers. Two communities. One core. Teach your streamer’s champion a better
            strategy, then watch it take shape in the arena.
          </p>
          <a className="primary-button" href="#teaching">
            Teach your first tactic <ArrowRight size={17} />
          </a>
          <span className="viewer-no-login">No sign-in needed to read or copy examples.</span>
        </div>
        <div className="viewer-hero-board">
          <div className="viewer-board-heading">
            <Swords size={17} />
            <span>CORE RUN / RELAY GARDEN</span>
            <span>3 CAPTURES · 60 SECONDS</span>
          </div>
          <FieldDiagram />
          <p>
            <b>Grab the glowing core.</b> Bring it to your own home gate. Each delivery scores one
            capture.
          </p>
        </div>
      </section>
      <section id="rules" className="viewer-section" aria-labelledby="rules-title">
        <div className="viewer-section-title">
          <span className="eyebrow">LEARN THE ARENA</span>
          <h2 id="rules-title">Small rules. Big decisions.</h2>
          <p>You coach the strategy. The champion plays it.</p>
        </div>
        <div className="viewer-rule-grid">
          <article>
            <Flag />
            <h3>First to three</h3>
            <p>
              A match ends at three captures or 60 seconds. At time, more captures wins; equal
              captures draw.
            </p>
          </article>
          <article>
            <Shield />
            <h3>Stay in the fight</h3>
            <p>
              Both champions start with 100 health. Close-range tags happen automatically. Shield
              halves incoming damage for 1.5 seconds and has a 5-second cooldown. A defeated
              champion drops the core and respawns after 2 seconds.
            </p>
          </article>
          <article>
            <Target />
            <h3>Watch the arrow</h3>
            <p>
              If both claim the core equally, a 0.5-second contest starts. The visible initiative
              holder gets that tied pickup, then the arrow passes. Unique closer claims are
              immediate. Starting initiative is drawn before a rivalry starts and switches on
              rematch.
            </p>
          </article>
        </div>
      </section>
      <section id="teaching" className="viewer-section" aria-labelledby="teach-title">
        <div className="viewer-section-title">
          <span className="eyebrow">RAISED BY CHAT</span>
          <h2 id="teach-title">Say when. Say what to do.</h2>
          <p>
            Post <code>!teach</code> followed by an English strategy in the Twitch chat of the
            streamer whose champion you want to coach. Each community has its own book. These
            buttons copy text; you send it in chat.
          </p>
        </div>
        <div className="viewer-formula">
          <span>!teach</span>
          <b>When something happens,</b>
          <ArrowRight size={20} />
          <b>do this.</b>
        </div>
        <p className="viewer-teach-limit">
          One lesson per person every 30 seconds · up to 280 characters after !teach · one line,
          without links or code.
        </p>
        <div className="viewer-examples">
          {examples.map((example) => (
            <article key={example.title}>
              <h3>{example.title}</h3>
              <p>{example.note}</p>
              <CopyText text={example.text} label={`Copy ${example.title} command`} />
            </article>
          ))}
        </div>
      </section>
      <section className="viewer-section viewer-tactics" aria-labelledby="tactics-title">
        <div>
          <span className="eyebrow">CHOOSE A TRADE-OFF</span>
          <h2 id="tactics-title">Fast, safe, or somewhere between.</h2>
          <p>
            Natural language authors a supported rule. The coach checks its interpreted goal, route
            and ability before testing it.
          </p>
          <dl>
            <dt>Goals</dt>
            <dd>
              Collect the core, return home with it, attack the opponent, retreat, guard home, or
              hold position.
            </dd>
            <dt>Routes</dt>
            <dd>
              <b>Direct:</b> shortest route without hazard avoidance. <b>Balanced:</b> some hazard
              avoidance. <b>Cautious:</b> stronger hazard avoidance. Safer routes can arrive later.
            </dd>
            <dt>Abilities</dt>
            <dd>
              Shield and decoy. Decoys can distract the novice baseline; an explicit learned attack
              targets the real opponent. Cooldowns still apply.
            </dd>
          </dl>
        </div>
        <aside>
          <BookOpen />
          <h3>A playbook is a priority list.</h3>
          <p>
            The first matching executable rule controls the move. New lessons go to the top; the
            coach can reorder them. A broad return-home rule can block a lower shield rule.
          </p>
          <p>
            More lessons do not add speed, health or damage. Repeating a tactic adds no extra power.
          </p>
          <p>
            Flips and jumps are visual choreography in this prototype. A lesson cannot add new
            combat mechanics.
          </p>
        </aside>
      </section>
      <section id="lesson-journey" className="viewer-section" aria-labelledby="journey-title">
        <div className="viewer-section-title">
          <span className="eyebrow">FROM CHAT TO CHAMPION</span>
          <h2 id="journey-title">Sent is only the beginning.</h2>
          <p>Received, adopted and used mean different things.</p>
        </div>
        <ol className="viewer-journey">
          {stages.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <div className="viewer-evidence">
          <Sparkles size={24} />
          <div>
            <h3>A lesson can make the champion worse.</h3>
            <p>
              A safe-looking detour may lose the race. The coach can leave a tested lesson
              unadopted. For retrieval, test the neutral opening from both starting initiatives; the
              carrier fixture starts with possession and tests delivery. One opponent and arena are
              only part of the picture.
            </p>
          </div>
        </div>
      </section>
      <section className="viewer-section viewer-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Before you hit send</h2>
        <details>
          <summary>Do I need magic keywords?</summary>
          <p>
            Start with !teach, then use ordinary English. A clear condition and a supported action
            are easiest to review. If a request is unclear or asks for a new mechanic, it can need
            clarification or be unsupported. Inspect the interpretation; no example guarantees a
            win.
          </p>
        </details>
        <details>
          <summary>Why has my lesson not appeared in the match?</summary>
          <p>
            It may still need review, testing or adoption. An adopted lesson may be waiting for a
            new round. In a locked book, its condition might not happen or a higher rule might take
            priority. Only an actual execution earns a “used” receipt.
          </p>
        </details>
        <details>
          <summary>Can I steer every punch?</summary>
          <p>
            You teach conditional strategy. Movement, automatic tags, ability readiness and scoring
            follow the game rules. The streamer reviews changes; typing a command does not
            immediately move the fighter.
          </p>
        </details>
        <details>
          <summary>Does copying an example send it to chat?</summary>
          <p>
            Copying puts the command on your clipboard. Paste it into your streamer’s Twitch chat
            and send it yourself. The coach reviews received lessons before testing and adoption.
          </p>
        </details>
      </section>
      <footer className="viewer-footer">
        <span>chorusborn. / Raised by chat. Proven in the arena.</span>
        <a href="#teaching">
          Back to teaching <ArrowRight size={14} />
        </a>
      </footer>
    </main>
  );
}
