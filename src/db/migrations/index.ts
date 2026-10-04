import { m0001 } from './0001_init';

export interface Migration {
  version: number;
  up: readonly string[];
}

/** Ordered list of all migrations. Append only. */
export const MIGRATIONS: readonly Migration[] = [m0001];
