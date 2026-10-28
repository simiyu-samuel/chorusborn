import type { Condition } from '@chorusborn/contracts';
const booleans = {
  'self.carryingCore': ['Mica is carrying the core', 'Mica is not carrying the core'],
  'enemy.carryingCore': [
    'The opponent is carrying the core',
    'The opponent is not carrying the core',
  ],
  'core.available': ['The core is available', 'The core is not available'],
  'self.shieldReady': ['Mica’s shield is ready', 'Mica’s shield is not ready'],
  'self.decoyReady': ['Mica’s decoy is ready', 'Mica’s decoy is not ready'],
};
const operators = {
  eq: 'equals',
  lt: 'is below',
  lte: 'is at most',
  gt: 'is above',
  gte: 'is at least',
};
export function describeCondition(condition: Condition, championName = 'Mica'): string {
  if (typeof condition.value === 'boolean') {
    const positive = condition.op === 'eq' ? condition.value : !condition.value;
    return booleans[condition.fact as keyof typeof booleans][positive ? 0 : 1]!.replace(
      'Mica',
      championName,
    );
  }
  const health = condition.fact === 'self.healthBps';
  return `${health ? `${championName}’s health` : 'Opponent distance'} ${operators[condition.op as keyof typeof operators]} ${condition.value / (health ? 100 : 1000)}${health ? '%' : ' tiles'}`;
}
