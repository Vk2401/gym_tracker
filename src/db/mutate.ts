import { getDb } from './client';
import type { Db } from './types';
import { useDataStore } from '@/store/dataStore';

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs a write in a transaction, persists it (NFR-3: saved immediately) and notifies live
 * queries. Writes are serialised so rapid taps never interleave inside a transaction.
 */
export function mutate<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const run = async () => {
    const db = getDb();
    const result = await db.transaction(() => fn(db));
    await db.persist();
    useDataStore.getState().bump();
    return result;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}
