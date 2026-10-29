import { expect, test } from '../support/browser-fixture.js';

test('a viewer learns and copies a command without signing in or calling the coach API', async ({
  page,
  context,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) apiRequests.push(r.url());
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/guide');
  await expect(
    page.getByRole('heading', { name: 'Your chat. Their next move.', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /Two champions start at opposite home gates/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Teach your first tactic', exact: false }).click();
  await page.getByRole('button', { name: 'Copy Race for the core command', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '!teach When the core is available, collect it by the direct route.',
  );
  await expect(
    page.getByText('Copy Race for the core command copied.', { exact: true }),
  ).toHaveCount(1);
  await page.getByRole('link', { name: 'Your lesson', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Adopted', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Used', exact: true })).toBeVisible();
  await page.getByText('Why has my lesson not appeared in the match?', { exact: true }).click();
  await expect(
    page.getByText('It may still need review, testing or adoption.', { exact: false }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
  await page.screenshot({ path: '.local/screenshots/viewer-guide-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '.local/screenshots/viewer-guide-mobile.png', fullPage: true });
});

test('copy has a manual fallback and the shared overlay teaches viewers without exposing coach controls', async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error('Clipboard denied');
        },
      },
    });
  });
  await page.goto('/guide');
  await page.getByRole('button', { name: 'Copy Protect the carrier command', exact: true }).click();
  const manual = page.getByRole('textbox', {
    name: 'Copy Protect the carrier command manually',
    exact: true,
  });
  await expect(manual).toHaveValue(
    '!teach When carrying the core, head home and use shield when ready.',
  );
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Share the viewer guide' })).toBeVisible();
  await page.getByRole('button', { name: 'Copy viewer guide link', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Copy viewer guide link manually', exact: true }),
  ).toHaveValue('http://127.0.0.1:5273/guide');
  const path = await page
    .getByRole('link', { name: 'Open overlay', exact: true })
    .getAttribute('href');
  const spectator = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  try {
    const overlay = await spectator.newPage();
    await overlay.goto(`http://127.0.0.1:5273${path}`);
    await expect(overlay.getByRole('img', { name: /Core Run arena/ })).toBeVisible();
    const reminder = overlay.getByRole('complementary', { name: 'How viewers participate' });
    await expect(reminder).toContainText('!teach When carrying the core, return home cautiously.');
    const guide = reminder.getByRole('link', { name: 'How to play', exact: false });
    await expect(guide).toHaveAttribute('href', '/guide');
    await expect(guide).toHaveAttribute('rel', 'noreferrer');
    await expect(overlay.getByRole('button')).toHaveCount(0);
    expect(await overlay.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(await overlay.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(
      false,
    );
    const response = await spectator.request.post('http://127.0.0.1:5273/api/demo/controls', {
      data: { action: 'reset' },
    });
    expect(response.status()).toBe(401);
    await overlay.screenshot({
      path: '.local/screenshots/viewer-reminder-overlay.png',
      fullPage: true,
    });
  } finally {
    await spectator.close();
  }
});
