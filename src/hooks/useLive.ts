import { useEffect, useState } from 'react';
import { getDb } from '@/db/client';
import type { Db } from '@/db/types';
import { useDataStore } from '@/store/dataStore';

/**
 * Live query: runs `load` now and again after every write (dataStore version) or when deps
 * change. Keeps the previous data while reloading so screens never flash empty.
 */
export function useLive<T>(
  load: (db: Db) => Promise<T>,
  deps: readonly unknown[],
): { data: T | undefined; loading: boolean } {
  const version = useDataStore((s) => s.version);
  const key = [version, ...deps].map(String).join('\u0000');
  const [state, setState] = useState<{ key: string | null; data: T | undefined }>({
    key: null,
    data: undefined,
  });
  useEffect(() => {
    let alive = true;
    load(getDb())
      .then((data) => alive && setState({ key, data }))
      .catch((e) => {
        console.error(e);
        if (alive) setState((s) => ({ ...s, key }));
      });
    return () => {
      alive = false;
    };
    // `load` is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data: state.data, loading: state.key !== key };
}
