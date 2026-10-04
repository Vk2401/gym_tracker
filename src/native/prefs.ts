import { Preferences } from '@capacitor/preferences';

// Small key/value store for values needed before the database opens (e.g. appearance,
// to avoid a theme flash). Web fallback is built into the plugin (localStorage).
export async function getPref(key: string): Promise<string | null> {
  try {
    return (await Preferences.get({ key })).value;
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch {
    /* non-critical */
  }
}
