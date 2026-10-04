import type { FocusMetric } from '@/domain/types';
import { sortByName } from '@/domain/sort';
import type { Db } from '../types';
import type { Category, Equipment, Exercise } from '../models';
import { newId } from '../ids';

interface ExerciseRow {
  id: string;
  name: string;
  primary_focus: FocusMetric;
  secondary_focus: FocusMetric | null;
  equipment_id: string | null;
  equipment_name: string | null;
  note: string;
  tutorial_url: string;
  is_custom: number;
  deleted_at: string | null;
}

const EXERCISE_SELECT = `SELECT e.id, e.name, e.primary_focus, e.secondary_focus, e.equipment_id,
  q.name AS equipment_name, e.note, e.tutorial_url, e.is_custom, e.deleted_at
  FROM exercise e LEFT JOIN equipment q ON q.id = e.equipment_id`;

async function categoriesByExercise(
  db: Db,
  ids?: readonly string[],
): Promise<Map<string, Category[]>> {
  const where = ids ? `WHERE ec.exercise_id IN (${ids.map(() => '?').join(',') || "''"})` : '';
  const rows = await db.query<{ exercise_id: string; id: string; name: string; color: string }>(
    `SELECT ec.exercise_id, c.id, c.name, c.color FROM exercise_category ec
     JOIN category c ON c.id = ec.category_id ${where} ORDER BY c.name COLLATE NOCASE`,
    ids ? [...ids] : [],
  );
  const map = new Map<string, Category[]>();
  for (const r of rows) {
    const list = map.get(r.exercise_id) ?? [];
    list.push({ id: r.id, name: r.name, color: r.color });
    map.set(r.exercise_id, list);
  }
  return map;
}

function toExercise(r: ExerciseRow, cats: Map<string, Category[]>): Exercise {
  return {
    id: r.id,
    name: r.name,
    primary: r.primary_focus,
    secondary: r.secondary_focus,
    equipmentId: r.equipment_id,
    equipmentName: r.equipment_name,
    note: r.note,
    tutorialUrl: r.tutorial_url ?? '',
    isCustom: !!r.is_custom,
    deleted: r.deleted_at !== null,
    categories: cats.get(r.id) ?? [],
  };
}

/** EX-2/EX-3: library sorted with numbers before letters. Deleted exercises are hidden (VR-9). */
export async function listExercises(db: Db): Promise<Exercise[]> {
  const rows = await db.query<ExerciseRow>(`${EXERCISE_SELECT} WHERE e.deleted_at IS NULL`);
  const cats = await categoriesByExercise(db);
  return sortByName(rows.map((r) => toExercise(r, cats)));
}

export async function getExercise(db: Db, id: string): Promise<Exercise | null> {
  const [r] = await db.query<ExerciseRow>(`${EXERCISE_SELECT} WHERE e.id = ?`, [id]);
  if (!r) return null;
  return toExercise(r, await categoriesByExercise(db, [id]));
}

export async function getExercises(db: Db, ids: readonly string[]): Promise<Map<string, Exercise>> {
  if (!ids.length) return new Map();
  const rows = await db.query<ExerciseRow>(
    `${EXERCISE_SELECT} WHERE e.id IN (${ids.map(() => '?').join(',')})`,
    [...ids],
  );
  const cats = await categoriesByExercise(db, ids);
  return new Map(rows.map((r) => [r.id, toExercise(r, cats)]));
}

export async function exerciseNames(db: Db, exceptId?: string): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    'SELECT name FROM exercise WHERE deleted_at IS NULL AND id != ?',
    [exceptId ?? ''],
  );
  return rows.map((r) => r.name);
}

/** EX-5: new custom exercise (default focus Reps + Weight, equipment None). */
export async function createExercise(db: Db, name: string): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO exercise (id, name, primary_focus, secondary_focus, equipment_id, note, is_custom)
     VALUES (?, ?, 'reps', 'weight', 'eq-none', '', 1)`,
    [id, name.trim()],
  );
  return id;
}

export type ExercisePatch = Partial<{
  name: string;
  primary: FocusMetric;
  secondary: FocusMetric | null;
  equipmentId: string | null;
  note: string;
  /** ED-7: already normalised by domain/tutorial (web links only). */
  tutorialUrl: string;
}>;

/** ED-6 / BR-13: definition changes apply everywhere; recorded log values are untouched. */
export async function updateExercise(db: Db, id: string, patch: ExercisePatch): Promise<void> {
  const cols: [string, string | null][] = [];
  if (patch.name !== undefined) cols.push(['name', patch.name.trim()]);
  if (patch.primary !== undefined) cols.push(['primary_focus', patch.primary]);
  if (patch.secondary !== undefined) cols.push(['secondary_focus', patch.secondary]);
  if (patch.equipmentId !== undefined) cols.push(['equipment_id', patch.equipmentId]);
  if (patch.note !== undefined) cols.push(['note', patch.note]);
  if (patch.tutorialUrl !== undefined) cols.push(['tutorial_url', patch.tutorialUrl]);
  if (!cols.length) return;
  await db.run(`UPDATE exercise SET ${cols.map(([c]) => `${c} = ?`).join(', ')} WHERE id = ?`, [
    ...cols.map(([, v]) => v),
    id,
  ]);
}

export async function addExerciseCategory(
  db: Db,
  exerciseId: string,
  categoryId: string,
): Promise<void> {
  await db.run('INSERT OR IGNORE INTO exercise_category (exercise_id, category_id) VALUES (?, ?)', [
    exerciseId,
    categoryId,
  ]);
}

export async function removeExerciseCategory(
  db: Db,
  exerciseId: string,
  categoryId: string,
): Promise<void> {
  await db.run('DELETE FROM exercise_category WHERE exercise_id = ? AND category_id = ?', [
    exerciseId,
    categoryId,
  ]);
}

/**
 * VR-9: removed from the library and from templates; past logs keep their stored copy
 * (logged_exercise snapshots), so the row is soft-deleted.
 */
export async function deleteExercise(db: Db, id: string): Promise<void> {
  await db.run('UPDATE exercise SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  await db.run(`DELETE FROM template_item WHERE kind = 'exercise' AND exercise_id = ?`, [id]);
}

// ---- categories (ST-4, VR-10) ----

export async function listCategories(db: Db): Promise<Category[]> {
  return sortByName(await db.query<Category>('SELECT id, name, color FROM category'));
}

export async function createCategory(db: Db, name: string, color: string): Promise<string> {
  const id = newId();
  await db.run('INSERT INTO category (id, name, color) VALUES (?, ?, ?)', [id, name.trim(), color]);
  return id;
}

export async function updateCategory(
  db: Db,
  id: string,
  patch: { name?: string; color?: string },
): Promise<void> {
  if (patch.name !== undefined)
    await db.run('UPDATE category SET name = ? WHERE id = ?', [patch.name.trim(), id]);
  if (patch.color !== undefined)
    await db.run('UPDATE category SET color = ? WHERE id = ?', [patch.color, id]);
}

/** VR-10: removed from all exercises; calendar dots derive from current categories, so they update. */
export async function deleteCategory(db: Db, id: string): Promise<void> {
  await db.run('DELETE FROM exercise_category WHERE category_id = ?', [id]);
  await db.run('DELETE FROM category WHERE id = ?', [id]);
}

// ---- equipment (ST-4) ----

export async function listEquipment(db: Db): Promise<Equipment[]> {
  const rows = await db.query<Equipment>('SELECT id, name FROM equipment');
  // "None" first, rest alphabetical
  return [
    ...rows.filter((r) => r.id === 'eq-none'),
    ...sortByName(rows.filter((r) => r.id !== 'eq-none')),
  ];
}

export async function createEquipment(db: Db, name: string): Promise<string> {
  const id = newId();
  await db.run('INSERT INTO equipment (id, name) VALUES (?, ?)', [id, name.trim()]);
  return id;
}

export async function renameEquipment(db: Db, id: string, name: string): Promise<void> {
  await db.run('UPDATE equipment SET name = ? WHERE id = ?', [name.trim(), id]);
}

/** Exercises using it fall back to None. "None" itself cannot be deleted. */
export async function deleteEquipment(db: Db, id: string): Promise<void> {
  if (id === 'eq-none') return;
  await db.run(`UPDATE exercise SET equipment_id = 'eq-none' WHERE equipment_id = ?`, [id]);
  await db.run('DELETE FROM equipment WHERE id = ?', [id]);
}
