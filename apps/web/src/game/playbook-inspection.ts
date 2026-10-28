import type { Playbook, Rule } from '@chorusborn/contracts';

// Exact duplicates and syntactically provable same-goal shadowing, not complete conflict analysis.
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
    const shadow = book.rules
      .slice(0, index)
      .findIndex(
        (prior) =>
          prior.intent.goal === rule.intent.goal &&
          prior.when.all.every((condition) =>
            rule.when.all.some(
              (other) =>
                condition.fact === other.fact &&
                condition.op === other.op &&
                condition.value === other.value,
            ),
          ),
      );
    const signature = behavior(rule),
      duplicateOf = seen.get(signature);
    if (duplicateOf === undefined) seen.set(signature, index + 1);
    const active = pinned?.rules.some((r) => r.id === rule.id && behavior(r) === signature);
    return {
      duplicateOf,
      shadowedBy: shadow < 0 ? undefined : shadow + 1,
      uses: active ? (uses[rule.id] ?? 0) : null,
    };
  });
}
