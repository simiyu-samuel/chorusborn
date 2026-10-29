export type CloudConfig = { redisUrl: string; key: string; namespace: string; origin: string };
export function readCloudConfig(env: NodeJS.ProcessEnv): CloudConfig {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production')
    throw new Error('Preview deployments cannot access the production game authority.');
  const redisUrl = env.REDIS_URL ?? env.KV_URL;
  const key = env.CHORUSBORN_STATE_KEY;
  const origin = env.PUBLIC_ORIGIN;
  if (!redisUrl || !key || !origin)
    throw new Error('Configure private Redis, state key and PUBLIC_ORIGIN.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password)
    throw new Error('PUBLIC_ORIGIN must be an exact HTTPS origin.');
  if (!redisUrl.startsWith('rediss://')) throw new Error('Cloud Redis requires TLS.');
  return { redisUrl, key, origin, namespace: 'chorusborn:production:v1:' };
}
