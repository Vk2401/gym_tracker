import type { SetValues } from './types';

/** VR-5: number of sets still open when finishing. */
export const openSetCount = (sets: readonly Pick<SetValues, 'completed'>[]): number =>
  sets.filter((s) => !s.completed).length;

/** VR-6: a session needs at least one completed set to be saved. */
export const hasCompletedSet = (sets: readonly Pick<SetValues, 'completed'>[]): boolean =>
  sets.some((s) => s.completed);

const DAY_MS = 24 * 3600 * 1000;

/**
 * SS-4: Finishing sets End Time to now. A back-filled log (PD-3, started on an earlier day)
 * would exceed the 24-hour limit (VR-3), so its End Time defaults to one hour after start and
 * stays editable.
 */
export function finishEndUtc(startUtc: string, now: Date = new Date()): string {
  const start = Date.parse(startUtc);
  const n = now.getTime();
  if (n > start && n - start <= DAY_MS) return now.toISOString();
  return new Date(start + 3600_000).toISOString();
}

/** SS-1: rest timer adjustments in 15-second steps, never below zero remaining. */
export function adjustRestEnd(endUtc: string, deltaS: number, now: Date = new Date()): string {
  const next = Date.parse(endUtc) + deltaS * 1000;
  return new Date(Math.max(next, now.getTime())).toISOString();
}

/** Remaining whole seconds of a timer (0 when finished). */
export const remainingSeconds = (endUtc: string, now: number = Date.now()): number =>
  Math.max(0, Math.ceil((Date.parse(endUtc) - now) / 1000));

/** "1:30" countdown label. */
export function formatCountdown(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** ST-3: rest time options 0–10 min in 15 s steps. */
export const REST_OPTIONS_S: number[] = Array.from({ length: 41 }, (_, i) => i * 15);

/**
 * PD-7: in a superset the rest timer starts only after the last exercise of each round.
 * `group` lists the logged-exercise ids of the superset in order (empty when not in one).
 */
export function startsRest(loggedExerciseId: string, group: readonly string[]): boolean {
  if (group.length < 2) return true;
  return group[group.length - 1] === loggedExerciseId;
}
