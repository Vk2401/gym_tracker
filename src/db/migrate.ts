import type { Db } from './types';
import { MIGRATIONS, type Migration } from './migrations';

/**
 * Applies pending migrations in order, each in its own transaction, tracking the schema
 * version in PRAGMA user_version (BRD §16 data migrations).
 */
export async function migrate(
  db: Db,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  const [row] = await db.query<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  for (const m of migrations) {
    if (m.version <= current) continue;
    if (m.version !== current + 1) throw new Error(`Migration gap: ${current} → ${m.version}`);
    await db.transaction(async () => {
      for (const stmt of m.up) await db.exec(stmt);
      await db.exec(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  await db.persist();
  return current;
}
