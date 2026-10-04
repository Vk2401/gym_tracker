import { create } from 'zustand';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import { getActiveSession, setRestEnd } from '@/db/repos/logs';
import { adjustRestEnd, remainingSeconds } from '@/domain/session';
import { cancelRestAlert, scheduleRestAlert } from '@/native/notifications';
import { setKeepAwake } from '@/native/keepAwake';
import { useAppStore } from './appStore';

interface SessionState {
  logId: string | null;
  restEndUtc: string | null;
  /** Length of the current rest period in seconds (drives the timer ring; not persisted). */
  restTotalS: number;
  /** Loads the active session from the database (VR-7: restored exactly on reopen). */
  refresh: () => Promise<void>;
  startRest: (seconds: number) => Promise<void>;
  adjustRest: (deltaS: number) => Promise<void>;
  skipRest: () => Promise<void>;
}

// Through the write queue so it never interleaves with another transaction.
const persistRest = (end: string | null) => mutate((db) => setRestEnd(db, end));

export const useSessionStore = create<SessionState>((set, get) => ({
  logId: null,
  restEndUtc: null,
  restTotalS: 0,
  refresh: async () => {
    const s = await getActiveSession(getDb());
    const end = s?.restEndUtc ?? null;
    set({
      logId: s?.logId ?? null,
      restEndUtc: end,
      restTotalS: end ? Math.max(get().restTotalS, remainingSeconds(end)) : 0,
    });
    const prefs = useAppStore.getState().prefs;
    await setKeepAwake(!!s && !!prefs?.keepAwake);
    if (!s) await cancelRestAlert();
  },
  // SS-1: completing a working set starts the rest timer.
  startRest: async (seconds) => {
    if (seconds <= 0) return;
    const end = new Date(Date.now() + seconds * 1000).toISOString();
    set({ restEndUtc: end, restTotalS: seconds });
    await persistRest(end);
    await scheduleRestAlert(end, useAppStore.getState().prefs?.sound ?? true);
  },
  adjustRest: async (deltaS) => {
    const cur = get().restEndUtc;
    if (!cur) return;
    const end = adjustRestEnd(cur, deltaS);
    set({
      restEndUtc: end,
      restTotalS: Math.max(get().restTotalS + deltaS, remainingSeconds(end)),
    });
    await persistRest(end);
    await scheduleRestAlert(end, useAppStore.getState().prefs?.sound ?? true);
  },
  skipRest: async () => {
    set({ restEndUtc: null, restTotalS: 0 });
    await persistRest(null);
    await cancelRestAlert();
  },
}));
