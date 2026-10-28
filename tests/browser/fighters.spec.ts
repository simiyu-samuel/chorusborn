import { expect, test } from '@playwright/test';
import type { Trial } from '@chorusborn/contracts';
import { liveFighterPose } from '../../apps/web/src/game/combat-motion.js';

test('uses the fighter kit in real branch replays and holds exact contact poses when seeking', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await expect(page.locator('.game-view')).toHaveAttribute('data-fighter-kit', 'acrobat-v1');
  const before = await (await page.request.get('/api/demo/state')).json();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/demo/trials') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Prove this lesson', exact: true }).click();
  const trial = (await (await response).json()) as Trial;
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const views = dialog.locator('.game-view');
  await expect(views).toHaveCount(2);
  await expect(views.first()).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 });
  await expect(views.last()).toHaveAttribute('data-fighter-kit', 'acrobat-v1');
  const index = trial.baseline.frames.findIndex(
    (w) => liveFighterPose(w, 'a').lift > 0.1 && w.champions[0].health > 0,
  );
  expect(index).toBeGreaterThan(0);
  const target = trial.baseline.frames[index]!;
  const slider = dialog.getByRole('slider', { name: 'Replay timeline' });
  await slider.press('Home');
  for (let i = 0; i < index; i++) await slider.press('ArrowRight');
  const actor = views.first().locator('.game-marker.team-a');
  await expect(actor).toHaveAttribute('data-rendered-tick', String(target.tick));
  await expect(actor).toHaveAttribute('data-pose', liveFighterPose(target, 'a').move);
  await page.screenshot({ path: '.local/screenshots/fighters-branch-replay.png', fullPage: true });
  await slider.press('Home');
  await expect(actor).toHaveAttribute('data-rendered-tick', String(trial.baseline.frames[0]!.tick));
  for (let i = 0; i < index; i++) await slider.press('ArrowRight');
  await expect(actor).toHaveAttribute('data-rendered-tick', String(target.tick));
  await expect(actor).toHaveAttribute('data-pose', liveFighterPose(target, 'a').move);
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const after = await (await page.request.get('/api/demo/state')).json();
  expect(after.world).toEqual(before.world);
  expect(after.playbook).toEqual(before.playbook);
});
