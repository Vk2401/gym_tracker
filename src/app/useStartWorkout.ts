import { useIonRouter } from '@ionic/react';
import { useCallback } from 'react';
import { mutate } from '@/db/mutate';
import { startSession, type StartSource } from '@/db/repos/logs';
import type { Stamp } from '@/domain/time';
import { MSG_EXTRA } from '@/domain/messages';
import { useDialogs } from '@/hooks/useDialogs';
import { useSessionStore } from '@/store/sessionStore';
import { track } from './analytics';

/**
 * PD-1 / PD-2 / PD-3 entry points. VR-8: while a session is active, starting another asks to
 * resume the current one or finish it first.
 */
export function useStartWorkout() {
  const router = useIonRouter();
  const { choose } = useDialogs();
  return useCallback(
    async (
      source: StartSource,
      start?: Stamp,
      origin: 'template' | 'quick_go' | 'logs' = 'template',
    ) => {
      const active = useSessionStore.getState().logId;
      if (active) {
        const c = await choose(
          MSG_EXTRA.workoutInProgress,
          [
            { text: 'Cancel', value: 'cancel', role: 'cancel' },
            { text: 'Resume', value: 'resume' },
          ],
          MSG_EXTRA.resumeOrFinish,
        );
        if (c === 'resume') router.push(`/logs/${active}`, 'forward');
        return;
      }
      const id = await mutate((db) => startSession(db, source, start));
      await useSessionStore.getState().refresh();
      track('session_started', { source: origin });
      router.push(`/logs/${id}`, 'forward');
    },
    [choose, router],
  );
}
