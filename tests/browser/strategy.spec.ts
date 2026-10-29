import { expect, test } from '../support/browser-fixture.js';

test('coach tests both neutral initiatives, reorders priorities and keeps the active round locked', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/demo/trials') && r.request().method() === 'POST',
  );
  await page.getByLabel('Lesson test scenario').selectOption('neutral');
  await page.getByRole('button', { name: 'Prove this lesson', exact: true }).click();
  const trial = await (await response).json();
  expect(trial.scenario).toBe('neutral');
  expect(trial.paired).toBeDefined();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Both starting initiatives tested', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Neutral opening · seed 42', { exact: true })).toHaveCount(2);
  await expect(dialog.getByText('Carrier dilemma · seed 42', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Opponent initiative first:', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Adopt for next round', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Lesson adopted', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Reset arena for next round', exact: true }).click();
  const catalog = await (await page.request.get('/api/demo/state')).json();
  const r = await page.request.post('/api/demo/trials', {
    data: { sampleId: catalog.samples[2].id },
  });
  expect(r.ok()).toBe(true);
  const t = await r.json();
  expect(
    (
      await page.request.post('/api/demo/adoptions', {
        data: { trialId: t.id, expectedVersion: 1 },
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole('button', { name: /Playbook/ }).click();
  const before = await (await page.request.get('/api/demo/state')).json();
  const reordered = page.waitForResponse(
    (r) => r.url().endsWith('/api/demo/playbook/order') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Move rule 2 up', exact: true }).click();
  expect((await reordered).ok()).toBe(true);
  await expect(page.getByText('Blocked by higher-priority rule', { exact: false })).toBeVisible();
  const after = await (await page.request.get('/api/demo/state')).json();
  expect(after.playbook.version).toBe(3);
  expect(after.playbook.rules.map((r: { id: string }) => r.id)).toEqual(
    before.playbook.rules.map((r: { id: string }) => r.id).reverse(),
  );
  expect(after.world).toEqual(before.world);
  await page.screenshot({ path: '.local/screenshots/strategy-priority-mock.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
