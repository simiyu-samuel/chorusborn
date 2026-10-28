import { expect, test } from '@playwright/test';
import type { StudioState } from '@chorusborn/contracts';

test('finishes a real fixture round, broadcasts its result and starts one rematch with the queued playbook', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('chorusborn.low-effects', 'true'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  const teach = async (sampleId: string, expectedVersion: number) => {
    const proof = await page.request.post('/api/demo/trials', { data: { sampleId } });
    expect(proof.ok()).toBe(true);
    const adoption = await page.request.post('/api/demo/adoptions', {
      data: { trialId: (await proof.json()).id, expectedVersion },
    });
    expect(adoption.ok()).toBe(true);
  };
  await teach('core-discipline', 0);
  await page.getByRole('button', { name: 'Reset arena for next round' }).click();
  await expect(page.getByText('Round v1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start round', exact: true }).click();
  await teach('shield-the-core', 1);
  await expect(page.getByText('v2 ready next round')).toBeVisible();
  // Run the actual server clock through its normal sixty-second limit. No UI-state
  // injection, shortened rules or test-only finish route stands in for a result.
  const result = page.getByRole('region', { name: 'Round result', exact: true });
  await expect(result).toBeVisible({ timeout: 100_000 });
  const final = (await (await page.request.get('/api/demo/state')).json()) as StudioState;
  expect(final.world.status).toBe('finished');
  expect(final.world.winner).toBe('a');
  expect(final.world.champions[0].playbook.version).toBe(1);
  await expect(result.getByRole('heading', { name: 'Mica wins the round' })).toBeVisible();
  await expect(result.getByRole('table', { name: 'Recorded round stats' })).toBeVisible();
  const mica = result.getByRole('row', { name: /^Mica / });
  await expect(mica.getByRole('cell').nth(0)).toHaveText(
    `${(final.world.metrics.a.possessionTicks / 20).toFixed(1)}s`,
  );
  await expect(mica.getByRole('cell').nth(1)).toHaveText(String(final.world.metrics.a.damageTaken));
  await expect(mica.getByRole('cell').nth(2)).toHaveText(
    String(Object.values(final.world.metrics.a.ruleUses).reduce((sum, n) => sum + n, 0)),
  );
  await page
    .locator('.arena-card')
    .screenshot({ path: '.local/screenshots/round-result-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page
    .locator('.arena-card')
    .screenshot({ path: '.local/screenshots/round-result-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const spectator = await context
    .browser()!
    .newContext({ viewport: { width: 1920, height: 1080 } });
  try {
    await spectator.addInitScript(() => {
      localStorage.setItem('chorusborn.low-effects', 'true');
      const NativeSocket = window.WebSocket;
      window.WebSocket = class extends NativeSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          window.addEventListener('test-drop-spectator-signal', () => this.close());
        }
      };
    });
    const overlay = await spectator.newPage();
    await overlay.goto(`http://127.0.0.1:5273${final.overlayPath}`);
    await expect(overlay.getByRole('heading', { name: 'Mica wins the round' })).toBeVisible();
    await expect(overlay.getByRole('button')).toHaveCount(0);
    await expect(overlay.locator('.game-view')).toHaveAttribute('data-renderer', 'webgl', {
      timeout: 30_000,
    });
    await expect(overlay.locator('.game-marker').first()).toBeInViewport();
    await expect(overlay.locator('.home-marker').last()).toBeInViewport();
    await overlay.screenshot({ path: '.local/screenshots/round-result-broadcast.png' });
    const forbidden = await spectator.request.post('http://127.0.0.1:5273/api/demo/controls', {
      data: { action: 'rematch' },
    });
    expect(forbidden.status()).toBe(401);
    const rematchReply = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/demo/controls') &&
        response.request().postDataJSON()?.action === 'rematch',
    );
    await page.getByRole('button', { name: 'Play again', exact: true }).click();
    const started = (await (await rematchReply).json()) as StudioState;
    expect(started.world).toMatchObject({ tick: 0, status: 'running', winner: null });
    expect(started.world.champions[0].playbook.version).toBe(2);
    await expect(page.getByRole('button', { name: 'Pause round', exact: true })).toBeVisible();
    await expect(page.getByText('Round v2', { exact: true })).toBeVisible();
    await expect(result).toHaveCount(0);
    await expect(overlay.getByRole('region', { name: 'Round result' })).toHaveCount(0);
    await expect(overlay.getByRole('img', { name: /Core Run arena.*running/ })).toBeVisible();
    // Drop only the spectator's socket, keep retries failing, and verify the stale
    // frame is clearly labeled and its cosmetic motion freezes.
    await overlay.route('**/api/demo/overlay?**', (route) => route.abort());
    await overlay.evaluate(() => window.dispatchEvent(new Event('test-drop-spectator-signal')));
    await expect(
      overlay.getByText('Signal interrupted · showing last received state'),
    ).toBeVisible();
    await expect(overlay.locator('.game-view')).toHaveAttribute('data-motion', 'reduced');
    await page.getByRole('button', { name: 'Pause round', exact: true }).click();
    const rematch = (await (await page.request.get('/api/demo/state')).json()) as StudioState;
    expect(rematch.world.status).toBe('paused');
    expect(rematch.world.champions[0].playbook.version).toBe(2);
  } finally {
    await spectator.close();
  }
});
