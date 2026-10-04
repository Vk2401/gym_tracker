import type { Migration } from './index';

// Additive (CLAUDE.md rule 9): Workout of the Day blocks inside logs (PD-8) and backup
// reminder state (BRD §17 risk: reminder after every 10 sessions when backup is off).
export const m0002: Migration = {
  version: 2,
  up: [
    `ALTER TABLE logged_exercise ADD COLUMN kind TEXT NOT NULL DEFAULT 'exercise'`,
    `ALTER TABLE logged_exercise ADD COLUMN wod_title TEXT`,
    `ALTER TABLE logged_exercise ADD COLUMN wod_description TEXT`,
    `ALTER TABLE logged_exercise ADD COLUMN wod_result_s INTEGER`,
    `ALTER TABLE preferences ADD COLUMN last_backup_utc TEXT`,
    `ALTER TABLE preferences ADD COLUMN sessions_since_backup INTEGER NOT NULL DEFAULT 0`,
    `CREATE INDEX IF NOT EXISTS exercise_category_cat_idx ON exercise_category(category_id)`,
    `CREATE INDEX IF NOT EXISTS logged_exercise_ex_idx ON logged_exercise(exercise_id)`,
  ],
};
