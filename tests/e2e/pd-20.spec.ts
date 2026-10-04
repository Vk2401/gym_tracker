import { expect, test } from '@playwright/test';
import { nav, openApp, view } from './helpers';

for (const [scheme, bg] of [
  ['light', 'rgb(235, 241, 254)'],
  ['dark', 'rgb(10, 20, 48)'],
] as const) {
  test(`PD-20: the launch splash uses the app's ${scheme} ground`, async ({ browser }) => {
    const page = await browser.newPage({ colorScheme: scheme });
    // keep the splash on screen: the app bundle never loads
    await page.route(/\/assets\/.*\.js$/, (r) => r.abort());
    await page.goto('/');
    await expect(page.locator('#splash')).toHaveCSS('background-color', bg);
    await page.close();
  });
}

test('PD-20: Settings lists the permissions native features use', async ({ page }) => {
  await openApp(page);
  await nav(page, '#/settings');
  await expect(view(page).getByRole('heading', { name: 'Permissions' })).toBeVisible();
  await expect(view(page).getByText('Keep screen on', { exact: true })).toBeVisible();
  // notifications / exact alarms exist only in the native app
  await expect(view(page).getByText('Alarms & reminders')).toHaveCount(0);
});
