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

test('coach connects through a cross-site OAuth callback and disconnects with a mocked provider', async ({
  page,
}) => {
  // Playwright routes match the first request in a redirect chain. Inspect the real
  // start response without following it, then make the provider navigation a new request.
  await page.route('**/auth/twitch/start', async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    expect(response.status()).toBe(302);
    const destination = response.headers().location!;
    expect(new URL(destination).origin).toBe('https://id.twitch.tv');
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<html><body><a href="${destination.replaceAll('&', '&amp;')}">Continue to mocked Twitch</a></body></html>`,
    });
  });
  await page.route('https://id.twitch.tv/oauth2/authorize?**', async (route) => {
    const authorization = new URL(route.request().url());
    expect(authorization.searchParams.get('scope')).toBe('user:read:chat');
    const callback = new URL('http://localhost:3001/auth/twitch/callback');
    callback.searchParams.set('state', authorization.searchParams.get('state')!);
    callback.searchParams.set('code', 'browser-test-code');
    await route.fulfill({
      contentType: 'text/html',
      body: `<html><body><h1>Mock Twitch authorization</h1><a href="${callback.toString().replaceAll('&', '&amp;')}">Allow test connection</a></body></html>`,
    });
  });
  // Begin on the alternate loopback hostname to verify canonical localhost onboarding.
  await page.goto('/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connections & setup' }).click();
  await page.getByRole('link', { name: 'Connect Twitch', exact: true }).click();
  await page.getByRole('link', { name: 'Continue to mocked Twitch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mock Twitch authorization' })).toBeVisible();
  await page.getByRole('link', { name: 'Allow test connection' }).click();
  await expect(page).toHaveURL('http://localhost:5173/');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Connected as developersimiyu' })).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('Twitch account verified');
  await page.screenshot({ path: '.local/screenshots/twitch-connection-mock.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  const queue = page.getByRole('region', { name: 'Live lesson queue' });
  await expect(queue.getByText('Chat live', { exact: true })).toBeVisible();
  const emit = async (data: unknown) => {
    const response = await page.request.post('http://localhost:3001/__test__/event', { data });
    expect(response.ok()).toBe(true);
  };
  await emit({
    event: {
      message_id: 'browser-lesson-one',
      chatter_user_name: '<b>Viewer One</b>',
      message: { text: '!teach Return home while carrying the core.' },
    },
    duplicate: true,
  });
  await expect(queue.getByRole('article')).toHaveCount(1);
  await expect(queue.getByText('<b>Viewer One</b>', { exact: true })).toBeVisible();
  await expect(
    queue.getByText('Return home while carrying the core.', { exact: true }),
  ).toBeVisible();
  await expect(
    queue.getByText('Received from Twitch · awaiting compiler', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/chat-queue-mock.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.screenshot({ path: '.local/screenshots/chat-queue-mobile-mock.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await queue.getByRole('button', { name: 'Pause intake', exact: true }).click();
  await expect(queue.getByText('Intake paused', { exact: true })).toBeVisible();
  await emit({ event: { message_id: 'browser-paused', chatter_user_id: '790' } });
  await expect(
    queue.getByText('A teaching command arrived while intake was paused.'),
  ).toBeVisible();
  await expect(queue.getByRole('article')).toHaveCount(1);
  await queue.getByRole('button', { name: 'Resume intake', exact: true }).click();
  await emit({
    event: {
      message_id: 'browser-lesson-two',
      chatter_user_id: '790',
      chatter_user_name: 'Viewer Two',
    },
  });
  await expect(queue.getByRole('article')).toHaveCount(2);
  await emit({ type: 'channel.chat.message_delete', event: { message_id: 'browser-lesson-one' } });
  await expect(queue.getByText('This lesson was removed from Twitch chat.')).toBeVisible();
  await expect(queue.getByText('<b>Viewer One</b>', { exact: true })).toHaveCount(0);
  await queue.getByRole('button', { name: 'Reject lesson from Viewer Two', exact: true }).click();
  await expect(queue.getByText('Rejected by coach', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connections & setup', exact: true }).click();
  await dialog.getByRole('button', { name: 'Disconnect Twitch', exact: true }).click();
  await expect(dialog.getByRole('link', { name: 'Connect Twitch', exact: true })).toBeVisible();
  await expect(dialog.getByRole('status')).toHaveText('Twitch disconnected.');
});
