import type { ChatProposal, StudioState } from '@chorusborn/contracts';

type ProgressState = Pick<StudioState, 'world' | 'playbook' | 'selfActor' | 'latestTrial' | 'mode'>;
/** Owner-only view. Shared worlds redact source joins, so match own rule IDs to the locked book. */
export function lessonProgress(state: ProgressState, proposal: ChatProposal) {
  if (proposal.status === 'removed')
    return {
      label: 'Source removed',
      detail: 'Chat moderation removed the source text and attribution.',
    };
  if (proposal.status === 'rejected')
    return {
      label: 'Rejected by coach',
      detail: 'This source is no longer eligible for a new adoption.',
    };
  const ids = new Set(
    state.playbook.rules
      .filter((rule) => rule.source?.proposalId === proposal.id)
      .map((rule) => rule.id),
  );
  const champion = state.world.champions.find((c) => c.id === state.selfActor);
  const pinned = champion?.playbook.rules.filter((r) => ids.has(r.id)) ?? [];
  const uses = pinned.reduce(
    (total, rule) => total + (state.world.metrics[state.selfActor].ruleUses[rule.id] ?? 0),
    0,
  );
  if (uses > 0)
    return {
      label: 'Used in this round',
      detail: `${uses} recorded execution${uses === 1 ? '' : 's'}. A rule can execute several times per second; this does not mean it caused a win.`,
    };
  if (pinned.length)
    return {
      label: 'Adopted · in this round',
      detail:
        'Included in the locked book. No execution has been recorded yet; conditions and higher-priority rules still matter.',
    };
  if (ids.size)
    return {
      label: 'Adopted · next round',
      detail:
        state.mode === 'rivalry'
          ? 'Saved to your book. Both coaches must ready for a fresh round to load this version.'
          : 'Saved to your book. Reset or start a rematch to load this version.',
    };
  const compilation = proposal.compilation;
  if (compilation?.status === 'running')
    return {
      label: 'Being interpreted',
      detail: 'The lesson is being translated for coach review. It has not changed the champion.',
    };
  if (compilation?.status === 'failed')
    return {
      label: 'Needs attention',
      detail: 'Interpretation failed. The coach can inspect the error; no rule was adopted.',
    };
  if (compilation?.result?.outcome === 'candidate') {
    if (compilation.baseVersion !== state.playbook.version)
      return {
        label: 'Review outdated',
        detail: 'The book changed. Compile and test again against the current version.',
      };
    if (
      state.latestTrial?.source?.proposalId === proposal.id &&
      state.latestTrial.source.compilationId === compilation.id &&
      state.latestTrial.baseVersion === state.playbook.version
    )
      return {
        label: 'Tested · coach decision',
        detail:
          'A comparison is ready. The coach decides whether to adopt; testing alone does not publish a lesson.',
      };
    return {
      label: 'Ready to test',
      detail: 'The interpretation is ready for review and comparison. It has not changed the book.',
    };
  }
  if (compilation?.result)
    return {
      label: compilation.result.outcome.replaceAll('_', ' '),
      detail: 'Review the explanation before suggesting a revised lesson.',
    };
  return {
    label: 'Received · awaiting review',
    detail: 'Saved in this channel’s queue. It has not changed the playbook.',
  };
}
