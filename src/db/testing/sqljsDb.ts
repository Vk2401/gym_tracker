import initSqlJs from 'sql.js';
import type { Db, SqlValue } from '../types';

/** In-memory sql.js database for unit tests of migrations and repositories. */
export async function createTestDb(): Promise<Db> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.exec('PRAGMA foreign_keys = ON');
  const db: Db = {
    async exec(sql) {
      raw.exec(sql);
    },
    async run(sql, params = []) {
      raw.run(sql, params as SqlValue[]);
    },
    async query<T>(sql: string, params: readonly SqlValue[] = []) {
      const stmt = raw.prepare(sql);
      stmt.bind(params as SqlValue[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      stmt.free();
      return rows;
    },
    async transaction(fn) {
      raw.exec('BEGIN');
      try {
        const r = await fn();
        raw.exec('COMMIT');
        return r;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    async persist() {},
  };
  return db;
}
