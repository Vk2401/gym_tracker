import { setDb } from '@/db/client';
import { migrate } from '@/db/migrate';
import { loadPreferences } from '@/db/repos/preferences';
import { openDatabase } from '@/native/sqlite';
import { initKeyboard } from '@/native/keyboard';
import { hideSplash } from '@/native/splash';
import { seed } from '@/seed/seed';
import { useAppStore } from '@/store/appStore';
import { initAppearance } from './appearance';
import { initTextScale } from './textScale';

/** Opens storage, migrates, seeds and applies device-independence controllers. */
export async function bootstrap(): Promise<void> {
  initTextScale();
  initKeyboard();
  try {
    const db = await openDatabase();
    await migrate(db);
    await seed(db);
    setDb(db);
    const prefs = await loadPreferences(db);
    initAppearance(prefs.appearance);
    useAppStore.getState().setReady(prefs);
  } catch (e) {
    console.error(e);
    useAppStore.getState().setError(e instanceof Error ? e.message : String(e));
  } finally {
    await hideSplash();
  }
}
