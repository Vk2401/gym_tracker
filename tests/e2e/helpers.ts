import { expect, type Page } from '@playwright/test';

export interface SeedSet {
  reps?: number | null;
  weightKg?: number | null;
  timeS?: number | null;
  distanceKm?: number | null;
  warmup?: boolean;
}

/** Opens the app and waits for the database to be ready. */
export async function openApp(page: Page, hash = '#/workouts') {
  await page.goto(`/${hash}`);
  await page.waitForFunction(() => (window as unknown as { __gt?: unknown }).__gt !== undefined);
}

/** Creates a template with exercises and prescribed sets. Returns its id. */
export function seedTemplate(
  page: Page,
  name: string,
  exercises: { id: string; sets: SeedSet[] }[],
) {
  return page.evaluate(
    async ({ name, exercises }) => {
      const g = (window as any).__gt;
      return g.mutate(async (db: any) => {
        const t = await g.workouts.createTemplate(db, name);
        for (const ex of exercises) {
          const item = await g.workouts.addTemplateExercise(db, t, ex.id);
          const tpl = await g.workouts.getTemplate(db, t);
          const it = tpl.items.find((i: any) => i.id === item);
          for (const s of it.sets) await g.workouts.deleteTemplateSet(db, s.id);
          for (const s of ex.sets) {
            await g.workouts.addTemplateSet(db, item, s.warmup ? 'warmup' : 'working');
            const after = await g.workouts.getTemplate(db, t);
            const last = after.items
              .find((i: any) => i.id === item)
              .sets.filter((x: any) => x.type === (s.warmup ? 'warmup' : 'working'))
              .at(-1);
            await g.workouts.updateTemplateSet(db, last.id, {
              reps: s.reps ?? null,
              weightKg: s.weightKg ?? null,
              timeS: s.timeS ?? null,
              distanceKm: s.distanceKm ?? null,
            });
          }
        }
        return t;
      });
    },
    { name, exercises },
  );
}

/** Creates a finished log on a date (UTC times) with completed sets. Returns its id. */
export function seedLog(
  page: Page,
  opts: {
    date: string;
    start: string;
    end: string;
    name?: string;
    templateId?: string;
    exercises: { id: string; sets: SeedSet[] }[];
  },
) {
  return page.evaluate(async (o) => {
    const g = (window as any).__gt;
    const id = await g.mutate(async (db: any) => {
      const start = { utc: g.localToUtc(o.date, o.start, 0), offsetMin: 0 };
      const logId = await g.logs.startSession(
        db,
        o.templateId ? { kind: 'template', templateId: o.templateId } : { kind: 'quick' },
        start,
      );
      if (!o.templateId) {
        for (const ex of o.exercises) {
          const le = await g.logs.addLoggedExercise(db, logId, ex.id, { withDefaultSet: false });
          for (const s of ex.sets) {
            const setId = await g.logs.addLogSet(db, le, s.warmup ? 'warmup' : 'working');
            await g.logs.updateLogSet(db, setId, {
              reps: s.reps ?? null,
              weightKg: s.weightKg ?? null,
              timeS: s.timeS ?? null,
              distanceKm: s.distanceKm ?? null,
            });
            await g.logs.setLogSetCompleted(db, setId, true);
          }
        }
      } else {
        await g.logs.completeAllSets(db, logId);
      }
      if (o.name) await g.logs.updateLog(db, logId, { name: o.name });
      await g.logs.finishSession(db, logId, new Date(g.localToUtc(o.date, o.end, 0)));
      await g.logs.updateLog(db, logId, {
        end: { utc: g.localToUtc(o.date, o.end, 0), offsetMin: 0 },
      });
      return logId;
    });
    await g.refreshSession();
    return id;
  }, opts);
}

export const tab = (page: Page, name: string) => page.locator('ion-tab-button', { hasText: name });

export async function expectNoErrors(errors: string[]) {
  expect(errors.filter((e) => !/ResizeObserver/.test(e))).toEqual([]);
}

/** The page currently shown (Ionic keeps earlier pages of the stack hidden in the DOM). */
export const view = (page: Page) =>
  page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)').last();

/** Deep-link to a route: loads it fresh (data persists), like opening the app at that screen. */
export async function nav(page: Page, hash: string) {
  await flushWrites(page);
  await page.goto(`/${hash}`);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __gt?: unknown }).__gt !== undefined);
}

/** WT-5: a template shows set chips; tapping them opens the editable set table. */
export async function openSets(page: Page, exercise: string) {
  await view(page)
    .getByRole('button', { name: `Edit ${exercise} sets` })
    .click();
  await page.locator('ion-modal').getByLabel(`${exercise} set 1 reps`).waitFor();
}

/**
 * Waits until every queued write has been committed and persisted (mutate() serialises them),
 * so a reload never races the web build's async IndexedDB save.
 */
export async function flushWrites(page: Page) {
  await page
    .evaluate(() => (window as any).__gt?.mutate(async () => undefined))
    .catch(() => undefined);
}
