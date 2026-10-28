import type { World } from '@chorusborn/contracts';
import { Trophy, Equal } from 'lucide-react';
import { ChampionPortrait } from './champion-portrait.js';
import { roundResult } from './presentation.js';

export function RoundResult({ world }: { world: World }) {
  const result = roundResult(world);
  if (!result) return null;
  return (
    <section
      className={`round-result ${result.winner ? `winner-${result.winner.id}` : 'is-draw'}`}
      aria-label="Round result"
    >
      <div className="result-banner">
        <div className="result-portrait" aria-hidden="true">
          {result.winner ? (
            <ChampionPortrait
              team={result.winner.id}
              color={result.winner.id === 'a' ? '#b7a0fb' : '#e4a348'}
            />
          ) : (
            <Equal size={36} />
          )}
        </div>
        <div className="result-copy">
          <span className="result-kicker">
            {result.winner ? <Trophy size={12} /> : <Equal size={12} />}{' '}
            {result.winner ? 'VICTORY' : 'DRAW'} · {result.reason}
          </span>
          <h3>{result.title}</h3>
          <p>
            Relay Garden · {result.seconds}s played · Playbook v
            {world.champions[0].playbook.version}
          </p>
        </div>
        <div
          className="result-score"
          role="img"
          aria-label={`Final score ${result.rows[0]!.score} to ${result.rows[1]!.score}`}
        >
          <b>{result.rows[0]!.score}</b>
          <span>:</span>
          <b>{result.rows[1]!.score}</b>
        </div>
      </div>
      <div className="result-detail">
        <table aria-label="Recorded round stats">
          <thead>
            <tr>
              <th scope="col">Champion</th>
              <th scope="col">Core held</th>
              <th scope="col">Damage taken</th>
              <th scope="col">Lesson uses</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  <i className={`result-team team-${row.id}`} />
                  {row.name}
                </th>
                <td>{row.possession}s</td>
                <td>{row.damage}</td>
                <td>{row.lessonUses}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Lesson uses show how often a taught rule was used this round.</p>
      </div>
    </section>
  );
}
