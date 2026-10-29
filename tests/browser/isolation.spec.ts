import { expect, test } from '../support/browser-fixture.js';

test('an isolated scenario keeps the real studio admission limit', async ({ request }) => {
  for (let index = 0; index < 20; index++) {
    const opened = await request.get('/api/demo/state', { headers: { cookie: '' } });
    expect(opened.status()).toBe(200);
  }
  const full = await request.get('/api/demo/state', { headers: { cookie: '' } });
  expect(full.status()).toBe(429);
  expect((await full.json()).message).toContain('Studio capacity reached');
});

test('the next scenario connects with a fresh studio and playbook', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  const state = await (await page.request.get('/api/demo/state')).json();
  expect(state.playbook.version).toBe(0);
  expect(state.playbook.rules).toEqual([]);
  expect(state.world.status).toBe('paused');
});
