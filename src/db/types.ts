export type SqlValue = string | number | null;

/** Minimal driver-agnostic database interface used by migrations and repositories. */
export interface Db {
  /** Runs one or more statements without parameters (DDL, batches). */
  exec(sql: string): Promise<void>;
  /** Runs one parameterised statement. */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** Runs fn inside a transaction; rolls back if it throws. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  /** Persists the database (web store); no-op on native. */
  persist(): Promise<void>;
}
