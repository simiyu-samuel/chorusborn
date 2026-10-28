import { expect, test, type Page } from '@playwright/test';
const authorize = async (page: Page, rival: boolean) => {
  await page.route('**/auth/twitch/start', async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers().location!;
    await route.fulfill({
      contentType: 'text/html',
      body: `<a href="${location.replaceAll('&', '&amp;')}">Mock Twitch login</a>`,
    });
  });
  await page.route('https://id.twitch.tv/oauth2/authorize?**', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('scope')).toBe('user:read:chat');
    const callback = new URL('http://localhost:3101/auth/twitch/callback');
    callback.searchParams.set('state', url.searchParams.get('state')!);
    callback.searchParams.set('code', rival ? 'browser-rival-code' : 'browser-rival-host-code');
    await route.fulfill({
      contentType: 'text/html',
      body: `<a href="${callback.toString().replaceAll('&', '&amp;')}">Authorize mocked ${rival ? 'fixture_guest' : 'fixture_host'}</a>`,
    });
  });
  await page.goto('http://localhost:5273/');
  await expect(page.getByText('Engine connected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connections & setup', exact: true }).click();
  await page.getByRole('link', { name: 'Connect Twitch', exact: true }).click();
  await page.getByRole('link', { name: 'Mock Twitch login', exact: true }).click();
  await page
    .getByRole('link', {
      name: `Authorize mocked ${rival ? 'fixture_guest' : 'fixture_host'}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: `Connected as ${rival ? 'fixture_guest' : 'fixture_host'}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByText('Chat live', { exact: true })).toBeVisible();
};
test('two independently signed-in streamers teach their own champions and share one mutually started match', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const rivalContext = await browser.newContext(),
    spectator = await browser.newContext();
  try {
    const rival = await rivalContext.newPage();
    await authorize(page, false);
    await authorize(rival, true);
    const teach = async (target: Page, channelId: string, text: string, author: string) => {
      const response = await target.request.post('http://localhost:3101/__test__/event', {
        data: {
          channelId,
          event: {
            message_id: `rivalry-${channelId}`,
            chatter_user_id: channelId === '112233' ? '9001' : '9002',
            chatter_user_name: author,
            message: { text: `!teach ${text}` },
          },
        },
      });
      expect(response.ok()).toBe(true);
    };
    const aText = 'Carry the core home by a cautious route for our community.',
      bText = 'Return the core home cautiously for the rival community.';
    await teach(page, '112233', aText, 'One community viewer');
    await teach(rival, '654321', bText, 'Other community viewer');
    const ownQueue = page.getByRole('region', { name: 'Live lesson queue' }),
      peerQueue = rival.getByRole('region', { name: 'Live lesson queue' });
    await expect(ownQueue.getByText(aText, { exact: true })).toBeVisible();
    await expect(ownQueue.getByText(bText, { exact: true })).toHaveCount(0);
    await expect(peerQueue.getByText(bText, { exact: true })).toBeVisible();
    await expect(peerQueue.getByText(aText, { exact: true })).toHaveCount(0);
    // Compile/prove/adopt the second channel's real ingress proposal through the ordinary UI.
    await peerQueue.getByRole('button', { name: 'Compile lesson', exact: true }).click();
    await expect(
      peerQueue.getByText('fixture_guest is carrying the core', { exact: false }),
    ).toBeVisible();
    const proofResponse = rival.waitForResponse(
      (r) => r.url().endsWith('/api/demo/trials') && r.request().method() === 'POST',
    );
    await peerQueue.getByRole('button', { name: 'Prove community lesson', exact: true }).click();
    expect((await proofResponse).ok()).toBe(true);
    await rival
      .getByRole('dialog')
      .getByRole('button', { name: 'Adopt for next round', exact: true })
      .click();
    await expect(rival.getByRole('button', { name: 'Lesson adopted', exact: true })).toBeDisabled();
    await rival.getByRole('button', { name: 'Close dialog', exact: true }).click();
    const onePanel = page.getByRole('region', { name: 'Streamer rivalry' }),
      twoPanel = rival.getByRole('region', { name: 'Streamer rivalry' });
    await onePanel.getByRole('textbox', { name: 'Rival streamer username' }).fill('fixture_guest');
    await onePanel.getByRole('button', { name: 'Send challenge', exact: true }).click();
    await twoPanel.getByRole('button', { name: 'Accept fixture_host', exact: true }).click();
    await expect(onePanel.getByText('fixture_host', { exact: true })).toBeVisible();
    await expect(onePanel.getByText('fixture_guest', { exact: true })).toBeVisible();
    await onePanel.getByRole('button', { name: 'Ready for rivalry', exact: true }).click();
    await expect(
      onePanel.getByRole('button', { name: 'Waiting for rival', exact: true }),
    ).toBeDisabled();
    expect(
      (await (await page.request.get('http://localhost:5273/api/demo/state')).json()).world.status,
    ).toBe('paused');
    await twoPanel.getByRole('button', { name: 'Ready for rivalry', exact: true }).click();
    await expect(
      onePanel.getByRole('button', { name: 'Pause rivalry', exact: true }),
    ).toBeVisible();
    await onePanel.getByRole('button', { name: 'Pause rivalry', exact: true }).click();
    await expect(
      twoPanel.getByRole('button', { name: 'Ready for rivalry', exact: true }),
    ).toBeVisible();
    const a = await (await page.request.get('http://localhost:5273/api/demo/state')).json(),
      b = await (await rival.request.get('http://localhost:5273/api/demo/state')).json();
    expect(a.mode).toBe('rivalry');
    expect(b.mode).toBe('rivalry');
    expect(a.rivalry.match.id).toBe(b.rivalry.match.id);
    expect(a.world).toEqual(b.world);
    expect(a.world.status).toBe('paused');
    expect(b.selfActor).toBe('b');
    expect(b.world.champions[1].playbook.version).toBe(1);
    expect(b.world.champions[1].playbook.rules[0].author).toBe('Other community viewer');
    const overlay = await spectator.newPage();
    await overlay.goto(`http://localhost:5273${a.overlayPath}`);
    await expect(overlay.getByText('LOCAL RIVALRY · READ-ONLY', { exact: false })).toBeVisible();
    await expect(
      overlay.getByRole('img', { name: /Core Run arena\. fixture_host.*fixture_guest/ }),
    ).toBeVisible();
    expect(
      (
        await spectator.request.post('http://localhost:5273/api/rivalry/controls', {
          data: { action: 'pause' },
        })
      ).status(),
    ).toBe(401);
    await overlay.screenshot({
      path: '.local/screenshots/rivalry-mocked-overlay.png',
      fullPage: true,
    });
    await rival.setViewportSize({ width: 390, height: 844 });
    expect(await rival.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await rival.screenshot({
      path: '.local/screenshots/rivalry-mocked-mobile.png',
      fullPage: true,
    });
    await onePanel.getByRole('button', { name: 'End rivalry', exact: true }).click();
    await expect(
      twoPanel.getByRole('button', { name: 'Send challenge', exact: true }),
    ).toBeVisible();
  } finally {
    await rivalContext.close();
    await spectator.close();
  }
});
