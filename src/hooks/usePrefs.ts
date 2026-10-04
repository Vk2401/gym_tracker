import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import { loadPreferences, savePreference, type Preferences } from '@/db/repos/preferences';
import { useAppStore } from '@/store/appStore';

/** Current preferences (loaded at boot). */
export function usePrefs(): Preferences {
  const prefs = useAppStore((s) => s.prefs);
  if (!prefs) throw new Error('Preferences not loaded');
  return prefs;
}

export async function setPref<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  useAppStore.getState().setPrefs({ ...useAppStore.getState().prefs!, [key]: value });
  await mutate((db) => savePreference(db, key, value));
  useAppStore.getState().setPrefs(await loadPreferences(getDb()));
}
