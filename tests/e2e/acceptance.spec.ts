import { expect, test } from '@playwright/test';
import { nav, openApp, seedLog, seedTemplate, tab, view } from './helpers';

test.describe.configure({ mode: 'parallel' });

const sets = (n: number, reps: number, weightKg: number) =>
  Array.from({ length: n }, () => ({ reps, weightKg }));

test('AC-1 (WO-3, BR-3): row shows 9 Exercises, 30 Sets, 356 Reps', async ({ page }) => {
  await openApp(page);
  const ids = [
    'ex-bench-press',
    'ex-incline-db-press',
    'ex-cable-fly',
    'ex-chest-press-machine',
    'ex-dips',
    'ex-push-up',
    'ex-triceps-pushdown',
    'ex-skull-crusher',
    'ex-lateral-raise',
  ];
  // 8 × 3 sets + 1 × 6 sets = 30 sets; reps: 29 sets × 12 + 1 × 8 = 356
  const exercises = ids.map((id, i) => ({
    id,
    sets:
      i < 8
        ? sets(3, 12, 20)
        : [...sets(5, 12, 10), { reps: 8, weightKg: 10 }, { reps: 15, weightKg: 5, warmup: true }],
  }));
  await seedTemplate(page, 'Monday - Chest', exercises);
  await expect(page.getByText('Next Workout: 9 Exercises, 30 Sets, 356 Reps')).toBeVisible();
  await expect(page.getByText('Last Completed: Never')).toBeVisible();
});

test('AC-2 (WO-5): + shows Add Workout Group and Add Workout Template', async ({ page }) => {
  await openApp(page);
  await view(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Workout Group' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Workout Template' }).click();
  await page.getByPlaceholder('e.g. Monday - Chest').fill('Thursday - Shoulder Lead');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(
    view(page).locator('h1.gt-large-title', { hasText: 'Thursday - Shoulder Lead' }),
  ).toBeVisible();
  await expect(page.getByText('This workout has no exercises.')).toBeVisible();
});

test('AC-3 (WT-4): template + shows WOD, SuperSet and Exercise', async ({ page }) => {
  await openApp(page);
  const id = await seedTemplate(page, 'Legs', [{ id: 'ex-back-squat', sets: sets(3, 5, 100) }]);
  await nav(page, `#/workouts/${id}`);
  await view(page).getByRole('button', { name: 'Add', exact: true }).click();
  for (const name of ['Add Workout of the Day', 'Add SuperSet', 'Add Exercise']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Add Exercise' }).click();
  await page.locator('ion-modal ion-searchbar input').fill('leg press');
  await page.locator('ion-modal ion-item', { hasText: 'Leg Press' }).click();
  await expect(view(page).locator('.gt-block__title', { hasText: 'LEG PRESS' })).toBeVisible();
});

test('AC-4 / AC-5 (EX-2, EX-3, ED-2, ED-3): library order and 3/4 Sit-Up detail', async ({
  page,
}) => {
  await openApp(page, '#/exercises');
  const rows = page.locator('ion-item h2');
  await expect(rows.nth(0)).toHaveText('3/4 Sit-Up');
  await expect(rows.nth(1)).toHaveText('90/90 Hamstring');
  await expect(rows.nth(2)).toHaveText('Ab Crunch Machine');
  const first = page.locator('ion-item').filter({ hasText: '3/4 Sit-Up' });
  await expect(first).toContainText('Focus: Reps, Weight');
  await expect(first).toContainText('Equipment: None');
  await expect(first).toContainText('Abdominals (Lower)');
  await first.click();
  const v = view(page);
  await expect(v.locator('h1.gt-large-title', { hasText: '3/4 Sit-Up' })).toBeVisible();
  await expect(v.locator('ion-item', { hasText: 'Primary Focus' })).toContainText('Reps');
  await expect(v.locator('ion-item', { hasText: 'Secondary Focus' })).toContainText('Weight');
  await expect(
    v.locator('ion-item', { hasText: 'Abdominals (Lower)' }).locator('.gt-dot'),
  ).toHaveCSS('background-color', 'rgb(245, 158, 11)');
});

test('AC-6 (LG-3, LG-4): September 2026 logged days and dots', async ({ page }) => {
  await openApp(page);
  const days = [1, 2, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19];
  for (const d of days) {
    await seedLog(page, {
      date: `2026-09-${String(d).padStart(2, '0')}`,
      start: '10:00',
      end: '11:00',
      exercises: [{ id: 'ex-bench-press', sets: [{ reps: 5, weightKg: 60 }] }],
    });
  }
  await nav(page, '#/logs');
  // navigate to September 2026
  for (
    let i = 0;
    i < 24 && !(await page.getByRole('heading', { name: 'September 2026' }).isVisible());
    i++
  ) {
    await page.getByRole('button', { name: 'Previous month' }).click();
  }
  for (const d of days) {
    const cell = page.locator(`[data-date="2026-09-${String(d).padStart(2, '0')}"]`);
    await expect(cell).toHaveClass(/gt-day--logged/);
    await expect(cell.locator('.gt-day__dots .gt-dot')).toHaveCount(3); // Chest, Front Delts, Triceps
  }
  for (const d of [3, 4, 12, 18]) {
    await expect(
      page.locator(`[data-date="2026-09-${String(d).padStart(2, '0')}"]`),
    ).not.toHaveClass(/gt-day--logged/);
  }
});

test('AC-7 (LG-7, BR-4, BR-5): card shows duration and exercise count', async ({ page }) => {
  await openApp(page);
  const ids = [
    'ex-bench-press',
    'ex-cable-fly',
    'ex-dips',
    'ex-push-up',
    'ex-lat-pulldown',
    'ex-barbell-row',
    'ex-db-curl',
    'ex-plank',
  ];
  await seedLog(page, {
    date: '2026-09-10',
    start: '10:30',
    end: '13:34:45',
    name: 'Chest Day',
    exercises: ids.map((id) => ({ id, sets: [{ reps: 10, weightKg: 10 }] })),
  });
  await nav(page, '#/logs');
  for (
    let i = 0;
    i < 24 && !(await page.getByRole('heading', { name: 'September 2026' }).isVisible());
    i++
  ) {
    await page.getByRole('button', { name: 'Previous month' }).click();
  }
  await page.locator('[data-date="2026-09-10"]').click();
  const card = page.locator('ion-item', { hasText: 'Chest Day' });
  await expect(card).toContainText('Completed in 3 hours 4 minutes');
  await expect(card).toContainText('Exercises performed 8');
});

test('AC-8 / AC-9 / AC-10 (WL-4, WL-6, WL-7): columns, completion toggle, add set', async ({
  page,
}) => {
  await openApp(page);
  const t = await seedTemplate(page, 'Core', [
    { id: 'ex-rope-jumping', sets: [{ timeS: 300, distanceKm: 1 }] },
    { id: 'ex-cable-crunch', sets: [{ reps: 15, weightKg: 65 }] },
  ]);
  await nav(page, `#/workouts/${t}`);
  await page.getByRole('button', { name: 'Start Workout' }).click();
  await expect(view(page).getByRole('button', { name: 'Finish Workout' })).toBeVisible();
  const rope = view(page).locator('ion-list.gt-block', { hasText: 'ROPE JUMPING' });
  const crunch = view(page).locator('ion-list.gt-block', { hasText: 'CABLE CRUNCH' });
  await expect(rope.locator('.gt-sets__head')).toContainText('TIME');
  await expect(rope.locator('.gt-sets__head')).toContainText('DISTANCE');
  await expect(rope.locator('.gt-sets__head')).toContainText('RPE');
  await expect(crunch.locator('.gt-sets__head')).toContainText('REPS');
  await expect(crunch.locator('.gt-sets__head')).toContainText('WEIGHT');
  await expect(crunch.getByLabel('Cable Crunch set 1 RPE')).toHaveAttribute('placeholder', 'RPE');

  const check = crunch.getByRole('checkbox', { name: 'Complete Cable Crunch set 1' });
  await expect(check).toHaveAttribute('aria-checked', 'false');
  await check.click();
  await expect(check).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.gt-rest')).toBeVisible(); // SS-1 rest timer
  await check.click();
  await expect(check).toHaveAttribute('aria-checked', 'false');

  await crunch.getByRole('button', { name: '+ Add Set' }).click();
  await expect(crunch.getByLabel('Cable Crunch set 2 reps')).toHaveValue('15');
  await expect(crunch.getByLabel('Cable Crunch set 2 weight')).toHaveValue('65.0');
});

test('AC-11 (BR-2): Last Completed 13/09/26', async ({ page }) => {
  await openApp(page);
  const t = await seedTemplate(page, 'Thursday - Shoulder Lead', [
    { id: 'ex-overhead-press', sets: sets(3, 8, 40) },
  ]);
  await seedLog(page, {
    date: '2026-09-06',
    start: '10:00',
    end: '11:00',
    templateId: t,
    exercises: [],
  });
  await seedLog(page, {
    date: '2026-09-13',
    start: '10:00',
    end: '11:00',
    templateId: t,
    exercises: [],
  });
  await nav(page, '#/workouts');
  await expect(page.locator('ion-item', { hasText: 'Thursday - Shoulder Lead' })).toContainText(
    'Last Completed: 13/09/26',
  );
});

test('AC-12 (NFR-2, NFR-3): completed sets survive closing the app offline', async ({
  page,
  context,
}) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Quick Go!' }).click();
  await page.getByRole('button', { name: '+ Add Exercise' }).click();
  await page.locator('ion-modal ion-searchbar input').fill('bench press');
  await page
    .locator('ion-modal ion-item', { hasText: /^Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Bench Press set 1 reps').fill('5');
  await page.getByLabel('Bench Press set 1 weight').fill('100');
  await page.getByLabel('Bench Press set 1 weight').press('Enter');
  await page.getByRole('checkbox', { name: 'Complete Bench Press set 1' }).click();
  await context.setOffline(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const g = (window as any).__gt;
        const rows = await g.getDb().query('SELECT completed, reps, weight_kg FROM log_set');
        return rows;
      }),
    )
    .toEqual([{ completed: 1, reps: 5, weight_kg: 100 }]);
  await context.setOffline(false);
  await page.reload();
  await page.waitForFunction(() => (window as any).__gt);
  await expect(page.getByRole('checkbox', { name: 'Complete Bench Press set 1' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByLabel('Bench Press set 1 weight')).toHaveValue('100.0');
});

test('AC-13 (XP-3): weekly volume 4,125 kg', async ({ page }) => {
  await openApp(page);
  const today = new Date().toISOString().slice(0, 10);
  await seedLog(page, {
    date: today,
    start: '00:10',
    end: '00:50',
    exercises: [
      { id: 'ex-back-squat', sets: sets(3, 15, 65) },
      { id: 'ex-leg-press', sets: [...sets(3, 10, 40), { reps: 10, weightKg: 20, warmup: true }] },
    ],
  });
  await nav(page, '#/explore');
  await expect(
    page.locator('table caption', { hasText: 'Weekly volume' }).locator('..'),
  ).toContainText('4,125');
});

test('AC-14 (XP-6, SS-4): new personal record in summary and records list', async ({ page }) => {
  await openApp(page);
  await seedLog(page, {
    date: '2026-09-01',
    start: '10:00',
    end: '11:00',
    exercises: [{ id: 'ex-bench-press', sets: [{ reps: 5, weightKg: 100 }] }],
  });
  await page.getByRole('button', { name: 'Quick Go!' }).click();
  await page.getByRole('button', { name: '+ Add Exercise' }).click();
  await page.locator('ion-modal ion-searchbar input').fill('bench press');
  await page
    .locator('ion-modal ion-item', { hasText: /^Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Bench Press set 1 reps').fill('5');
  await page.getByLabel('Bench Press set 1 weight').fill('102.5');
  await page.getByLabel('Bench Press set 1 weight').press('Enter');
  await page.getByRole('checkbox', { name: 'Complete Bench Press set 1' }).click();
  await page.getByRole('button', { name: 'Finish Workout' }).click();
  const sheet = page.locator('ion-modal', { hasText: 'Workout Complete' });
  await expect(sheet).toContainText('New Personal Records');
  await expect(sheet.locator('ion-item', { hasText: 'Heaviest weight' })).toContainText('102.5 kg');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await tab(page, 'Explore').click();
  await expect(page.locator('ion-item', { hasText: 'Heaviest weight' })).toContainText('102.5 kg');
});

test('AC-15 (ST-1): 65.0 kg ↔ 143.3 lb', async ({ page }) => {
  await openApp(page);
  const t = await seedTemplate(page, 'Units', [
    { id: 'ex-cable-crunch', sets: [{ reps: 15, weightKg: 65 }] },
  ]);
  await nav(page, `#/workouts/${t}`);
  await expect(page.getByLabel('Cable Crunch set 1 weight')).toHaveValue('65.0');
  await nav(page, '#/settings');
  await view(page).locator('ion-segment-button', { hasText: /^lb$/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (window as any).__gt.getDb().query('SELECT weight_unit FROM preferences'))[0]
            .weight_unit,
      ),
    )
    .toBe('lb');
  await nav(page, `#/workouts/${t}`);
  await expect(page.getByLabel('Cable Crunch set 1 weight')).toHaveValue('143.3');
  await nav(page, '#/settings');
  await view(page).locator('ion-segment-button', { hasText: /^kg$/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (window as any).__gt.getDb().query('SELECT weight_unit FROM preferences'))[0]
            .weight_unit,
      ),
    )
    .toBe('kg');
  await nav(page, `#/workouts/${t}`);
  await expect(page.getByLabel('Cable Crunch set 1 weight')).toHaveValue('65.0');
});

test('AC-17 (SS-3): resume banner on other tabs', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Quick Go!' }).click();
  await expect(page.locator('h1.gt-large-title', { hasText: 'Quick Workout' })).toBeVisible();
  await tab(page, 'Exercises').click();
  const banner = page.locator('.gt-resume');
  await expect(banner).toContainText('Workout in progress');
  await banner.click();
  await expect(page.getByRole('button', { name: 'Finish Workout' })).toBeVisible();
});

test('VR-2: out-of-range input is rejected with the BRD message', async ({ page }) => {
  await openApp(page);
  const t = await seedTemplate(page, 'Validation', [
    { id: 'ex-cable-crunch', sets: [{ reps: 15, weightKg: 65 }] },
  ]);
  await nav(page, `#/workouts/${t}`);
  const reps = page.getByLabel('Cable Crunch set 1 reps');
  await reps.fill('1000');
  await reps.press('Enter');
  await expect(page.locator('ion-toast')).toContainText('Enter a value between 0 and 999.');
  await expect(reps).toHaveValue('15');
  const weight = page.getByLabel('Cable Crunch set 1 weight');
  await weight.fill('62,5'); // device-independence §7
  await weight.press('Enter');
  await expect(weight).toHaveValue('62.5');
});

test('AC-19 (ST-6): CSV export contains every set of every log', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page);
  await page.evaluate(async () => {
    const g = (window as any).__gt;
    await g.mutate(async (db: any) => {
      for (let i = 0; i < 200; i++) {
        const day = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10);
        const id = await g.logs.startSession(
          db,
          { kind: 'quick' },
          { utc: g.localToUtc(day, '10:00', 0), offsetMin: 0 },
        );
        const le = await g.logs.addLoggedExercise(db, id, 'ex-bench-press');
        await g.logs.addLogSet(db, le, 'working');
        await g.logs.completeAllSets(db, id);
        await g.logs.finishSession(db, id, new Date(g.localToUtc(day, '11:00', 0)));
      }
    });
  });
  await nav(page, '#/settings');
  const download = page.waitForEvent('download');
  await page.getByText('Export All Data (CSV)').click();
  const file = await download;
  const text = await (
    await file.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString('utf8'));
  const lines = text.trim().split('\r\n');
  expect(lines[0]).toContain('log_id,workout,date');
  expect(lines).toHaveLength(1 + 400);
});

test('AC-20 (VR-9): deleted exercise disappears; past logs keep it', async ({ page }) => {
  await openApp(page);
  const logId = await seedLog(page, {
    date: '2026-09-10',
    start: '10:00',
    end: '11:00',
    exercises: [{ id: 'ex-hack-squat', sets: [{ reps: 8, weightKg: 120 }] }],
  });
  await nav(page, '#/exercises/ex-hack-squat');
  await view(page).getByText('Delete Exercise').click();
  await page.locator('ion-alert').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/#\/exercises$/); // deleted, then navigated back
  await nav(page, '#/exercises');
  await expect(view(page).locator('ion-item h2', { hasText: 'Hack Squat' })).toHaveCount(0);
  await nav(page, `#/logs/${logId}`);
  await expect(view(page).locator('.gt-block__title', { hasText: 'HACK SQUAT' })).toBeVisible();
  await expect(view(page).getByLabel('Hack Squat set 1 weight')).toHaveValue('120.0');
});
