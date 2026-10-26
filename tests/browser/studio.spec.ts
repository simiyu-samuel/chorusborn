import { expect, test } from '@playwright/test';

test('coach proves, adopts, starts a pinned round and shares a read-only overlay', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Great minds play together.' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/studio-desktop.png', fullPage: true });
  await expect(
    page.getByText('Twitch and the language compiler are not connected.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prove this lesson', exact: true }).click();
  const comparison = page.getByRole('dialog');
  await expect(comparison).toBeVisible();
  await expect(comparison.getByText('Same starting state. One changed playbook.')).toBeVisible();
  const slider = comparison.getByRole('slider', { name: 'Replay timeline' });
  await slider.focus();
  await slider.press('Home');
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await comparison.getByRole('button', { name: 'Adopt for next round' }).click();
  await expect(comparison.getByRole('button', { name: 'Lesson adopted' })).toBeDisabled();
  await comparison.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByText('v1 ready next round')).toBeVisible();
  await page.getByRole('button', { name: 'Reset arena for next round' }).click();
  await expect(page.getByText('Round v1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start round', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause round' })).toBeVisible();
  await expect(page.getByText('Local coach · tick', { exact: false }).first()).toBeVisible();
  const overlayPath = await page.getByRole('link', { name: 'Open overlay' }).getAttribute('href');
  const spectator = await context.browser()!.newContext();
  const overlay = await spectator.newPage();
  await overlay.goto(`http://127.0.0.1:5173${overlayPath}`);
  await expect(overlay.getByText('LOCAL FIXTURE · READ-ONLY', { exact: false })).toBeVisible();
  await expect(overlay.getByRole('img', { name: /Core Run arena/ })).toBeVisible();
  await expect(overlay.getByRole('button')).toHaveCount(0);
  const forbidden = await spectator.request.post('http://127.0.0.1:5173/api/demo/controls', {
    data: { action: 'pause' },
  });
  expect(forbidden.status()).toBe(401);
  await spectator.close();
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(page.getByRole('button', { name: 'Start round', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Playbook/ }).click();
  await expect(page.getByRole('heading', { name: 'Bring the core home' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile studio fits the viewport and remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prove this lesson', exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: '.local/screenshots/studio-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Prove this lesson', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
