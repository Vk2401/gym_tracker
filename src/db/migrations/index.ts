import { m0001 } from './0001_init';
import { m0002 } from './0002_session_extras';

export interface Migration {
  version: number;
  up: readonly string[];
}

/** Ordered list of all migrations. Append only. */
export const MIGRATIONS: readonly Migration[] = [m0001, m0002];
