import { expect, test } from '@playwright/test';
import { openApp, view } from './helpers';

test('popups with a text field focus it on open; the keyboard resize glides them', async ({
  page,
}) => {
  await openApp(page);
  await view(page).locator('ion-fab-button').click();
  await page.locator('.gt-menu__opt').first().click(); // Add Workout Group → name prompt
  const input = page.locator('ion-alert input.alert-input');
  await expect(input).toBeFocused();

  // the keyboard shrinks the viewport: the alert moves up over a few frames, not in one jump
  const wrapper = page.locator('ion-alert .alert-wrapper');
  const before = (await wrapper.boundingBox())!.y;
  await page.setViewportSize({ width: 390, height: 380 });
  await page.waitForTimeout(60);
  const during = (await wrapper.boundingBox())!.y;
  await page.waitForTimeout(500);
  const after = (await wrapper.boundingBox())!.y;
  expect(after).toBeLessThan(before);
  expect(during).toBeGreaterThan(after + 5);
  expect(during).toBeLessThanOrEqual(before);
});

test('sheets with a search field focus it on open (Add Exercise)', async ({ page }) => {
  await openApp(page);
  await page.locator('ion-toolbar ion-button.gt-btn-dark').click(); // Quick Go!
  await view(page).getByRole('button', { name: /Add Exercise/ }).first().click();
  await expect(page.locator('ion-modal.show-modal ion-searchbar input')).toBeFocused();
});
