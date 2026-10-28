import { expect, test } from '@playwright/test';

test('shows recorded acrobatics, preserves damage timing and scrubs without touching the live studio', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/combat-lab');
  await expect(page.getByRole('heading', { name: 'Make every hit count.' })).toBeVisible();
  const deck = page.getByRole('region', { name: 'Combat animation preview' });
  await expect(deck).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Aerial kick', exact: true }).click();
  await expect(deck).toHaveAttribute('data-tick', '58');
  await expect(deck).toHaveAttribute('data-rendered-tick', '58');
  await expect(page.getByRole('button', { name: 'Play sparring', exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/combat-aerial-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Somersault', exact: true }).click();
  await page.screenshot({
    path: '.local/screenshots/combat-somersault-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Shield contact', exact: true }).click();
  await expect(deck).toHaveAttribute('data-tick', '20');
  await expect(page.getByText('SHIELD · Rook −10', { exact: true })).toBeVisible();
  await page.getByRole('slider', { name: 'Sparring timeline' }).press('Home');
  await expect(deck).toHaveAttribute('data-tick', '0');
  await page.getByRole('button', { name: 'Play sparring', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause sparring', exact: true })).toBeVisible();
  await expect(deck).not.toHaveAttribute('data-tick', '0');
  await page.getByRole('button', { name: 'Pause sparring', exact: true }).click();
  await page.getByRole('button', { name: 'Full motion', exact: true }).click();
  await expect(deck).toHaveAttribute('data-motion', 'reduced');
  await page.getByRole('button', { name: 'Tagged out', exact: true }).click();
  await expect(page.getByText('Tagged out · respawning', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '.local/screenshots/combat-mobile.png', fullPage: true });
});

test('keeps replay controls and health available without WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/combat-lab');
  await expect(
    page.getByText('Compatibility view · 3D unavailable', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Shield contact', exact: true }).click();
  await expect(page.getByText('SHIELD · Rook −10', { exact: true })).toBeVisible();
});
