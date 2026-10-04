import { estimateOneRepMax } from './oneRepMax';

/** Section 7: personal record types. */
export type RecordType = 'maxWeight' | 'maxRepsAtWeight' | 'est1rm' | 'maxTime' | 'maxDistance';

export interface RecordSet {
  setId: string;
  exerciseId: string;
  logId: string;
  achievedUtc: string;
  type: 'warmup' | 'working';
  completed: boolean;
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
}

export interface PersonalRecord {
  exerciseId: string;
  recordType: RecordType;
  value: number;
  /** For maxRepsAtWeight: the weight in kg the reps were done at. */
  weightKg: number | null;
  setId: string;
  logId: string;
  achievedUtc: string;
}

const eligible = (s: RecordSet) => s.type === 'working' && s.completed; // PD-9: warm-ups never count

/**
 * XP-6: best records per exercise. Ties keep the earliest achievement. "Most reps at a weight"
 * is reported for the heaviest weight lifted (the record most users track).
 */
export function computeRecords(sets: readonly RecordSet[]): PersonalRecord[] {
  const sorted = [...sets]
    .filter(eligible)
    .sort((a, b) => a.achievedUtc.localeCompare(b.achievedUtc));
  const best = new Map<string, PersonalRecord>();
  const consider = (
    s: RecordSet,
    recordType: RecordType,
    value: number | null,
    weightKg: number | null = null,
  ) => {
    if (value === null || !(value > 0)) return;
    const key = `${s.exerciseId}|${recordType}`;
    const cur = best.get(key);
    if (!cur || value > cur.value) {
      best.set(key, {
        exerciseId: s.exerciseId,
        recordType,
        value,
        weightKg,
        setId: s.setId,
        logId: s.logId,
        achievedUtc: s.achievedUtc,
      });
    }
  };
  // heaviest weight per exercise first, so maxRepsAtWeight can use it
  const heaviest = new Map<string, number>();
  for (const s of sorted) {
    if (s.weightKg && s.weightKg > (heaviest.get(s.exerciseId) ?? 0))
      heaviest.set(s.exerciseId, s.weightKg);
  }
  for (const s of sorted) {
    consider(s, 'maxWeight', s.weightKg);
    if (s.reps && s.weightKg) consider(s, 'est1rm', estimateOneRepMax(s.weightKg, s.reps));
    if (s.weightKg && s.weightKg === heaviest.get(s.exerciseId))
      consider(s, 'maxRepsAtWeight', s.reps, s.weightKg);
    consider(s, 'maxTime', s.timeS);
    consider(s, 'maxDistance', s.distanceKm);
  }
  return [...best.values()];
}

/**
 * SS-4 / AC-14: records set in a log — records that point to one of its sets and beat every
 * value achieved before it.
 */
export function newRecordsInLog(all: readonly RecordSet[], logId: string): PersonalRecord[] {
  const before = computeRecords(all.filter((s) => s.logId !== logId));
  const after = computeRecords(all);
  return after.filter((r) => {
    if (r.logId !== logId) return false;
    const prev = before.find((b) => b.exerciseId === r.exerciseId && b.recordType === r.recordType);
    if (r.recordType === 'maxRepsAtWeight') {
      return !prev || r.weightKg !== prev.weightKg || r.value > prev.value;
    }
    return !prev || r.value > prev.value;
  });
}

export const RECORD_LABEL: Record<RecordType, string> = {
  maxWeight: 'Heaviest weight',
  maxRepsAtWeight: 'Most reps',
  est1rm: 'Best est. 1RM',
  maxTime: 'Longest time',
  maxDistance: 'Longest distance',
};
