import { expect, test } from '@playwright/test';
import { nav, openApp, seedTemplate, tab, view } from './helpers';

test('PD-17: a tab tap opens the tab root, not the detail screen last viewed', async ({ page }) => {
  await openApp(page);
  const id = await seedTemplate(page, 'Push Day', []);
  await nav(page, `#/workouts/${id}`);
  await expect(view(page).getByRole('heading', { name: 'Push Day' })).toBeVisible();

  await tab(page, 'Logs').click();
  await expect(page).toHaveURL(/#\/logs$/);
  await tab(page, 'Workouts').click();
  await expect(page).toHaveURL(/#\/workouts$/);
  await expect(view(page).getByPlaceholder('Search Workouts')).toBeVisible();

  // Tapping the active tab from a detail screen also returns to its root.
  await view(page).getByText('Push Day').click();
  await expect(page).toHaveURL(new RegExp(`#/workouts/${id}$`));
  await tab(page, 'Workouts').click();
  await expect(page).toHaveURL(/#\/workouts$/);
});

test('SS-3 resume banner floats 12px above the tab bar, also with an Android bottom inset', async ({
  page,
}) => {
  await openApp(page);
  // The Android shell reports the gesture-bar inset through --safe-area-inset-bottom.
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px'),
  );
  await page.locator('ion-toolbar ion-button.gt-btn-dark').click(); // Quick Go!
  await tab(page, 'Explore').click();
  const banner = page.locator('.gt-bottom-stack .gt-resume');
  await expect(banner).toBeVisible();
  await page.waitForTimeout(600); // bar entrance animation
  const bar = (await banner.boundingBox())!;
  const tabs = (await page.locator('ion-tab-bar').boundingBox())!;
  expect(Math.round(tabs.y - (bar.y + bar.height))).toBe(12);
});
