import { expect, test, type Page } from '@playwright/test';
import { nav, openApp, seedLog, view } from './helpers';

/** Picks `content` as the file in the next file dialog the app opens. */
async function chooseFile(page: Page, name: string, content: string, open: () => Promise<void>) {
  const chooser = page.waitForEvent('filechooser');
  await open();
  await (await chooser).setFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(content) });
}
const importRow = (page: Page) => view(page).getByText('Import workouts', { exact: true });
const sheet = (page: Page) => page.locator('ion-modal.show-modal').last();

test('PD-19: another app’s CSV — match columns, see bad rows, import the good ones', async ({
  page,
}) => {
  await openApp(page);
  await nav(page, '#/settings');
  const csv = [
    'Date;Workout Name;Exercise Name;Set Order;Weight (lbs);Reps;Notes',
    '30/09/2026;Legs;Squat;1;135;8;easy',
    '30/09/2026;Legs;Squat;2;225;5;',
    '30/09/2026;Legs;Goblet Squat;1;50;twelve;',
    '31/09/2026;Legs;Squat;1;135;8;',
  ].join('\n');
  await chooseFile(page, 'strong.csv', csv, () => importRow(page).click());

  // not our columns → Match Columns, already pre-matched, pounds detected
  await expect(sheet(page).getByText('Match Columns')).toBeVisible();
  await expect(sheet(page).getByText('In your file: Squat')).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Next' }).click();

  await expect(sheet(page).getByText('1 workout · 2 sets ready to import')).toBeVisible();
  await expect(sheet(page).getByText('2 rows with problems will be skipped:')).toBeVisible();
  await expect(sheet(page).getByText(/Row 4 · Reps “twelve”: use a whole number/)).toBeVisible();
  await expect(sheet(page).getByText(/Row 5 · Date “31\/09\/2026”/)).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('ion-toast')).toContainText('Imported 1 workout');

  const id = await page.evaluate(async () => {
    const g = (window as any).__gt;
    const [l] = await g.logs.logsOnDate(await g.getDb(), '2026-09-30');
    return l?.id as string;
  });
  await nav(page, `#/logs/${id}`);
  await expect(view(page).getByText('SQUAT', { exact: true })).toBeVisible();
});

test('PD-19: our own CSV export re-imports without matching and skips duplicates', async ({
  page,
}) => {
  await openApp(page);
  await seedLog(page, {
    date: '2026-09-28',
    start: '07:00',
    end: '08:00',
    name: 'Push Day',
    exercises: [{ id: 'ex-bench-press', sets: [{ reps: 8, weightKg: 60 }] }],
  });
  // same columns as our CSV export (AC-19)
  const header =
    'log_id,workout,date,start_time,end_time,body_weight_kg,exercise_order,exercise,equipment,set_number,set_type,reps,weight_kg,time_s,distance_km,rpe,completed';
  const id = await page.evaluate(async () => {
    const g = (window as any).__gt;
    const [l] = await g.logs.logsOnDate(await g.getDb(), '2026-09-28');
    return l.id as string;
  });
  const own = [
    header,
    `${id},Push Day,2026-09-28,07:00,08:00,,1,Bench Press,Barbell,1,working,8,60,,,,yes`,
    `NEW,Pull Day,2026-09-29,07:00,08:00,,1,Barbell Row,Barbell,1,working,10,50,,,,yes`,
  ].join('\r\n');
  await nav(page, '#/settings');
  await chooseFile(page, 'gym-tracker.csv', own, () => importRow(page).click());
  await expect(sheet(page).getByText('Review Import')).toBeVisible();
  await expect(sheet(page).getByText('2 workouts · 2 sets ready to import')).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('ion-toast')).toContainText(
    'Imported 1 workout · 1 already in the app were skipped.',
  );
});

test('PD-19: JSON — a list of sets is imported, a full backup offers Restore', async ({ page }) => {
  await openApp(page);
  await nav(page, '#/settings');
  const sets = JSON.stringify([
    { date: '2026-09-25', exercise: 'Deadlift', reps: 5, weight: 140 },
    { date: '2026-09-25', exercise: 'Deadlift', reps: 5, weight: 150 },
  ]);
  await chooseFile(page, 'sets.json', sets, () => importRow(page).click());
  await sheet(page).getByRole('button', { name: 'Next' }).click();
  await sheet(page).getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('ion-toast')).toContainText('Imported 1 workout');

  const backup = JSON.stringify({
    app: 'gym-tracker',
    schemaVersion: 1,
    createdAt: '2026-09-01T00:00:00Z',
    tables: { exercise: [{ id: 'x' }] },
  });
  await chooseFile(page, 'backup.json', backup, () => importRow(page).click());
  await expect(page.locator('ion-alert')).toContainText('This is a full Gym Tracker backup');
  await page.locator('ion-alert button', { hasText: 'Restore' }).click();
  // damaged backup: refused before anything is deleted
  await expect(page.locator('ion-toast').last()).toContainText('This backup is damaged');
  const n = await page.evaluate(async () => {
    const g = (window as any).__gt;
    return (await g.logs.logsOnDate(await g.getDb(), '2026-09-25')).length as number;
  });
  expect(n).toBe(1);
});
