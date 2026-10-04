import { setDb } from '@/db/client';
import { migrate } from '@/db/migrate';
import { loadPreferences } from '@/db/repos/preferences';
import { openDatabase } from '@/native/sqlite';
import { initKeyboard } from '@/native/keyboard';
import { hideSplash } from '@/native/splash';
import { seed } from '@/seed/seed';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { onResume } from '@/native/lifecycle';
import { track } from './analytics';
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
    // VR-7: restore the active session (and its rest timer) exactly on reopen.
    await useSessionStore.getState().refresh();
    onResume(() => void useSessionStore.getState().refresh());
    track('app_opened', { app_version: __APP_VERSION__ });
    if (import.meta.env.VITE_E2E === 'true') (await import('./e2e')).installE2E();
  } catch (e) {
    console.error(e);
    useAppStore.getState().setError(e instanceof Error ? e.message : String(e));
  } finally {
    await hideSplash();
  }
}
