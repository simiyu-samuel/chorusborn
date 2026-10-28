import type { Playbook, Rule } from '@chorusborn/contracts';

// Exact behavior duplicates only. This does not claim general conflict analysis.
function behavior(rule: Rule) {
  return JSON.stringify([
    rule.when.all.map((c) => JSON.stringify([c.fact, c.op, c.value])).sort(),
    rule.intent.goal,
    rule.intent.route,
    rule.intent.ability,
  ]);
}
export function inspectPlaybook(
  book: Playbook,
  pinned: Playbook | undefined,
  uses: Record<string, number> = {},
) {
  const seen = new Map<string, number>();
  return book.rules.map((rule, index) => {
    const signature = behavior(rule),
      duplicateOf = seen.get(signature);
    if (duplicateOf === undefined) seen.set(signature, index + 1);
    const active = pinned?.rules.some((r) => r.id === rule.id && behavior(r) === signature);
    return { duplicateOf, uses: active ? (uses[rule.id] ?? 0) : null };
  });
}
