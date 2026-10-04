import { describe, expect, it } from 'vitest';
import { createTestDb } from './testing/sqljsDb';
import { migrate } from './migrate';
import { MIGRATIONS } from './migrations';
import { seed } from '@/seed/seed';
import { SEED_CATEGORIES, SEED_EQUIPMENT } from '@/seed/categories';
import { SEED_EXERCISES } from '@/seed/exercises';
import { validateName } from '@/domain/validation';

describe('migrate', () => {
  it('applies all migrations and is idempotent', async () => {
    const db = await createTestDb();
    const latest = MIGRATIONS[MIGRATIONS.length - 1]!.version;
    expect(await migrate(db)).toBe(latest);
    expect(await migrate(db)).toBe(latest);
    const [prefs] = await db.query<{ weight_unit: string; rest_s: number }>(
      'SELECT * FROM preferences',
    );
    expect(prefs).toMatchObject({ weight_unit: 'kg', rest_s: 90 });
  });

  it('rejects a version gap', async () => {
    const db = await createTestDb();
    await expect(migrate(db, [{ version: 2, up: [] }])).rejects.toThrow(/gap/);
  });

  it('rolls back a failing migration', async () => {
    const db = await createTestDb();
    await expect(
      migrate(db, [{ version: 1, up: ['CREATE TABLE t (id INTEGER)', 'BROKEN SQL'] }]),
    ).rejects.toThrow();
    const [v] = await db.query<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(0);
    expect(await db.query("SELECT name FROM sqlite_master WHERE name = 't'")).toHaveLength(0);
  });
});

describe('seed (BRD §11)', () => {
  it('loads the library once with valid, unique names and references', async () => {
    const db = await createTestDb();
    await migrate(db);
    await seed(db);
    await seed(db);
    const count = async (table: string) =>
      (await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))[0]!.n;
    expect(await count('exercise')).toBe(SEED_EXERCISES.length);
    expect(await count('category')).toBe(SEED_CATEGORIES.length);
    expect(await count('equipment')).toBe(SEED_EQUIPMENT.length);
    expect(await count('workout_group')).toBe(1);

    const names = SEED_EXERCISES.map((e) => e.name);
    for (const [i, n] of names.entries()) {
      expect(validateName(n, { existing: names.slice(0, i), kind: 'exercise' }).ok).toBe(true);
    }
    // every category/equipment reference resolves (foreign keys are ON)
    const [ac5] = await db.query<{ primary_focus: string; secondary_focus: string; cat: string }>(
      `SELECT e.primary_focus, e.secondary_focus, c.name AS cat FROM exercise e
       JOIN exercise_category ec ON ec.exercise_id = e.id JOIN category c ON c.id = ec.category_id
       WHERE e.name = '3/4 Sit-Up'`,
    );
    // AC-5: 3/4 Sit-Up → Abdominals (Lower), Primary Reps, Secondary Weight
    expect(ac5).toEqual({
      primary_focus: 'reps',
      secondary_focus: 'weight',
      cat: 'Abdominals (Lower)',
    });
  });
});

describe('preferences repo', () => {
  it('loads defaults and saves changes', async () => {
    const { loadPreferences, savePreference } = await import('./repos/preferences');
    const db = await createTestDb();
    await migrate(db);
    expect(await loadPreferences(db)).toMatchObject({
      weightUnit: 'kg',
      appearance: 'system',
      showDots: true,
    });
    await savePreference(db, 'appearance', 'dark');
    await savePreference(db, 'showDots', false);
    expect(await loadPreferences(db)).toMatchObject({ appearance: 'dark', showDots: false });
  });
});
