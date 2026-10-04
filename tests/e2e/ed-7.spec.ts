import { expect, test } from '@playwright/test';
import { nav, openApp, view } from './helpers';

const field = (page: import('@playwright/test').Page) =>
  view(page).locator('ion-input.gt-tutorial-input input.native-input:not(.cloned-input)');

test('ED-7 / PD-18: exercise tutorial link saves, opens outside the app, rejects non-links', async ({
  page,
}) => {
  await openApp(page);
  await nav(page, '#/exercises/ex-bench-press');
  await field(page).fill('youtube.com/watch?v=abc');
  await field(page).blur();

  const link = view(page).locator('ion-item.gt-tutorial-link');
  await expect(link).toContainText('Watch tutorial');
  await expect(link).toContainText('YouTube');
  await expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abc');
  await expect(link).toHaveAttribute('target', '_blank');

  await field(page).fill('bench press');
  await field(page).blur();
  await expect(page.locator('ion-toast')).toContainText('Enter a web link');
  await expect(field(page)).toHaveValue('https://youtube.com/watch?v=abc');

  // The link follows the exercise into a workout log.
  await nav(page, '#/workouts');
  await page.locator('ion-toolbar ion-button.gt-btn-dark').click(); // Quick Go!
  await page.evaluate(async () => {
    const g = (window as any).__gt;
    await g.mutate(async (db: any) => {
      const [s] = await db.query('SELECT log_id FROM active_session');
      await g.logs.addLoggedExercise(db, s.log_id, 'ex-bench-press');
    });
  });
  await page.reload();
  await expect(view(page).locator('a.gt-tutorial-chip')).toHaveAttribute(
    'href',
    'https://youtube.com/watch?v=abc',
  );
});

test('EX-4: the Exercises search stays pinned under the header while the list scrolls', async ({
  page,
}) => {
  await openApp(page);
  await nav(page, '#/exercises');
  const search = view(page).locator('.gt-sticky-search');
  const before = (await search.boundingBox())!.y;
  await view(page)
    .locator('ion-content')
    .evaluate((c: any) => c.scrollToPoint(0, 1500, 0));
  await expect(search).toHaveClass(/is-stuck/);
  const header = (await view(page).locator('ion-header').boundingBox())!;
  const pinned = (await search.boundingBox())!.y;
  expect(pinned).toBeLessThan(before);
  expect(Math.abs(pinned - (header.y + header.height))).toBeLessThan(2);
});
