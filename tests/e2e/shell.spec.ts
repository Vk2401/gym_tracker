import { expect, test } from '@playwright/test';

test('NAV-1/2: five tabs and the seeded exercise library (Gate 1)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const label of ['Workouts', 'Exercises', 'Logs', 'Explore', 'Settings']) {
    await expect(page.locator('ion-tab-button', { hasText: label })).toBeVisible();
  }
  await expect(
    page.getByText('No workouts yet. Build your first template to plan your week.'),
  ).toBeVisible();

  await page.locator('ion-tab-button', { hasText: 'Exercises' }).click();
  // EX-2 / AC-4 order
  const items = page.locator('ion-item h2');
  await expect(items.first()).toHaveText('3/4 Sit-Up');
  await expect(items.nth(1)).toHaveText('90/90 Hamstring');
  await expect(items.nth(2)).toHaveText('Ab Crunch Machine');
  expect(errors).toEqual([]);
});

test('ST-7: appearance switch is persisted and applied', async ({ page }) => {
  await page.goto('/#/settings');
  await page.locator('ion-segment-button', { hasText: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('ion-segment-button', { hasText: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('device-independence: no horizontal scroll at 320px and max text scale', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/exercises');
  await page.evaluate(() => document.documentElement.style.setProperty('--gt-text-scale', '1.35'));
  await expect(page.locator('ion-item').first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
