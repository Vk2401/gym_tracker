// Test-only hooks for Playwright acceptance tests. Included only when the app is built with
// VITE_E2E=true (never in the Vercel production build).
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import * as library from '@/db/repos/library';
import * as logs from '@/db/repos/logs';
import * as workouts from '@/db/repos/workouts';
import { localToUtc } from '@/domain/time';
import { useSessionStore } from '@/store/sessionStore';

export function installE2E(): void {
  (window as unknown as { __gt: unknown }).__gt = {
    getDb,
    mutate,
    library,
    logs,
    workouts,
    localToUtc,
    refreshSession: () => useSessionStore.getState().refresh(),
  };
}
