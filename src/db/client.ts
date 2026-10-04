import type { Db } from './types';

let instance: Db | null = null;

export function setDb(db: Db): void {
  instance = db;
}

/** The open app database; available after bootstrap. */
export function getDb(): Db {
  if (!instance) throw new Error('Database not initialised');
  return instance;
}
