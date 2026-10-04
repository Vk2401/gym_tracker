import type { Db, SqlValue } from '../types';
import { seed } from '@/seed/seed';

/** Tables in foreign-key-safe insert order. */
export const DATA_TABLES = [
  'workout_group',
  'category',
  'equipment',
  'exercise',
  'exercise_category',
  'workout_template',
  'template_item',
  'template_set',
  'workout_log',
  'logged_exercise',
  'log_set',
  'measurement',
  'personal_record',
  'preferences',
  'active_session',
] as const;

export interface Backup {
  app: 'gym-tracker';
  schemaVersion: number;
  createdAt: string;
  tables: Record<string, Record<string, SqlValue>[]>;
}

/** ST-6: full backup of all data as JSON. */
export async function exportBackup(db: Db): Promise<Backup> {
  const [v] = await db.query<{ user_version: number }>('PRAGMA user_version');
  const tables: Backup['tables'] = {};
  for (const t of DATA_TABLES)
    tables[t] = await db.query<Record<string, SqlValue>>(`SELECT * FROM ${t}`);
  return {
    app: 'gym-tracker',
    schemaVersion: v?.user_version ?? 0,
    createdAt: new Date().toISOString(),
    tables,
  };
}

export function parseBackup(text: string, currentSchema: number): Backup {
  const b = JSON.parse(text) as Backup;
  if (b?.app !== 'gym-tracker' || !b.tables || typeof b.tables !== 'object')
    throw new Error('This file is not a Gym Tracker backup.');
  if (b.schemaVersion > currentSchema)
    throw new Error('This backup was made by a newer version of the app.');
  return b;
}

async function clearAll(db: Db): Promise<void> {
  for (const t of [...DATA_TABLES].reverse()) await db.run(`DELETE FROM ${t}`);
}

/**
 * PD-19: before a restore wipes anything, every row must be an object carrying each column the
 * schema requires (NOT NULL without a default, and the id). Returns the first problem found.
 */
export async function checkBackup(
  db: Db,
  b: Backup,
): Promise<{ table: string; row: number; column: string } | null> {
  for (const t of DATA_TABLES) {
    const rows: unknown = b.tables[t] ?? [];
    if (!Array.isArray(rows)) return { table: t, row: 1, column: 'rows' };
    const info = await db.query<{ name: string; notnull: number; dflt_value: unknown; pk: number }>(
      `PRAGMA table_info(${t})`,
    );
    const required = info
      .filter((c) => c.pk > 0 || (c.notnull === 1 && c.dflt_value === null))
      .map((c) => c.name);
    for (let i = 0; i < rows.length; i++) {
      const row: unknown = rows[i];
      if (!row || typeof row !== 'object' || Array.isArray(row))
        return { table: t, row: i + 1, column: required[0] ?? 'id' };
      const missing = required.find((c) => (row as Record<string, unknown>)[c] == null);
      if (missing) return { table: t, row: i + 1, column: missing };
    }
  }
  return null;
}

/**
 * VR-17: replaces all current data (caller confirms with the backup date first). Older
 * backups load because schema changes are additive: only known columns are inserted.
 */
export async function restoreBackup(db: Db, b: Backup): Promise<void> {
  await clearAll(db);
  for (const t of DATA_TABLES) {
    const rows = b.tables[t] ?? [];
    if (!rows.length) continue;
    const cols = (await db.query<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => cols.includes(k));
      await db.run(
        `INSERT INTO ${t} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        keys.map((k) => row[k] ?? null),
      );
    }
  }
  const [p] = await db.query<{ n: number }>('SELECT COUNT(*) AS n FROM preferences');
  if (!p?.n) await db.run('INSERT INTO preferences (id) VALUES (1)');
}

/** ST-6: delete all data (after typed confirmation), then reload the pre-loaded library. */
export async function deleteAllData(db: Db): Promise<void> {
  await clearAll(db);
  await db.run('INSERT INTO preferences (id) VALUES (1)');
  await seed(db, { inTransaction: true });
}

export async function markBackedUp(db: Db): Promise<void> {
  await db.run(
    'UPDATE preferences SET last_backup_utc = ?, sessions_since_backup = 0 WHERE id = 1',
    [new Date().toISOString()],
  );
}

export async function backupState(
  db: Db,
): Promise<{ lastBackupUtc: string | null; sessionsSinceBackup: number }> {
  const [r] = await db.query<{ last_backup_utc: string | null; sessions_since_backup: number }>(
    'SELECT last_backup_utc, sessions_since_backup FROM preferences WHERE id = 1',
  );
  return {
    lastBackupUtc: r?.last_backup_utc ?? null,
    sessionsSinceBackup: r?.sessions_since_backup ?? 0,
  };
}
