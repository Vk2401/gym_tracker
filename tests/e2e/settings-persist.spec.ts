import { expect, test } from '@playwright/test';
import { nav, openApp, view } from './helpers';

const stored = (page: import('@playwright/test').Page) =>
  page.evaluate(
    async () =>
      (await (window as any).__gt.getDb().query('SELECT weight_unit FROM preferences'))[0]
        .weight_unit as string,
  );
const checked = (page: import('@playwright/test').Page) =>
  view(page).locator('ion-segment-button.segment-button-checked', { hasText: /^(kg|lb)$/ });

test('ST-1 / NFR-3: a setting that fails to save is reported and snaps back; a saved one survives reopen', async ({
  page,
}) => {
  await openApp(page);
  await nav(page, '#/settings');

  // writes to the weight unit fail (e.g. storage busy) until the fault is lifted
  await page.evaluate(() => {
    const db = (window as any).__gt.getDb();
    const run = db.run.bind(db);
    (window as any).__lift = () => (db.run = run);
    db.run = async (sql: string, params?: unknown[]) => {
      if (sql.includes('weight_unit')) throw new Error('disk I/O error');
      return run(sql, params);
    };
  });
  await view(page).locator('ion-segment-button', { hasText: /^lb$/ }).click();
  await expect(page.locator('ion-toast')).toContainText("Couldn't save that change");
  await expect(checked(page)).toHaveText('kg');
  expect(await stored(page)).toBe('kg');

  // saving works again: the change is stored and still there after reopening the app
  await page.evaluate(() => (window as any).__lift());
  await view(page).locator('ion-segment-button', { hasText: /^lb$/ }).click();
  await expect.poll(() => stored(page)).toBe('lb');
  await nav(page, '#/settings');
  await expect(checked(page)).toHaveText('lb');
});

test('ST-1..7: every setting changed in Settings is still set after reopening the app', async ({
  page,
}) => {
  await openApp(page);
  await nav(page, '#/settings');
  const prefs = () =>
    page.evaluate(
      async () =>
        (
          await (window as any).__gt
            .getDb()
            .query(
              'SELECT weight_unit, distance_unit, week_start, show_dots, sound, haptics, keep_awake, appearance FROM preferences',
            )
        )[0],
    );
  const before = await prefs();
  const seg = (label: string, option: string) =>
    view(page)
      .locator(`ion-segment[aria-label="${label}"] ion-segment-button`, { hasText: option })
      .click();
  await seg('Weight unit', 'lb');
  await seg('Distance unit', 'mi');
  await seg('First day of week', 'Mon');
  await seg('Appearance', 'Dark');
  for (const t of await view(page).locator('ion-toggle').all()) {
    const label = (await t.textContent())?.trim();
    if (label && /sound|haptic|awake|screen|dots/i.test(label)) await t.click();
  }
  await expect.poll(prefs).toMatchObject({
    weight_unit: 'lb',
    distance_unit: 'mi',
    week_start: 'mon',
    appearance: 'dark',
  });
  const changed = await prefs();
  for (const k of ['show_dots', 'sound', 'haptics', 'keep_awake'])
    expect(changed[k], k).toBe(before[k] ? 0 : 1);

  await nav(page, '#/settings'); // reopen
  expect(await prefs()).toEqual(changed);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    view(page).locator('ion-segment[aria-label="Weight unit"] .segment-button-checked'),
  ).toHaveText('lb');
});
