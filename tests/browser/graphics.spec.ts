import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('renders the shared 3D scene, keeps visual settings out of game state, and handles context loss', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const view = page.locator('.game-view');
  await expect(view).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 });
  await page.locator('.game-viewport').scrollIntoViewIfNeeded();
  await expect(page.locator('.game-marker').first()).toBeInViewport();
  await expect(page.locator('.home-marker').last()).toBeInViewport();
  const before = (await page.request.get('/api/demo/state')).json();
  await page.getByRole('button', { name: 'Motion on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Full effects', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Low effects', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  const after = await (await page.request.get('/api/demo/state')).json();
  expect(after.world).toEqual((await before).world);
  await view.screenshot({ path: '.local/screenshots/garden-3d-desktop.png' });
  await page.getByRole('button', { name: 'Reduced motion', exact: true }).click();
  await page.getByRole('button', { name: 'Start round', exact: true }).click();
  const intervals = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        let last = performance.now();
        const values: number[] = [];
        const frame = (now: number) => {
          values.push(now - last);
          last = now;
          if (values.length >= 17) resolve(values.slice(5));
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await page.getByRole('button', { name: 'Pause round', exact: true }).click();
  intervals.sort((a, b) => a - b);
  await writeFile(
    '.local/graphics-frame-sample.json',
    JSON.stringify(
      {
        environment:
          'Chromium browser-test process; low effects; one running arena; 12 animation-frame intervals; not an OBS benchmark',
        medianMs: intervals[Math.floor(intervals.length / 2)],
        p95Ms: intervals[Math.floor(intervals.length * 0.95)],
      },
      null,
      2,
    ),
  );
  await page.locator('.game-viewport canvas').evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(page.getByText('Compatibility view · 3D graphics unavailable')).toBeVisible();
  await expect(view).toHaveAttribute('data-renderer', 'compatibility');
  await expect(page.getByRole('button', { name: 'Start round', exact: true })).toBeEnabled();
});

test('preserves playable state when WebGL is unavailable and respects reduced-motion preference', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args]);
      },
    });
  });
  await page.goto('/');
  await expect(page.getByText('Compatibility view · 3D graphics unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Start round', exact: true }).click();
  await expect(page.getByRole('img', { name: /Core Run arena.*running/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause round', exact: true }).click();
});
