import { useCallback, useState } from 'react';
import { getDb } from '@/db/client';
import { mutate } from '@/db/mutate';
import type { WorkoutLog } from '@/db/models';
import * as logs from '@/db/repos/logs';
import { recordSets } from '@/db/repos/stats';
import { backupState } from '@/db/repos/data';
import { durationParts } from '@/domain/duration';
import { MSG, MSG_EXTRA } from '@/domain/messages';
import { newRecordsInLog, type PersonalRecord } from '@/domain/records';
import { hasCompletedSet, openSetCount } from '@/domain/session';
import { volumeKg } from '@/domain/totals';
import { useDialogs } from '@/hooks/useDialogs';
import { successHaptic } from '@/native/haptics';
import { healthAvailable, writeBodyWeight, writeWorkoutTime } from '@/native/health';
import { useAppStore } from '@/store/appStore';
import { useSessionStore } from '@/store/sessionStore';
import { durationBand, track } from '@/app/analytics';

export interface FinishSummary {
  logId: string;
  templateId: string | null;
  name: string;
  startUtc: string;
  endUtc: string;
  sets: number;
  volumeKg: number;
  records: PersonalRecord[];
}

/** SS-4 with VR-5 (open sets) and VR-6 (empty session). Returns a summary or null. */
export function useFinishSession() {
  const { choose } = useDialogs();
  const [summary, setSummary] = useState<FinishSummary | null>(null);
  const [backupDue, setBackupDue] = useState<number | null>(null);

  const finish = useCallback(
    async (log: WorkoutLog): Promise<'finished' | 'discarded' | null> => {
      const all = log.exercises.flatMap((e) => e.sets);
      const open = openSetCount(all);
      let completedAny = hasCompletedSet(all);
      if (open > 0) {
        const c = await choose(MSG.openSetsOnFinish(open), [
          { text: 'Mark all complete', value: 'mark' },
          { text: 'Finish anyway', value: 'anyway' },
          { text: 'Cancel', value: 'cancel', role: 'cancel' },
        ]);
        if (!c || c === 'cancel') return null;
        if (c === 'mark') completedAny = all.length > 0;
        if (completedAny || c === 'mark') {
          await mutate((db) =>
            c === 'mark' ? logs.completeAllSets(db, log.id) : logs.discardOpenSets(db, log.id),
          );
        }
      }
      if (!completedAny) {
        const c = await choose(MSG_EXTRA.emptySession, [
          { text: 'Cancel', value: 'cancel', role: 'cancel' },
          { text: 'Discard Workout', value: 'discard', role: 'destructive' },
        ]);
        if (c !== 'discard') return null;
        await mutate((db) => logs.deleteLog(db, log.id));
        await useSessionStore.getState().refresh();
        return 'discarded';
      }
      const now = new Date();
      await mutate((db) => logs.finishSession(db, log.id, now));
      await useSessionStore.getState().refresh();
      const db = getDb();
      const done = (await logs.getLog(db, log.id))!;
      const sets = done.exercises
        .flatMap((e) => e.sets)
        .filter((s) => s.completed && s.type === 'working');
      const records = newRecordsInLog(await recordSets(db), log.id);
      const prefs = useAppStore.getState().prefs;
      void successHaptic(prefs?.haptics ?? true);
      // ST-5: optional Apple Health / Health Connect write
      if (prefs?.healthEnabled && (await healthAvailable())) {
        if (done.bodyWeightKg) await writeBodyWeight(done.bodyWeightKg, done.startUtc);
        await writeWorkoutTime(done.startUtc, done.endUtc!);
      }
      const d = durationParts(done.startUtc, done.endUtc!);
      track('session_finished', {
        duration_band: durationBand(d.hours * 60 + d.minutes),
        exercise_count: done.exercises.length,
        set_count: sets.length,
        template_updated: false,
      });
      for (const r of records) track('personal_record_set', { record_type: r.recordType });
      // BRD §17: remind every 10 sessions while no recent backup exists.
      const b = await backupState(db);
      if (b.sessionsSinceBackup >= 10 && b.sessionsSinceBackup % 10 === 0)
        setBackupDue(b.sessionsSinceBackup);
      setSummary({
        logId: done.id,
        templateId: done.templateId,
        name: done.name,
        startUtc: done.startUtc,
        endUtc: done.endUtc!,
        sets: sets.length,
        volumeKg: volumeKg(sets),
        records,
      });
      return 'finished';
    },
    [choose],
  );

  const closeSummary = useCallback(async () => {
    setSummary(null);
    if (backupDue === null) return;
    const n = backupDue;
    setBackupDue(null);
    const c = await choose(
      undefined,
      [
        { text: 'Later', value: 'later', role: 'cancel' },
        { text: 'Back Up', value: 'backup' },
      ],
      MSG_EXTRA.backupReminder(n),
    );
    if (c === 'backup') window.location.hash = '#/settings';
  }, [backupDue, choose]);

  return { finish, summary, closeSummary };
}
