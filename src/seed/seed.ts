import type { Db } from '@/db/types';
import { SEED_CATEGORIES, SEED_EQUIPMENT } from './categories';
import { SEED_EXERCISES } from './exercises';

export const DEFAULT_GROUP_ID = 'grp-default';

/**
 * Loads the pre-loaded library (BRD §11) and the Default workout group (VR-11) into a fresh
 * database only. The Default group cannot be deleted, so its presence means "already seeded";
 * library items the user deleted later (VR-9, VR-10, ST-4) are never brought back.
 */
export async function seed(db: Db, opts: { inTransaction?: boolean } = {}): Promise<void> {
  const [seeded] = await db.query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM workout_group WHERE id = ?',
    [DEFAULT_GROUP_ID],
  );
  if (seeded?.n) return;
  const body = async () => {
    await db.run(
      `INSERT OR IGNORE INTO workout_group (id, name, color, sort_order, expanded, is_default)
       VALUES (?, 'Default', '#1e7bf2', 0, 1, 1)`,
      [DEFAULT_GROUP_ID],
    );
    for (const c of SEED_CATEGORIES) {
      await db.run('INSERT OR IGNORE INTO category (id, name, color) VALUES (?, ?, ?)', [
        c.id,
        c.name,
        c.color,
      ]);
    }
    for (const e of SEED_EQUIPMENT) {
      await db.run('INSERT OR IGNORE INTO equipment (id, name) VALUES (?, ?)', [e.id, e.name]);
    }
    for (const x of SEED_EXERCISES) {
      await db.run(
        `INSERT OR IGNORE INTO exercise (id, name, primary_focus, secondary_focus, equipment_id, note, is_custom)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [x.id, x.name, x.primary, x.secondary, x.equipment, x.note],
      );
      for (const cat of x.categories) {
        await db.run(
          'INSERT OR IGNORE INTO exercise_category (exercise_id, category_id) VALUES (?, ?)',
          [x.id, cat],
        );
      }
    }
  };
  if (opts.inTransaction) return body();
  await db.transaction(body);
  await db.persist();
}
