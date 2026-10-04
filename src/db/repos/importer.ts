import { endDateKey, inferFocus, type ImportLog } from '@/domain/importData';
import { localToUtc } from '@/domain/time';
import type { Db } from '../types';
import { newId } from '../ids';
import { addLoggedExercise } from './logs';
import { createExercise, updateExercise } from './library';

export interface ImportResult {
  imported: number;
  /** Workouts already in the app (same id, or same start and name) — never duplicated. */
  skipped: number;
  newExercises: string[];
}

/**
 * PD-19: adds validated workouts from an import (existing data is kept). Exercises are matched
 * to the library by name (case-insensitive); unknown ones become custom exercises whose focus
 * follows the values in the file. `offsetOf(date)` is the device's UTC offset on that date.
 */
export async function importLogs(
  db: Db,
  logs: readonly ImportLog[],
  offsetOf: (dateKey: string) => number,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, newExercises: [] };
  const ids = new Set(
    (await db.query<{ id: string }>('SELECT id FROM workout_log')).map((r) => r.id),
  );
  const existing = new Set(
    (
      await db.query<{ k: string }>(`SELECT start_utc || '|' || lower(name) AS k FROM workout_log`)
    ).map((r) => r.k),
  );
  const library = new Map(
    (
      await db.query<{ id: string; name: string }>(
        'SELECT id, name FROM exercise WHERE deleted_at IS NULL',
      )
    ).map((r) => [r.name.trim().toLowerCase(), r.id]),
  );
  const equipment = new Map(
    (await db.query<{ id: string; name: string }>('SELECT id, name FROM equipment')).map((r) => [
      r.name.trim().toLowerCase(),
      r.id,
    ]),
  );

  for (const log of logs) {
    const offset = offsetOf(log.date);
    const startUtc = localToUtc(log.date, log.startTime, offset);
    const key = `${startUtc}|${log.name.toLowerCase()}`;
    if ((log.sourceId && ids.has(log.sourceId)) || existing.has(key)) {
      result.skipped++;
      continue;
    }
    const endKey = endDateKey(log);
    const endOffset = endKey ? offsetOf(endKey) : null;
    const endUtc =
      endKey && log.endTime && endOffset !== null
        ? localToUtc(endKey, log.endTime, endOffset)
        : null;
    const logId = newId();
    await db.run(
      `INSERT INTO workout_log (id, template_id, name, start_utc, start_offset_min, start_date_local,
         end_utc, end_offset_min, body_weight_kg, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        log.name,
        startUtc,
        offset,
        log.date,
        endUtc,
        endUtc ? endOffset : null,
        log.bodyWeightKg,
        new Date().toISOString(),
      ],
    );
    existing.add(key);
    for (const ex of log.exercises) {
      const lower = ex.name.trim().toLowerCase();
      let exerciseId = library.get(lower);
      if (!exerciseId) {
        exerciseId = await createExercise(db, ex.name);
        const [primary, secondary] = inferFocus(ex.sets);
        await updateExercise(db, exerciseId, {
          primary,
          secondary,
          equipmentId: equipment.get(ex.equipment?.trim().toLowerCase() ?? '') ?? 'eq-none',
        });
        library.set(lower, exerciseId);
        result.newExercises.push(ex.name);
      }
      const leId = await addLoggedExercise(db, logId, exerciseId, { withDefaultSet: false });
      for (const s of ex.sets) {
        await db.run(
          `INSERT INTO log_set (id, logged_exercise_id, set_number, type, reps, weight_kg, time_s,
             distance_km, rpe, completed, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            leId,
            s.setNumber,
            s.type,
            s.reps,
            s.weightKg,
            s.timeS,
            s.distanceKm,
            s.rpe,
            s.completed ? 1 : 0,
            s.completed ? (endUtc ?? startUtc) : null,
          ],
        );
      }
    }
    result.imported++;
  }
  return result;
}
