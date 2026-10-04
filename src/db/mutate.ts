import { getDb } from './client';
import type { Db } from './types';
import { useDataStore } from '@/store/dataStore';

let queue: Promise<unknown> = Promise.resolve();

/** Fired on window when a write could not be saved. */
export const WRITE_ERROR_EVENT = 'gt:write-error';

/**
 * Runs a write in a transaction, persists it (NFR-3: saved immediately) and notifies live
 * queries. Writes are serialised so rapid taps never interleave inside a transaction.
 */
export function mutate<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const run = async () => {
    const db = getDb();
    try {
      const result = await db.transaction(() => fn(db));
      await db.persist();
      useDataStore.getState().bump();
      return result;
    } catch (e) {
      // NFR-3: a lost write must never be silent (WriteErrorToast shows it).
      window.dispatchEvent(new CustomEvent(WRITE_ERROR_EVENT, { detail: e }));
      throw e;
    }
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}
