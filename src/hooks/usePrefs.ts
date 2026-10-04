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

/**
 * Changes a setting: shown at once, saved to the database, then re-read from it — so the
 * screen always ends up showing what is actually stored. If the save fails the control
 * returns to the stored value (and the write-error toast explains).
 */
export async function setPref<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  useAppStore.getState().setPrefs({ ...useAppStore.getState().prefs!, [key]: value });
  try {
    await mutate((db) => savePreference(db, key, value));
  } finally {
    useAppStore.getState().setPrefs(await loadPreferences(getDb()));
  }
}
