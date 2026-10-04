import type { Db } from '../types';
import type { RecordSet } from '@/domain/records';
import type { CsvSetRow } from '@/domain/csv';
import { clockAt } from '@/domain/time';

/** Finished logs only — a session in progress is not history yet. */
const FINISHED = 'l.end_utc IS NOT NULL';

export interface LogPoint {
  logId: string;
  dateKey: string;
  startUtc: string;
}

/** XP-2: finished logs since `from` (null = all). */
export async function logsSince(db: Db, from: string | null): Promise<LogPoint[]> {
  const rows = await db.query<{ id: string; d: string; s: string }>(
    `SELECT l.id, l.start_date_local AS d, l.start_utc AS s FROM workout_log l
     WHERE ${FINISHED} AND (? IS NULL OR l.start_date_local >= ?) ORDER BY l.start_utc`,
    [from, from],
  );
  return rows.map((r) => ({ logId: r.id, dateKey: r.d, startUtc: r.s }));
}

export interface WorkingSet {
  setId: string;
  logId: string;
  dateKey: string;
  startUtc: string;
  exerciseId: string | null;
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
}

/** Completed working sets (PD-9: warm-ups never count) since `from`. */
export async function workingSetsSince(
  db: Db,
  from: string | null,
  exerciseId?: string,
): Promise<WorkingSet[]> {
  const rows = await db.query<{
    id: string;
    log_id: string;
    d: string;
    s: string;
    exercise_id: string | null;
    reps: number | null;
    weight_kg: number | null;
    time_s: number | null;
    distance_km: number | null;
  }>(
    `SELECT s.id, l.id AS log_id, l.start_date_local AS d, l.start_utc AS s, e.exercise_id,
       s.reps, s.weight_kg, s.time_s, s.distance_km
     FROM log_set s JOIN logged_exercise e ON e.id = s.logged_exercise_id JOIN workout_log l ON l.id = e.log_id
     WHERE ${FINISHED} AND s.completed = 1 AND s.type = 'working'
       AND (? IS NULL OR l.start_date_local >= ?) AND (? IS NULL OR e.exercise_id = ?)
     ORDER BY l.start_utc, e.sort_order, s.set_number`,
    [from, from, exerciseId ?? null, exerciseId ?? null],
  );
  return rows.map((r) => ({
    setId: r.id,
    logId: r.log_id,
    dateKey: r.d,
    startUtc: r.s,
    exerciseId: r.exercise_id,
    reps: r.reps,
    weightKg: r.weight_kg,
    timeS: r.time_s,
    distanceKm: r.distance_km,
  }));
}

/** XP-4: completed working sets per category (current categories, VR-10). */
export async function setsPerCategory(
  db: Db,
  from: string | null,
): Promise<{ id: string; name: string; color: string; sets: number }[]> {
  return db.query(
    `SELECT c.id, c.name, c.color, COUNT(*) AS sets
     FROM log_set s JOIN logged_exercise e ON e.id = s.logged_exercise_id JOIN workout_log l ON l.id = e.log_id
       JOIN exercise_category ec ON ec.exercise_id = e.exercise_id JOIN category c ON c.id = ec.category_id
     WHERE ${FINISHED} AND s.completed = 1 AND s.type = 'working' AND (? IS NULL OR l.start_date_local >= ?)
     GROUP BY c.id ORDER BY sets DESC, c.name`,
    [from, from],
  );
}

/** XP-6 input: all completed sets with their achievement time. */
export async function recordSets(db: Db): Promise<RecordSet[]> {
  const rows = await db.query<{
    id: string;
    exercise_id: string;
    log_id: string;
    at: string;
    type: 'warmup' | 'working';
    completed: number;
    reps: number | null;
    weight_kg: number | null;
    time_s: number | null;
    distance_km: number | null;
  }>(
    `SELECT s.id, e.exercise_id, l.id AS log_id, l.start_utc AS at, s.type, s.completed,
       s.reps, s.weight_kg, s.time_s, s.distance_km
     FROM log_set s JOIN logged_exercise e ON e.id = s.logged_exercise_id JOIN workout_log l ON l.id = e.log_id
     WHERE e.exercise_id IS NOT NULL AND s.completed = 1 AND s.type = 'working'`,
  );
  return rows.map((r) => ({
    setId: r.id,
    exerciseId: r.exercise_id,
    logId: r.log_id,
    achievedUtc: r.at,
    type: r.type,
    completed: !!r.completed,
    reps: r.reps,
    weightKg: r.weight_kg,
    timeS: r.time_s,
    distanceKm: r.distance_km,
  }));
}

/** XP-7: body weight and measurements per finished log since `from`. */
export async function bodySince(
  db: Db,
  from: string | null,
): Promise<
  {
    logId: string;
    dateKey: string;
    bodyWeightKg: number | null;
    measurements: Record<string, number>;
  }[]
> {
  const logs = await db.query<{ id: string; d: string; w: number | null }>(
    `SELECT l.id, l.start_date_local AS d, l.body_weight_kg AS w FROM workout_log l
     WHERE ${FINISHED} AND (? IS NULL OR l.start_date_local >= ?) ORDER BY l.start_utc`,
    [from, from],
  );
  const meas = await db.query<{ log_id: string; type: string; value: number }>(
    `SELECT m.log_id, m.type, m.value FROM measurement m JOIN workout_log l ON l.id = m.log_id
     WHERE ${FINISHED} AND (? IS NULL OR l.start_date_local >= ?)`,
    [from, from],
  );
  return logs
    .map((l) => ({
      logId: l.id,
      dateKey: l.d,
      bodyWeightKg: l.w,
      measurements: Object.fromEntries(
        meas.filter((m) => m.log_id === l.id).map((m) => [m.type, m.value]),
      ),
    }))
    .filter((l) => l.bodyWeightKg !== null || Object.keys(l.measurements).length > 0);
}

/** ST-6 / AC-19: every set of every log. */
export async function csvRows(db: Db): Promise<CsvSetRow[]> {
  const rows = await db.query<{
    log_id: string;
    name: string;
    d: string;
    start_utc: string;
    start_off: number;
    end_utc: string | null;
    end_off: number | null;
    bw: number | null;
    ord: number;
    ex: string;
    eq: string | null;
    set_number: number;
    type: 'warmup' | 'working';
    reps: number | null;
    weight_kg: number | null;
    time_s: number | null;
    distance_km: number | null;
    rpe: number | null;
    completed: number;
  }>(
    `SELECT l.id AS log_id, l.name, l.start_date_local AS d, l.start_utc, l.start_offset_min AS start_off,
       l.end_utc, l.end_offset_min AS end_off, l.body_weight_kg AS bw, e.sort_order AS ord,
       e.name_snapshot AS ex, e.equipment_snapshot AS eq, s.set_number, s.type, s.reps, s.weight_kg,
       s.time_s, s.distance_km, s.rpe, s.completed
     FROM log_set s JOIN logged_exercise e ON e.id = s.logged_exercise_id JOIN workout_log l ON l.id = e.log_id
     ORDER BY l.start_utc, e.sort_order, CASE s.type WHEN 'warmup' THEN 0 ELSE 1 END, s.set_number`,
  );
  return rows.map((r) => ({
    logId: r.log_id,
    workout: r.name,
    date: r.d,
    startTime: clockAt(r.start_utc, r.start_off),
    endTime: r.end_utc ? clockAt(r.end_utc, r.end_off ?? r.start_off) : '',
    bodyWeightKg: r.bw,
    exerciseOrder: r.ord + 1,
    exercise: r.ex,
    equipment: r.eq,
    setNumber: r.set_number,
    setType: r.type,
    reps: r.reps,
    weightKg: r.weight_kg,
    timeS: r.time_s,
    distanceKm: r.distance_km,
    rpe: r.rpe,
    completed: !!r.completed,
  }));
}
