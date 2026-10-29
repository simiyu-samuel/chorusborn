import { SAMPLE_LESSONS } from '@chorusborn/contracts';
import { addLesson, createPlaybook, createRivalWorld, step } from '@chorusborn/sim';
import { visibleLesson } from '../../apps/web/src/game/presentation.js';
import { expect, test } from '../support/browser-fixture.js';

for (const graphics of ['webgl', 'compatibility'] as const) {
  test(`rivalry overlay fits wrapped attribution and initiative in ${graphics} view`, async ({
    page,
  }) => {
    // Generate a real execution receipt, then freeze that recorded decision.
    // This presentation fixture does not depend on wall-clock UI/engine timing.
    const author = 'Other community viewer';
    let world = createRivalWorld([
      {
        name: 'fixture_host',
        playbook: addLesson(createPlaybook(), SAMPLE_LESSONS[0]!.candidate, { author }),
      },
      { name: 'fixture_guest', playbook: createPlaybook() },
    ]);
    world.status = 'running';
    for (let frame = 0; frame < 1200 && !visibleLesson(world, 'both'); frame++) world = step(world);
    expect(visibleLesson(world, 'both')?.author).toBe(author);
    world.status = 'paused';
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('chorusborn.low-effects', 'true'));
    if (graphics === 'compatibility')
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
          value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
            return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...args]);
          },
        });
      });
    await page.route('**/api/demo/overlay?**', (route) =>
      route.fulfill({ json: { world, mode: 'rivalry' } }),
    );
    await page.routeWebSocket('**/ws/demo?**', (socket) => {
      socket.send(JSON.stringify({ type: 'overlay', world, mode: 'rivalry' }));
    });
    await page.goto('/overlay?studio=layout-fixture&key=layout-fixture');
    await expect(page.locator('.game-view')).toHaveAttribute('data-renderer', graphics, {
      timeout: 30_000,
    });
    await expect(page.locator('.game-lesson-credit')).toContainText(author);
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > innerWidth,
          vertical: document.documentElement.scrollHeight > innerHeight,
        })),
      ).toEqual({ horizontal: false, vertical: false });
      await expect(page.locator('.initiative-cue')).toBeInViewport();
      await expect(page.locator('.game-lesson-credit')).toBeInViewport();
      await expect(
        page.getByRole('complementary', { name: 'How viewers participate' }),
      ).toBeInViewport();
      expect((await page.locator('.game-viewport').boundingBox())!.height).toBeGreaterThan(200);
    }
    await page.screenshot({ path: `.local/screenshots/overlay-layout-${graphics}.png` });
  });
}
