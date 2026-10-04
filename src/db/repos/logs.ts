import type { FocusMetric, SetType } from '@/domain/types';
import { dateKeyAt, nowStamp, type Stamp } from '@/domain/time';
import { finishEndUtc } from '@/domain/session';
import type { Db } from '../types';
import type {
  ActiveSession,
  Category,
  LogCard,
  LoggedExercise,
  LogSetRow,
  WorkoutLog,
} from '../models';
import { newId } from '../ids';
import { getExercise, getExercises } from './library';
import {
  dissolveSmallSuperset,
  getTemplate,
  renumberSets,
  SET_ORDER,
  type SetPatch,
} from './workouts';

export const QUICK_WORKOUT_NAME = 'Quick Workout'; // PD-2
export const EMPTY_WORKOUT_NAME = 'Workout'; // PD-3 "Empty Workout"

interface LogRow {
  id: string;
  template_id: string | null;
  name: string;
  start_utc: string;
  start_offset_min: number;
  start_date_local: string;
  end_utc: string | null;
  end_offset_min: number | null;
  body_weight_kg: number | null;
  rest_time_s: number | null;
}

async function insertLog(
  db: Db,
  name: string,
  templateId: string | null,
  start: Stamp,
): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO workout_log (id, template_id, name, start_utc, start_offset_min, start_date_local, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      templateId,
      name,
      start.utc,
      start.offsetMin,
      dateKeyAt(start.utc, start.offsetMin),
      new Date().toISOString(),
    ],
  );
  return id;
}

async function nextExerciseOrder(db: Db, logId: string): Promise<number> {
  const [r] = await db.query<{ n: number | null }>(
    'SELECT MAX(sort_order) AS n FROM logged_exercise WHERE log_id = ?',
    [logId],
  );
  return (r?.n ?? -1) + 1;
}

/** Inserts a logged exercise with a snapshot of the library definition (BR-13, VR-9). */
export async function addLoggedExercise(
  db: Db,
  logId: string,
  exerciseId: string,
  opts: { supersetGroup?: string | null; withDefaultSet?: boolean } = {},
): Promise<string> {
  const ex = await getExercise(db, exerciseId);
  if (!ex) throw new Error('Exercise not found');
  const id = newId();
  await db.run(
    `INSERT INTO logged_exercise (id, log_id, exercise_id, name_snapshot, primary_focus_snapshot,
       secondary_focus_snapshot, equipment_snapshot, categories_snapshot, superset_group, sort_order, kind)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'exercise')`,
    [
      id,
      logId,
      ex.id,
      ex.name,
      ex.primary,
      ex.secondary,
      ex.equipmentName,
      JSON.stringify(ex.categories),
      opts.supersetGroup ?? null,
      await nextExerciseOrder(db, logId),
    ],
  );
  if (opts.withDefaultSet !== false) await addLogSet(db, id, 'working');
  return id;
}

async function startFromTemplate(db: Db, templateId: string, start: Stamp): Promise<string> {
  const t = await getTemplate(db, templateId);
  if (!t) throw new Error('Template not found');
  const logId = await insertLog(db, t.name, t.id, start);
  const groupMap = new Map<string, string>();
  for (const item of t.items) {
    const order = await nextExerciseOrder(db, logId);
    if (item.kind === 'wod') {
      await db.run(
        `INSERT INTO logged_exercise (id, log_id, kind, name_snapshot, primary_focus_snapshot, wod_title,
           wod_description, sort_order) VALUES (?, ?, 'wod', ?, 'time', ?, ?, ?)`,
        [newId(), logId, item.title, item.title, item.description, order],
      );
      continue;
    }
    let group: string | null = null;
    if (item.supersetGroup) {
      group = groupMap.get(item.supersetGroup) ?? newId();
      groupMap.set(item.supersetGroup, group);
    }
    const leId = await addLoggedExercise(db, logId, item.exercise.id, {
      supersetGroup: group,
      withDefaultSet: false,
    });
    // WL-5: sets pre-filled from the template
    for (const s of item.sets) {
      await db.run(
        `INSERT INTO log_set (id, logged_exercise_id, set_number, type, reps, weight_kg, time_s, distance_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), leId, s.setNumber, s.type, s.reps, s.weightKg, s.timeS, s.distanceKm],
      );
    }
  }
  return logId;
}

export type StartSource =
  { kind: 'template'; templateId: string } | { kind: 'quick' } | { kind: 'empty' };

/**
 * PD-1 / PD-2 / PD-3: creates a log (Start Time = now, or the selected date with the current
 * time for the Logs + button) and makes it the active session. Callers check VR-8 first.
 */
export async function startSession(
  db: Db,
  source: StartSource,
  start: Stamp = nowStamp(),
): Promise<string> {
  let id: string;
  if (source.kind === 'template') id = await startFromTemplate(db, source.templateId, start);
  else
    id = await insertLog(
      db,
      source.kind === 'quick' ? QUICK_WORKOUT_NAME : EMPTY_WORKOUT_NAME,
      null,
      start,
    );
  await db.run('DELETE FROM active_session');
  await db.run('INSERT INTO active_session (id, log_id) VALUES (1, ?)', [id]);
  return id;
}

export async function getActiveSession(db: Db): Promise<ActiveSession | null> {
  const [r] = await db.query<{ log_id: string; rest_end_utc: string | null }>(
    'SELECT log_id, rest_end_utc FROM active_session',
  );
  return r ? { logId: r.log_id, restEndUtc: r.rest_end_utc } : null;
}

/** VR-7: the rest timer survives app close because its end time is stored. */
export async function setRestEnd(db: Db, endUtc: string | null): Promise<void> {
  await db.run('UPDATE active_session SET rest_end_utc = ?', [endUtc]);
}

interface LeRow {
  id: string;
  kind: 'exercise' | 'wod';
  exercise_id: string | null;
  name_snapshot: string;
  primary_focus_snapshot: FocusMetric;
  secondary_focus_snapshot: FocusMetric | null;
  equipment_snapshot: string | null;
  categories_snapshot: string;
  superset_group: string | null;
  session_note: string;
  sort_order: number;
  wod_title: string | null;
  wod_description: string | null;
  wod_result_s: number | null;
}

interface LogSetDbRow {
  id: string;
  logged_exercise_id: string;
  set_number: number;
  type: SetType;
  reps: number | null;
  weight_kg: number | null;
  time_s: number | null;
  distance_km: number | null;
  rpe: number | null;
  completed: number;
}

const toLogSet = (r: LogSetDbRow): LogSetRow => ({
  id: r.id,
  setNumber: r.set_number,
  type: r.type,
  reps: r.reps,
  weightKg: r.weight_kg,
  timeS: r.time_s,
  distanceKm: r.distance_km,
  rpe: r.rpe,
  completed: !!r.completed,
});

function parseCategories(json: string): Category[] {
  try {
    return JSON.parse(json) as Category[];
  } catch {
    return [];
  }
}

export async function getLog(db: Db, id: string): Promise<WorkoutLog | null> {
  const [l] = await db.query<LogRow>('SELECT * FROM workout_log WHERE id = ?', [id]);
  if (!l) return null;
  const les = await db.query<LeRow>(
    'SELECT * FROM logged_exercise WHERE log_id = ? ORDER BY sort_order',
    [id],
  );
  const sets = await db.query<LogSetDbRow>(
    `SELECT s.* FROM log_set s JOIN logged_exercise e ON e.id = s.logged_exercise_id
     WHERE e.log_id = ? ORDER BY s.logged_exercise_id, ${SET_ORDER}`,
    [id],
  );
  const meas = await db.query<{ type: string; value: number }>(
    'SELECT type, value FROM measurement WHERE log_id = ?',
    [id],
  );
  const lib = await getExercises(
    db,
    les.filter((e) => e.exercise_id).map((e) => e.exercise_id!),
  );
  const exercises: LoggedExercise[] = les.map((e) => {
    const found = e.exercise_id ? lib.get(e.exercise_id) : undefined;
    // VR-9: a deleted exercise shows the stored copy; categories stay for calendar dots
    const live = found && !found.deleted ? found : undefined;
    const categories: Category[] = found
      ? found.categories
      : parseCategories(e.categories_snapshot);
    return {
      id: e.id,
      kind: e.kind,
      exerciseId: e.exercise_id,
      // BR-13: name/focus/equipment follow library edits; deleted exercises keep the stored copy
      name: live?.name ?? e.name_snapshot,
      primary: live?.primary ?? e.primary_focus_snapshot,
      secondary: live ? live.secondary : e.secondary_focus_snapshot,
      equipment: live ? live.equipmentName : e.equipment_snapshot,
      exerciseNote: live ? live.note : null,
      exerciseTutorialUrl: live?.tutorialUrl || null,
      sessionNote: e.session_note,
      categories,
      supersetGroup: e.superset_group,
      sortOrder: e.sort_order,
      wodTitle: e.wod_title,
      wodDescription: e.wod_description,
      wodResultS: e.wod_result_s,
      sets: sets.filter((s) => s.logged_exercise_id === e.id).map(toLogSet),
    };
  });
  return {
    id: l.id,
    templateId: l.template_id,
    name: l.name,
    startUtc: l.start_utc,
    startOffsetMin: l.start_offset_min,
    startDateKey: l.start_date_local,
    endUtc: l.end_utc,
    endOffsetMin: l.end_offset_min,
    bodyWeightKg: l.body_weight_kg,
    restTimeS: l.rest_time_s,
    measurements: Object.fromEntries(meas.map((m) => [m.type, m.value])),
    exercises,
  };
}

export async function updateLog(
  db: Db,
  id: string,
  patch: Partial<{
    name: string;
    start: Stamp;
    end: Stamp | null;
    bodyWeightKg: number | null;
    restTimeS: number | null;
  }>,
): Promise<void> {
  if (patch.name !== undefined)
    await db.run('UPDATE workout_log SET name = ? WHERE id = ?', [patch.name.trim(), id]);
  if (patch.start !== undefined) {
    await db.run(
      'UPDATE workout_log SET start_utc = ?, start_offset_min = ?, start_date_local = ? WHERE id = ?',
      [
        patch.start.utc,
        patch.start.offsetMin,
        dateKeyAt(patch.start.utc, patch.start.offsetMin),
        id,
      ],
    );
  }
  if (patch.end !== undefined) {
    await db.run('UPDATE workout_log SET end_utc = ?, end_offset_min = ? WHERE id = ?', [
      patch.end?.utc ?? null,
      patch.end?.offsetMin ?? null,
      id,
    ]);
  }
  if (patch.bodyWeightKg !== undefined)
    await db.run('UPDATE workout_log SET body_weight_kg = ? WHERE id = ?', [
      patch.bodyWeightKg,
      id,
    ]);
  if (patch.restTimeS !== undefined)
    await db.run('UPDATE workout_log SET rest_time_s = ? WHERE id = ?', [patch.restTimeS, id]);
}

/** PD-14: each measurement is optional; null removes it. */
export async function setMeasurement(
  db: Db,
  logId: string,
  type: string,
  value: number | null,
  unit: string,
): Promise<void> {
  await db.run('DELETE FROM measurement WHERE log_id = ? AND type = ?', [logId, type]);
  if (value !== null) {
    await db.run('INSERT INTO measurement (id, log_id, type, value, unit) VALUES (?, ?, ?, ?, ?)', [
      newId(),
      logId,
      type,
      value,
      unit,
    ]);
  }
}

/** Adds a set numbered next in sequence with the previous set's values (WL-7, AC-10). */
export async function addLogSet(db: Db, loggedExerciseId: string, type: SetType): Promise<string> {
  const [last] = await db.query<LogSetDbRow>(
    'SELECT * FROM log_set WHERE logged_exercise_id = ? AND type = ? ORDER BY set_number DESC LIMIT 1',
    [loggedExerciseId, type],
  );
  const [fallback] = last
    ? [last]
    : await db.query<LogSetDbRow>(
        `SELECT * FROM log_set WHERE logged_exercise_id = ? ORDER BY ${SET_ORDER} DESC LIMIT 1`,
        [loggedExerciseId],
      );
  const src = fallback;
  const id = newId();
  await db.run(
    `INSERT INTO log_set (id, logged_exercise_id, set_number, type, reps, weight_kg, time_s, distance_km, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      loggedExerciseId,
      (last?.set_number ?? 0) + 1,
      type,
      src?.reps ?? null,
      src?.weight_kg ?? null,
      src?.time_s ?? null,
      src?.distance_km ?? null,
    ],
  );
  return id;
}

export async function updateLogSet(
  db: Db,
  setId: string,
  patch: SetPatch & { rpe?: number | null },
): Promise<void> {
  const cols: Record<string, string> = {
    reps: 'reps',
    weightKg: 'weight_kg',
    timeS: 'time_s',
    distanceKm: 'distance_km',
    rpe: 'rpe',
  };
  for (const [k, v] of Object.entries(patch)) {
    if (cols[k])
      await db.run(`UPDATE log_set SET ${cols[k]} = ? WHERE id = ?`, [v as number | null, setId]);
  }
}

/** WL-6: toggles completion. */
export async function setLogSetCompleted(db: Db, setId: string, completed: boolean): Promise<void> {
  await db.run('UPDATE log_set SET completed = ?, completed_at = ? WHERE id = ?', [
    completed ? 1 : 0,
    completed ? new Date().toISOString() : null,
    setId,
  ]);
}

export async function deleteLogSet(db: Db, setId: string): Promise<void> {
  const [s] = await db.query<{ logged_exercise_id: string }>(
    'SELECT logged_exercise_id FROM log_set WHERE id = ?',
    [setId],
  );
  await db.run('DELETE FROM log_set WHERE id = ?', [setId]);
  if (s) await renumberSets(db, 'log_set', 'logged_exercise_id', s.logged_exercise_id);
}

export async function updateLoggedExercise(
  db: Db,
  id: string,
  patch: Partial<{ sessionNote: string; wodResultS: number | null }>,
): Promise<void> {
  if (patch.sessionNote !== undefined)
    await db.run('UPDATE logged_exercise SET session_note = ? WHERE id = ?', [
      patch.sessionNote,
      id,
    ]);
  if (patch.wodResultS !== undefined)
    await db.run('UPDATE logged_exercise SET wod_result_s = ? WHERE id = ?', [
      patch.wodResultS,
      id,
    ]);
}

export async function removeLoggedExercise(db: Db, id: string): Promise<void> {
  const [e] = await db.query<{ superset_group: string | null }>(
    'SELECT superset_group FROM logged_exercise WHERE id = ?',
    [id],
  );
  await db.run('DELETE FROM logged_exercise WHERE id = ?', [id]);
  if (e?.superset_group) await dissolveSmallSuperset(db, 'logged_exercise', e.superset_group);
}

/** PD-10 Replace Exercise: swaps the definition, keeping the sets. */
export async function replaceLoggedExercise(db: Db, id: string, exerciseId: string): Promise<void> {
  const ex = await getExercise(db, exerciseId);
  if (!ex) return;
  await db.run(
    `UPDATE logged_exercise SET exercise_id = ?, name_snapshot = ?, primary_focus_snapshot = ?,
       secondary_focus_snapshot = ?, equipment_snapshot = ?, categories_snapshot = ? WHERE id = ?`,
    [ex.id, ex.name, ex.primary, ex.secondary, ex.equipmentName, JSON.stringify(ex.categories), id],
  );
}

export async function reorderLoggedExercises(db: Db, ids: readonly string[]): Promise<void> {
  for (const [i, id] of ids.entries())
    await db.run('UPDATE logged_exercise SET sort_order = ? WHERE id = ?', [i, id]);
}

/** VR-5 "Mark all complete". */
export async function completeAllSets(db: Db, logId: string): Promise<void> {
  await db.run(
    `UPDATE log_set SET completed = 1, completed_at = ? WHERE completed = 0 AND logged_exercise_id IN
       (SELECT id FROM logged_exercise WHERE log_id = ?)`,
    [new Date().toISOString(), logId],
  );
}

/** VR-5 "Finish anyway": open sets are discarded. */
export async function discardOpenSets(db: Db, logId: string): Promise<void> {
  await db.run(
    `DELETE FROM log_set WHERE completed = 0 AND logged_exercise_id IN (SELECT id FROM logged_exercise WHERE log_id = ?)`,
    [logId],
  );
}

/** SS-4: End Time = now (or start + 1 h for a back-filled log), session closed. */
export async function finishSession(db: Db, logId: string, now: Date = new Date()): Promise<void> {
  const [l] = await db.query<{ start_utc: string }>(
    'SELECT start_utc FROM workout_log WHERE id = ?',
    [logId],
  );
  if (!l) return;
  const end = finishEndUtc(l.start_utc, now);
  await db.run('UPDATE workout_log SET end_utc = ?, end_offset_min = ? WHERE id = ?', [
    end,
    -now.getTimezoneOffset(),
    logId,
  ]);
  await db.run('DELETE FROM active_session WHERE log_id = ?', [logId]);
  await db.run(
    'UPDATE preferences SET sessions_since_backup = sessions_since_backup + 1 WHERE id = 1',
  );
}

/** VR-6 discard / PD-11 Delete Log. */
export async function deleteLog(db: Db, logId: string): Promise<void> {
  await db.run('DELETE FROM active_session WHERE log_id = ?', [logId]);
  await db.run('DELETE FROM workout_log WHERE id = ?', [logId]);
}

/**
 * PD-4 Update Template: copies performed reps, weights and set counts into the template.
 * Exercises are matched in order; the template keeps its other content.
 */
export async function updateTemplateFromLog(db: Db, logId: string): Promise<void> {
  const log = await getLog(db, logId);
  if (!log?.templateId) return;
  const items = await db.query<{ id: string; exercise_id: string }>(
    `SELECT id, exercise_id FROM template_item WHERE template_id = ? AND kind = 'exercise' ORDER BY sort_order`,
    [log.templateId],
  );
  const used = new Set<string>();
  for (const le of log.exercises) {
    if (le.kind !== 'exercise' || !le.exerciseId) continue;
    const item = items.find((i) => i.exercise_id === le.exerciseId && !used.has(i.id));
    if (!item) continue;
    used.add(item.id);
    await db.run('DELETE FROM template_set WHERE template_item_id = ?', [item.id]);
    for (const s of le.sets) {
      await db.run(
        `INSERT INTO template_set (id, template_item_id, set_number, type, reps, weight_kg, time_s, distance_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), item.id, s.setNumber, s.type, s.reps, s.weightKg, s.timeS, s.distanceKm],
      );
    }
  }
}

/** PD-11 Save as Template: a new template in Default with the log's exercises and sets. */
export async function saveLogAsTemplate(
  db: Db,
  logId: string,
  name: string,
  groupId: string,
): Promise<string> {
  const log = await getLog(db, logId);
  if (!log) throw new Error('Log not found');
  const tId = newId();
  const [o] = await db.query<{ n: number | null }>(
    'SELECT MAX(sort_order) AS n FROM workout_template WHERE group_id = ?',
    [groupId],
  );
  await db.run(
    'INSERT INTO workout_template (id, group_id, name, note, sort_order) VALUES (?, ?, ?, ?, ?)',
    [tId, groupId, name.trim(), '', (o?.n ?? -1) + 1],
  );
  const groupMap = new Map<string, string>();
  for (const [i, le] of log.exercises.entries()) {
    const itemId = newId();
    if (le.kind === 'wod') {
      await db.run(
        `INSERT INTO template_item (id, template_id, kind, wod_title, wod_description, sort_order) VALUES (?, ?, 'wod', ?, ?, ?)`,
        [itemId, tId, le.wodTitle ?? le.name, le.wodDescription ?? '', i],
      );
      continue;
    }
    if (!le.exerciseId) continue;
    let group: string | null = null;
    if (le.supersetGroup) {
      group = groupMap.get(le.supersetGroup) ?? newId();
      groupMap.set(le.supersetGroup, group);
    }
    await db.run(
      `INSERT INTO template_item (id, template_id, kind, exercise_id, superset_group, sort_order) VALUES (?, ?, 'exercise', ?, ?, ?)`,
      [itemId, tId, le.exerciseId, group, i],
    );
    for (const s of le.sets) {
      await db.run(
        `INSERT INTO template_set (id, template_item_id, set_number, type, reps, weight_kg, time_s, distance_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), itemId, s.setNumber, s.type, s.reps, s.weightKg, s.timeS, s.distanceKm],
      );
    }
  }
  return tId;
}

// ---- calendar (LG-*) ----

/**
 * LG-3 / LG-4 / BR-6: dates in [from, to] with at least one log, and the distinct current
 * categories of the exercises logged that date (VR-13 combines several logs).
 */
export async function calendarMonth(
  db: Db,
  from: string,
  to: string,
): Promise<Map<string, Category[]>> {
  const days = await db.query<{ d: string }>(
    'SELECT DISTINCT start_date_local AS d FROM workout_log WHERE start_date_local BETWEEN ? AND ?',
    [from, to],
  );
  const cats = await db.query<{ d: string; id: string; name: string; color: string }>(
    `SELECT DISTINCT l.start_date_local AS d, c.id, c.name, c.color FROM workout_log l
       JOIN logged_exercise e ON e.log_id = l.id
       JOIN exercise_category ec ON ec.exercise_id = e.exercise_id
       JOIN category c ON c.id = ec.category_id
     WHERE l.start_date_local BETWEEN ? AND ? ORDER BY c.name COLLATE NOCASE`,
    [from, to],
  );
  const map = new Map<string, Category[]>(days.map((r) => [r.d, []]));
  for (const c of cats) map.get(c.d)?.push({ id: c.id, name: c.name, color: c.color });
  return map;
}

/** LG-7 / VR-13: the day's logs, newest first. */
export async function logsOnDate(db: Db, dateKey: string): Promise<LogCard[]> {
  const rows = await db.query<{
    id: string;
    name: string;
    start_utc: string;
    start_offset_min: number;
    end_utc: string | null;
    n: number;
  }>(
    `SELECT l.id, l.name, l.start_utc, l.start_offset_min, l.end_utc,
       (SELECT COUNT(*) FROM logged_exercise e WHERE e.log_id = l.id AND e.kind = 'exercise') AS n
     FROM workout_log l WHERE l.start_date_local = ? ORDER BY l.start_utc DESC`,
    [dateKey],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startUtc: r.start_utc,
    startOffsetMin: r.start_offset_min,
    endUtc: r.end_utc,
    exercises: r.n,
  }));
}

/** PD-10 View History: previous performances of an exercise (completed sets), newest first. */
export async function exerciseHistory(
  db: Db,
  exerciseId: string,
  limit = 20,
): Promise<
  { logId: string; name: string; startUtc: string; startOffsetMin: number; sets: LogSetRow[] }[]
> {
  const les = await db.query<{
    id: string;
    log_id: string;
    name: string;
    start_utc: string;
    start_offset_min: number;
  }>(
    `SELECT e.id, e.log_id, l.name, l.start_utc, l.start_offset_min FROM logged_exercise e
     JOIN workout_log l ON l.id = e.log_id WHERE e.exercise_id = ? AND l.end_utc IS NOT NULL
     ORDER BY l.start_utc DESC LIMIT ?`,
    [exerciseId, limit],
  );
  const out = [];
  for (const le of les) {
    const sets = await db.query<LogSetDbRow>(
      `SELECT * FROM log_set WHERE logged_exercise_id = ? AND completed = 1 ORDER BY ${SET_ORDER}`,
      [le.id],
    );
    out.push({
      logId: le.log_id,
      name: le.name,
      startUtc: le.start_utc,
      startOffsetMin: le.start_offset_min,
      sets: sets.map(toLogSet),
    });
  }
  return out;
}
