import { estimateOneRepMax } from './oneRepMax';
import { addDaysKey } from './time';

export type RangeKey = '4w' | '3m' | '6m' | '1y' | 'all';

/** XP-1 ranges; `short` fits the segmented control on narrow phones. */
export const RANGES_LIST: { key: RangeKey; label: string; short: string }[] = [
  { key: '4w', label: '4 weeks', short: '4 wk' },
  { key: '3m', label: '3 months', short: '3 mo' },
  { key: '6m', label: '6 months', short: '6 mo' },
  { key: '1y', label: '1 year', short: '1 yr' },
  { key: 'all', label: 'All', short: 'All' },
];

/** XP-1: first date key included in the range (null = all). */
export function rangeStart(range: RangeKey, today: string): string | null {
  switch (range) {
    case '4w':
      return addDaysKey(today, -27);
    case '3m':
      return shiftMonthsKey(today, -3);
    case '6m':
      return shiftMonthsKey(today, -6);
    case '1y':
      return shiftMonthsKey(today, -12);
    default:
      return null;
  }
}

function shiftMonthsKey(key: string, months: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1 + months, d + 1));
  return t.toISOString().slice(0, 10);
}

/** Week bucket key = the date key of the week's first day (Sunday or Monday). */
export function weekKey(dateKey: string, weekStart: 'sun' | 'mon'): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const back = weekStart === 'sun' ? dow : (dow + 6) % 7;
  return addDaysKey(dateKey, -back);
}

/** Consecutive week keys from `from` to `to` (inclusive). */
export function weeksBetween(from: string, to: string, weekStart: 'sun' | 'mon'): string[] {
  const out: string[] = [];
  let k = weekKey(from, weekStart);
  const end = weekKey(to, weekStart);
  while (k <= end) {
    out.push(k);
    k = addDaysKey(k, 7);
  }
  return out;
}

/** XP-2: workouts per week for each week in range (zeros included). */
export function workoutsPerWeek(
  logDates: readonly string[],
  from: string,
  to: string,
  weekStart: 'sun' | 'mon',
): { week: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of logDates)
    counts.set(weekKey(d, weekStart), (counts.get(weekKey(d, weekStart)) ?? 0) + 1);
  return weeksBetween(from, to, weekStart).map((week) => ({ week, count: counts.get(week) ?? 0 }));
}

/**
 * XP-2: current streak in consecutive weeks with at least one log. The current week counts
 * if it has a log; if it has none yet the streak continues from last week.
 */
export function weekStreak(
  logDates: readonly string[],
  today: string,
  weekStart: 'sun' | 'mon',
): number {
  const weeks = new Set(logDates.map((d) => weekKey(d, weekStart)));
  let k = weekKey(today, weekStart);
  if (!weeks.has(k)) k = addDaysKey(k, -7);
  let n = 0;
  while (weeks.has(k)) {
    n++;
    k = addDaysKey(k, -7);
  }
  return n;
}

/** XP-3: total weekly volume (Σ reps × weight of completed working sets). */
export function volumePerWeek(
  sets: readonly { dateKey: string; reps: number | null; weightKg: number | null }[],
  from: string,
  to: string,
  weekStart: 'sun' | 'mon',
): { week: string; volume: number }[] {
  const vol = new Map<string, number>();
  for (const s of sets) {
    const w = weekKey(s.dateKey, weekStart);
    vol.set(w, (vol.get(w) ?? 0) + (s.reps ?? 0) * (s.weightKg ?? 0));
  }
  return weeksBetween(from, to, weekStart).map((week) => ({ week, volume: vol.get(week) ?? 0 }));
}

export interface SessionBest {
  logId: string;
  dateKey: string;
  /** Heaviest set (ties → more reps); null for sets without weight. */
  bestWeightKg: number | null;
  bestReps: number | null;
  /** Best Epley estimate in the session (section 7, 1–12 reps). */
  e1rm: number | null;
  /** For time/distance exercises. */
  bestTimeS: number | null;
  bestDistanceKm: number | null;
}

/** XP-5: best set and estimated one-rep max per session, in session order. */
export function sessionBests(
  sets: readonly {
    logId: string;
    dateKey: string;
    reps: number | null;
    weightKg: number | null;
    timeS: number | null;
    distanceKm: number | null;
  }[],
): SessionBest[] {
  const out = new Map<string, SessionBest>();
  for (const s of sets) {
    const b =
      out.get(s.logId) ??
      ({
        logId: s.logId,
        dateKey: s.dateKey,
        bestWeightKg: null,
        bestReps: null,
        e1rm: null,
        bestTimeS: null,
        bestDistanceKm: null,
      } as SessionBest);
    if (s.weightKg !== null) {
      if (
        b.bestWeightKg === null ||
        s.weightKg > b.bestWeightKg ||
        (s.weightKg === b.bestWeightKg && (s.reps ?? 0) > (b.bestReps ?? 0))
      ) {
        b.bestWeightKg = s.weightKg;
        b.bestReps = s.reps;
      }
      const e = s.reps ? estimateOneRepMax(s.weightKg, s.reps) : null;
      if (e !== null && (b.e1rm === null || e > b.e1rm)) b.e1rm = e;
    } else if (s.reps !== null && (b.bestReps === null || s.reps > b.bestReps)) {
      b.bestReps = s.reps;
    }
    if (s.timeS !== null && (b.bestTimeS === null || s.timeS > b.bestTimeS)) b.bestTimeS = s.timeS;
    if (s.distanceKm !== null && (b.bestDistanceKm === null || s.distanceKm > b.bestDistanceKm))
      b.bestDistanceKm = s.distanceKm;
    out.set(s.logId, b);
  }
  return [...out.values()];
}
