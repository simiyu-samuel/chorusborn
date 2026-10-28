import { useState } from 'react';
import { describeCondition } from './lesson.js';
import { Radio, Pause, Play, RotateCcw, X, ArrowUpRight } from 'lucide-react';
import type { StudioState } from '@chorusborn/contracts';

type Props = {
  state: StudioState;
  connect: () => void;
  command: (path: string, body: unknown) => Promise<void>;
  prove: (proposalId: string) => Promise<void>;
};
export function ChatQueue({ state, connect, command, prove }: Props) {
  const { intake, twitch } = state;
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const authenticated = twitch.status === 'authenticated';
  const learned = new Set(state.playbook.rules.map((rule) => rule.source?.proposalId));
  const queued = intake.proposals.filter((item) => item.status === 'awaiting-compiler').length;
  const perform = async (path: string, body: unknown) => {
    setBusy(true);
    try {
      await command(path, body);
    } finally {
      setBusy(false);
    }
  };
  const outcome = {
    queued: 'Lesson received. Compile it to inspect the proposed tactic before testing.',
    duplicate: 'Duplicate delivery ignored. Your lesson was kept once.',
    paused: 'A teaching command arrived while intake was paused.',
    cooldown: 'One lesson per person every 30 seconds. Try again after the cooldown.',
    full: 'The queue is full. Reject an old proposal before accepting more.',
    invalid:
      'A teaching command was rejected. Use 1–280 characters without links, code blocks, or line breaks.',
    moderated: 'Twitch chat moderation applied. Removed text and attribution are hidden.',
  };
  return (
    <section className="chat-queue" id="live-lessons" aria-label="Live lesson queue">
      <div className="chat-queue-heading">
        <div>
          <span className="eyebrow">
            <Radio size={14} /> FROM YOUR COMMUNITY
          </span>
          <h2>
            {authenticated ? `Chat is part of the team.` : 'The next idea could come from chat.'}
          </h2>
          <p>
            {authenticated ? (
              <>
                <a
                  href={`https://www.twitch.tv/${twitch.channel!.login}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {twitch.channel!.login}
                  <ArrowUpRight size={12} />
                </a>{' '}
                · {queued} waiting · lessons are saved locally
              </>
            ) : (
              'Connect your broadcaster account to collect real teaching commands.'
            )}
          </p>
        </div>
        <div className="chat-queue-controls">
          <span
            className={`chat-status ${intake.status === 'live' && !intake.paused ? 'live' : ''}`}
          >
            <i />
            {intake.paused
              ? 'Intake paused'
              : intake.status === 'live'
                ? 'Chat live'
                : intake.status === 'connecting'
                  ? 'Connecting chat…'
                  : intake.status === 'reconnecting'
                    ? 'Reconnecting chat…'
                    : intake.status === 'error'
                      ? 'Intake needs attention'
                      : intake.status === 'revoked'
                        ? 'Chat access revoked'
                        : 'Chat disconnected'}
          </span>
          {authenticated ? (
            <>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() =>
                  void perform('/api/twitch/intake', { action: intake.paused ? 'resume' : 'pause' })
                }
              >
                {intake.paused ? <Play size={14} /> : <Pause size={14} />}
                {intake.paused ? 'Resume intake' : 'Pause intake'}
              </button>
              {['error', 'reconnecting', 'not-connected'].includes(intake.status) ? (
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void perform('/api/twitch/intake', { action: 'retry' })}
                >
                  <RotateCcw size={14} />
                  Retry intake
                </button>
              ) : null}
            </>
          ) : (
            <button className="secondary-button" onClick={connect}>
              Connect Twitch
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="chat-intake-message" role="status">
        {intake.message}
        {intake.gaps
          ? ` ${intake.gaps} connection gap${intake.gaps === 1 ? '' : 's'} recorded this session.`
          : ''}
      </p>
      {authenticated ? (
        <>
          <div className="chat-command-hint">
            <code>!teach When carrying the core, take a cautious route home.</code>
            <span>Post in Twitch chat · 280 characters · 30-second cooldown</span>
          </div>
          {intake.lastOutcome ? (
            <p className="chat-outcome">{outcome[intake.lastOutcome]}</p>
          ) : null}
          {intake.proposals.length ? (
            <div className="chat-proposals" aria-label="Received teaching proposals">
              {(expanded ? intake.proposals : intake.proposals.slice(0, 6)).map((proposal) => (
                <article className={`chat-proposal ${proposal.status}`} key={proposal.id}>
                  <div>
                    <div className="chat-proposal-byline">
                      <strong>{proposal.author?.name ?? 'Removed contribution'}</strong>
                      <span>
                        {proposal.author ? `@${proposal.author.login}` : 'Twitch moderation'}
                      </span>
                      <time dateTime={new Date(proposal.receivedAt).toISOString()}>
                        {new Date(proposal.receivedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <p>{proposal.text ?? 'This lesson was removed from Twitch chat.'}</p>
                    <small>
                      {proposal.status === 'removed'
                        ? 'Text and attribution removed'
                        : proposal.status === 'rejected'
                          ? 'Rejected by coach'
                          : proposal.status === 'compiled'
                            ? 'Compiled from Twitch · coach review required'
                            : 'Received from Twitch · awaiting review'}
                    </small>
                  </div>
                  {['awaiting-compiler', 'compiled'].includes(proposal.status) &&
                  !learned.has(proposal.id) ? (
                    <div className="proposal-actions">
                      <button
                        className="secondary-button"
                        disabled={
                          busy ||
                          !state.compiler.configured ||
                          proposal.compilation?.status === 'running' ||
                          proposal.compileAttempts >= 3 ||
                          (proposal.status === 'compiled' &&
                            proposal.compilation?.baseVersion === state.playbook.version)
                        }
                        onClick={() =>
                          void perform(`/api/twitch/proposals/${proposal.id}/compile`, {})
                        }
                      >
                        {proposal.compilation?.status === 'running'
                          ? 'Compiling…'
                          : proposal.compilation
                            ? proposal.status === 'compiled' &&
                              proposal.compilation.baseVersion === state.playbook.version
                              ? 'Compiled'
                              : 'Compile again'
                            : 'Compile lesson'}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Reject lesson from ${proposal.author?.name}`}
                        disabled={busy}
                        onClick={() =>
                          void perform(`/api/twitch/proposals/${proposal.id}`, { action: 'reject' })
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  {proposal.compilation ? (
                    <div className="compiled-lesson" role="status">
                      <strong>
                        {proposal.compilation.status === 'running'
                          ? 'Translating your lesson…'
                          : proposal.compilation.status === 'failed'
                            ? 'Compilation needs attention'
                            : proposal.compilation.result?.outcome.replaceAll('_', ' ')}
                      </strong>
                      <p>
                        {proposal.compilation.error ?? proposal.compilation.result?.explanation}
                      </p>
                      {proposal.compilation.result?.candidate ? (
                        <>
                          <h3>{proposal.compilation.result.candidate.summary}</h3>
                          <ol>
                            {proposal.compilation.result.candidate.rules.map((rule, index) => (
                              <li key={index}>
                                <strong>{rule.label}</strong>
                                <p>
                                  When{' '}
                                  {rule.when.all
                                    .map((condition) =>
                                      describeCondition(condition, state.championName),
                                    )
                                    .join(' AND ')}
                                </p>
                                <p>
                                  Do {rule.intent.goal.replaceAll('_', ' ')} · {rule.intent.route}{' '}
                                  route ·{' '}
                                  {rule.intent.ability === 'none'
                                    ? 'no ability'
                                    : rule.intent.ability}
                                </p>
                              </li>
                            ))}
                          </ol>
                          {learned.has(proposal.id) ? (
                            <p>Adopted in your playbook. Reset the arena to use it next round.</p>
                          ) : proposal.compilation.baseVersion === state.playbook.version ? (
                            <button
                              className="primary-button"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await prove(proposal.id);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Prove community lesson
                            </button>
                          ) : (
                            <p>Playbook changed. Compile again before testing.</p>
                          )}
                        </>
                      ) : null}
                      <small>
                        {proposal.compilation.model} · playbook v{proposal.compilation.baseVersion}{' '}
                        · attempt {proposal.compileAttempts}/3
                      </small>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="chat-empty">
              No lessons received yet. A real <code>!teach</code> command will appear here with its
              author.
            </p>
          )}
          {intake.proposals.length > 6 ? (
            <button className="text-button" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show fewer proposals' : `Show all ${intake.proposals.length} proposals`}
            </button>
          ) : null}
          <p className="chat-compiler-note">
            {state.compiler.configured
              ? `${state.compiler.model} · ${state.compiler.remainingCalls} model calls left in this server run. Compilation sends lesson text to Groq. Review, prove, then adopt for the next round.`
              : 'Compiler not configured. Add GROQ_API_KEY to the server .env and restart. Lessons remain saved for review.'}
          </p>
        </>
      ) : null}
    </section>
  );
}
