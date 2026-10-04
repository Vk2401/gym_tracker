import { expect, test, type Page } from '@playwright/test';
import { openApp, view } from './helpers';

/** Drags the bottom menu's handle down by `dy` px in `steps` moves, holding before release. */
async function dragMenu(page: Page, dy: number, steps: number, holdMs: number, stepMs = 30) {
  const box = (await page.locator('.gt-menu__panel').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, y + (dy * i) / steps);
    await page.waitForTimeout(stepMs);
  }
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

test('WO-5 menu sheet: short drag springs back, long drag or flick closes', async ({ page }) => {
  await openApp(page);
  const panel = page.locator('.gt-menu__panel');
  const openMenu = async () => {
    await view(page).locator('ion-fab-button').click();
    await expect(panel).toBeVisible();
    await page.waitForTimeout(500); // enter animation
  };

  await openMenu();
  const top = (await panel.boundingBox())!.y;
  await dragMenu(page, 50, 10, 250);
  await page.waitForTimeout(500);
  await expect(panel).toBeVisible();
  expect(Math.abs((await panel.boundingBox())!.y - top)).toBeLessThan(2);

  await dragMenu(page, 140, 14, 150);
  await expect(panel).toHaveCount(0);

  await openMenu();
  await dragMenu(page, 45, 3, 0, 10); // ~1.5 px/ms flick
  await expect(panel).toHaveCount(0);

  // A plain tap on an option still works after drags.
  await openMenu();
  await page.locator('.gt-menu__opt').first().click();
  await expect(page.locator('ion-alert')).toBeVisible();
});
