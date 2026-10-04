import type { SetValues } from './types';

export interface ExerciseWithSets {
  sets: readonly SetValues[];
}

/** BR-3 / BR-12: Next Workout totals; warm-up sets are excluded. */
export function templateTotals(exercises: readonly ExerciseWithSets[]): {
  exercises: number;
  sets: number;
  reps: number;
} {
  let sets = 0;
  let reps = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.type !== 'working') continue;
      sets += 1;
      reps += s.reps ?? 0;
    }
  }
  return { exercises: exercises.length, sets, reps };
}

/** WO-3: "9 Exercises, 30 Sets, 356 Reps". */
export function formatTotals(t: { exercises: number; sets: number; reps: number }): string {
  const p = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return `${p(t.exercises, 'Exercise')}, ${p(t.sets, 'Set')}, ${p(t.reps, 'Rep')}`;
}

/** XP-3 / PD-9: volume = Σ reps × weight of completed working sets. */
export function volumeKg(sets: readonly SetValues[]): number {
  return sets.reduce(
    (sum, s) =>
      s.type === 'working' && s.completed ? sum + (s.reps ?? 0) * (s.weightKg ?? 0) : sum,
    0,
  );
}
