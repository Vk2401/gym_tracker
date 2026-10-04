import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { Db, SqlValue } from '@/db/types';
import { isNative } from './platform';

const DB_NAME = 'gymtracker';
const sqlite = new SQLiteConnection(CapacitorSQLite);

async function initWebStore(): Promise<void> {
  // Web (dev / E2E / browser use): jeep-sqlite stores the database in IndexedDB.
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);
  if (!document.querySelector('jeep-sqlite')) {
    const el = document.createElement('jeep-sqlite');
    el.setAttribute('autosave', 'false');
    el.setAttribute('wasmpath', `${import.meta.env.BASE_URL}assets`);
    document.body.appendChild(el);
  }
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

/**
 * Opens the app database: native SQLite inside the iOS/Android shell, jeep-sqlite on web.
 * Returned object implements the driver-agnostic Db interface.
 */
export async function openDatabase(): Promise<Db> {
  const native = isNative();
  if (!native) await initWebStore();

  await sqlite.checkConnectionsConsistency().catch(() => undefined);
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn: SQLiteDBConnection = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await conn.open();
  await conn.execute('PRAGMA foreign_keys = ON;', false);
  if (native) await conn.query('PRAGMA journal_mode = WAL;').catch(() => undefined);

  let inTx = false;
  const db: Db = {
    async exec(sql) {
      await conn.execute(sql, false);
    },
    async run(sql, params = []) {
      await conn.run(sql, params as SqlValue[], false);
    },
    async query<T>(sql: string, params: readonly SqlValue[] = []) {
      const res = await conn.query(sql, params as SqlValue[]);
      return (res.values ?? []) as T[];
    },
    async transaction(fn) {
      if (inTx) return fn();
      inTx = true;
      await conn.beginTransaction();
      try {
        const r = await fn();
        await conn.commitTransaction();
        return r;
      } catch (e) {
        await conn.rollbackTransaction().catch(() => undefined);
        throw e;
      } finally {
        inTx = false;
      }
    },
    async persist() {
      if (!native) await sqlite.saveToStore(DB_NAME);
    },
  };
  return db;
}
