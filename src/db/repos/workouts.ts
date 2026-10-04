import type { SetType } from '@/domain/types';
import type { Db } from '../types';
import type {
  SetRow,
  TemplateDetail,
  TemplateItem,
  TemplateSummary,
  WorkoutGroup,
} from '../models';
import { newId } from '../ids';
import { getExercises } from './library';
import { DEFAULT_GROUP_ID } from '@/seed/seed';

interface GroupRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  expanded: number;
  is_default: number;
}

const toGroup = (r: GroupRow): WorkoutGroup => ({
  id: r.id,
  name: r.name,
  color: r.color,
  sortOrder: r.sort_order,
  expanded: !!r.expanded,
  isDefault: !!r.is_default,
});

export async function listGroups(db: Db): Promise<WorkoutGroup[]> {
  const rows = await db.query<GroupRow>('SELECT * FROM workout_group ORDER BY sort_order, name');
  return rows.map(toGroup);
}

/**
 * WO-3 / BR-2 / BR-3: template rows with Last Completed (start of the latest finished log
 * from the template) and Next Workout totals (working sets only, BR-12).
 */
export async function listTemplates(db: Db): Promise<TemplateSummary[]> {
  const rows = await db.query<{
    id: string;
    group_id: string;
    name: string;
    sort_order: number;
    last_utc: string | null;
    last_offset: number | null;
    exercises: number;
    sets: number;
    reps: number;
  }>(
    `SELECT t.id, t.group_id, t.name, t.sort_order,
       (SELECT l.start_utc FROM workout_log l WHERE l.template_id = t.id AND l.end_utc IS NOT NULL
          ORDER BY l.start_utc DESC LIMIT 1) AS last_utc,
       (SELECT l.start_offset_min FROM workout_log l WHERE l.template_id = t.id AND l.end_utc IS NOT NULL
          ORDER BY l.start_utc DESC LIMIT 1) AS last_offset,
       (SELECT COUNT(*) FROM template_item i WHERE i.template_id = t.id AND i.kind = 'exercise') AS exercises,
       (SELECT COUNT(*) FROM template_set s JOIN template_item i ON i.id = s.template_item_id
          WHERE i.template_id = t.id AND s.type = 'working') AS sets,
       (SELECT COALESCE(SUM(s.reps), 0) FROM template_set s JOIN template_item i ON i.id = s.template_item_id
          WHERE i.template_id = t.id AND s.type = 'working') AS reps
     FROM workout_template t ORDER BY t.sort_order, t.name`,
  );
  return rows.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    sortOrder: r.sort_order,
    lastCompletedUtc: r.last_utc,
    lastCompletedOffsetMin: r.last_offset,
    exercises: r.exercises,
    sets: r.sets,
    reps: r.reps,
  }));
}

const nextOrder = async (
  db: Db,
  table: string,
  where = '',
  params: string[] = [],
): Promise<number> => {
  const [r] = await db.query<{ n: number | null }>(
    `SELECT MAX(sort_order) AS n FROM ${table} ${where}`,
    params,
  );
  return (r?.n ?? -1) + 1;
};

export async function createGroup(db: Db, name: string, color = '#1e7bf2'): Promise<string> {
  const id = newId();
  await db.run(
    'INSERT INTO workout_group (id, name, color, sort_order, expanded, is_default) VALUES (?, ?, ?, ?, 1, 0)',
    [id, name.trim(), color, await nextOrder(db, 'workout_group')],
  );
  return id;
}

export async function updateGroup(
  db: Db,
  id: string,
  patch: Partial<{ name: string; color: string; expanded: boolean }>,
): Promise<void> {
  if (patch.name !== undefined)
    await db.run('UPDATE workout_group SET name = ? WHERE id = ?', [patch.name.trim(), id]);
  if (patch.color !== undefined)
    await db.run('UPDATE workout_group SET color = ? WHERE id = ?', [patch.color, id]);
  if (patch.expanded !== undefined)
    await db.run('UPDATE workout_group SET expanded = ? WHERE id = ?', [
      patch.expanded ? 1 : 0,
      id,
    ]);
}

export async function reorderGroups(db: Db, ids: readonly string[]): Promise<void> {
  for (const [i, id] of ids.entries())
    await db.run('UPDATE workout_group SET sort_order = ? WHERE id = ?', [i, id]);
}

/**
 * VR-11: Default cannot be deleted; a group with templates is deleted only when the user
 * chose to move its templates to Default first (moveToDefault = true).
 */
export async function deleteGroup(db: Db, id: string, moveToDefault: boolean): Promise<void> {
  const [g] = await db.query<{ is_default: number }>(
    'SELECT is_default FROM workout_group WHERE id = ?',
    [id],
  );
  if (!g || g.is_default) throw new Error('The Default group cannot be deleted.');
  const [c] = await db.query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM workout_template WHERE group_id = ?',
    [id],
  );
  if ((c?.n ?? 0) > 0) {
    if (!moveToDefault) throw new Error('Group is not empty.');
    const base = await nextOrder(db, 'workout_template', 'WHERE group_id = ?', [DEFAULT_GROUP_ID]);
    const ts = await db.query<{ id: string }>(
      'SELECT id FROM workout_template WHERE group_id = ? ORDER BY sort_order',
      [id],
    );
    for (const [i, t] of ts.entries()) {
      await db.run('UPDATE workout_template SET group_id = ?, sort_order = ? WHERE id = ?', [
        DEFAULT_GROUP_ID,
        base + i,
        t.id,
      ]);
    }
  }
  await db.run('DELETE FROM workout_group WHERE id = ?', [id]);
}

export async function createTemplate(
  db: Db,
  name: string,
  groupId: string = DEFAULT_GROUP_ID,
): Promise<string> {
  const id = newId();
  await db.run(
    'INSERT INTO workout_template (id, group_id, name, note, sort_order) VALUES (?, ?, ?, ?, ?)',
    [
      id,
      groupId,
      name.trim(),
      '',
      await nextOrder(db, 'workout_template', 'WHERE group_id = ?', [groupId]),
    ],
  );
  return id;
}

export async function updateTemplate(
  db: Db,
  id: string,
  patch: Partial<{ name: string; note: string; groupId: string }>,
): Promise<void> {
  if (patch.name !== undefined)
    await db.run('UPDATE workout_template SET name = ? WHERE id = ?', [patch.name.trim(), id]);
  if (patch.note !== undefined)
    await db.run('UPDATE workout_template SET note = ? WHERE id = ?', [patch.note, id]);
  if (patch.groupId !== undefined) {
    const order = await nextOrder(db, 'workout_template', 'WHERE group_id = ?', [patch.groupId]);
    await db.run('UPDATE workout_template SET group_id = ?, sort_order = ? WHERE id = ?', [
      patch.groupId,
      order,
      id,
    ]);
  }
}

/** PD-5: drag to reorder within / across groups. */
export async function reorderTemplates(
  db: Db,
  groupId: string,
  ids: readonly string[],
): Promise<void> {
  for (const [i, id] of ids.entries()) {
    await db.run('UPDATE workout_template SET group_id = ?, sort_order = ? WHERE id = ?', [
      groupId,
      i,
      id,
    ]);
  }
}

/** VR-12: past logs created from it stay unchanged (template_id is not a foreign key). */
export async function deleteTemplate(db: Db, id: string): Promise<void> {
  await db.run('DELETE FROM workout_template WHERE id = ?', [id]);
}

interface SetDbRow {
  id: string;
  template_item_id: string;
  set_number: number;
  type: SetType;
  reps: number | null;
  weight_kg: number | null;
  time_s: number | null;
  distance_km: number | null;
}

const toSet = (r: SetDbRow): SetRow => ({
  id: r.id,
  setNumber: r.set_number,
  type: r.type,
  reps: r.reps,
  weightKg: r.weight_kg,
  timeS: r.time_s,
  distanceKm: r.distance_km,
});

/** Warm-ups first (PD-9), then working sets in number order. */
export const SET_ORDER = `CASE type WHEN 'warmup' THEN 0 ELSE 1 END, set_number`;

export async function getTemplate(db: Db, id: string): Promise<TemplateDetail | null> {
  const [t] = await db.query<{ id: string; name: string; note: string; group_id: string }>(
    'SELECT id, name, note, group_id FROM workout_template WHERE id = ?',
    [id],
  );
  if (!t) return null;
  const [g] = await db.query<GroupRow>('SELECT * FROM workout_group WHERE id = ?', [t.group_id]);
  const items = await db.query<{
    id: string;
    kind: 'exercise' | 'wod';
    exercise_id: string | null;
    superset_group: string | null;
    wod_title: string | null;
    wod_description: string | null;
    sort_order: number;
  }>('SELECT * FROM template_item WHERE template_id = ? ORDER BY sort_order', [id]);
  const sets = await db.query<SetDbRow>(
    `SELECT s.* FROM template_set s JOIN template_item i ON i.id = s.template_item_id
     WHERE i.template_id = ? ORDER BY s.template_item_id, ${SET_ORDER}`,
    [id],
  );
  const exercises = await getExercises(
    db,
    items.filter((i) => i.exercise_id).map((i) => i.exercise_id!),
  );
  const out: TemplateItem[] = [];
  for (const i of items) {
    if (i.kind === 'wod') {
      out.push({
        id: i.id,
        kind: 'wod',
        sortOrder: i.sort_order,
        supersetGroup: null,
        title: i.wod_title ?? '',
        description: i.wod_description ?? '',
      });
    } else {
      const ex = i.exercise_id ? exercises.get(i.exercise_id) : undefined;
      if (!ex) continue;
      out.push({
        id: i.id,
        kind: 'exercise',
        sortOrder: i.sort_order,
        supersetGroup: i.superset_group,
        exercise: ex,
        sets: sets.filter((s) => s.template_item_id === i.id).map(toSet),
      });
    }
  }
  return { id: t.id, name: t.name, note: t.note, group: toGroup(g!), items: out };
}

const DEFAULT_SETS = 3;

/** WT-4 Add Exercise: appended with three empty working sets. Returns the item id. */
export async function addTemplateExercise(
  db: Db,
  templateId: string,
  exerciseId: string,
  supersetGroup: string | null = null,
): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO template_item (id, template_id, kind, exercise_id, superset_group, sort_order)
     VALUES (?, ?, 'exercise', ?, ?, ?)`,
    [
      id,
      templateId,
      exerciseId,
      supersetGroup,
      await nextOrder(db, 'template_item', 'WHERE template_id = ?', [templateId]),
    ],
  );
  for (let n = 1; n <= DEFAULT_SETS; n++) {
    await db.run(
      `INSERT INTO template_set (id, template_item_id, set_number, type) VALUES (?, ?, ?, 'working')`,
      [newId(), id, n],
    );
  }
  return id;
}

/** WT-4 Add SuperSet (PD-7): two or more exercises sharing a superset group. */
export async function addTemplateSuperset(
  db: Db,
  templateId: string,
  exerciseIds: readonly string[],
): Promise<void> {
  const group = newId();
  for (const ex of exerciseIds) await addTemplateExercise(db, templateId, ex, group);
}

/** WT-4 Add Workout of the Day (PD-8). */
export async function addTemplateWod(
  db: Db,
  templateId: string,
  title: string,
  description: string,
): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO template_item (id, template_id, kind, wod_title, wod_description, sort_order)
     VALUES (?, ?, 'wod', ?, ?, ?)`,
    [
      id,
      templateId,
      title.trim(),
      description,
      await nextOrder(db, 'template_item', 'WHERE template_id = ?', [templateId]),
    ],
  );
  return id;
}

export async function updateTemplateWod(
  db: Db,
  itemId: string,
  patch: { title?: string; description?: string },
) {
  if (patch.title !== undefined)
    await db.run('UPDATE template_item SET wod_title = ? WHERE id = ?', [patch.title, itemId]);
  if (patch.description !== undefined)
    await db.run('UPDATE template_item SET wod_description = ? WHERE id = ?', [
      patch.description,
      itemId,
    ]);
}

export async function removeTemplateItem(db: Db, itemId: string): Promise<void> {
  const [it] = await db.query<{ superset_group: string | null }>(
    'SELECT superset_group FROM template_item WHERE id = ?',
    [itemId],
  );
  await db.run('DELETE FROM template_item WHERE id = ?', [itemId]);
  if (it?.superset_group) await dissolveSmallSuperset(db, 'template_item', it.superset_group);
}

/** A superset needs two or more exercises (PD-6/PD-7); a lone survivor becomes a normal exercise. */
export async function dissolveSmallSuperset(
  db: Db,
  table: 'template_item' | 'logged_exercise',
  group: string,
) {
  const [c] = await db.query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE superset_group = ?`,
    [group],
  );
  if ((c?.n ?? 0) < 2)
    await db.run(`UPDATE ${table} SET superset_group = NULL WHERE superset_group = ?`, [group]);
}

export async function reorderTemplateItems(db: Db, ids: readonly string[]): Promise<void> {
  for (const [i, id] of ids.entries())
    await db.run('UPDATE template_item SET sort_order = ? WHERE id = ?', [i, id]);
}

/** PD-6: select two or more exercises and Group to form a superset (kept together in order). */
export async function groupTemplateItems(
  db: Db,
  templateId: string,
  itemIds: readonly string[],
): Promise<void> {
  if (itemIds.length < 2) return;
  const group = newId();
  const old = await db.query<{ superset_group: string | null }>(
    `SELECT DISTINCT superset_group FROM template_item WHERE id IN (${itemIds.map(() => '?').join(',')})`,
    [...itemIds],
  );
  for (const id of itemIds)
    await db.run('UPDATE template_item SET superset_group = ? WHERE id = ?', [group, id]);
  for (const o of old)
    if (o.superset_group) await dissolveSmallSuperset(db, 'template_item', o.superset_group);
  // move grouped items next to the first one
  const all = await db.query<{ id: string }>(
    'SELECT id FROM template_item WHERE template_id = ? ORDER BY sort_order',
    [templateId],
  );
  const order = all.map((r) => r.id);
  const firstIdx = order.findIndex((id) => itemIds.includes(id));
  const rest = order.filter((id) => !itemIds.includes(id));
  const grouped = order.filter((id) => itemIds.includes(id));
  const before = order.slice(0, firstIdx).filter((id) => !itemIds.includes(id));
  const next = [...before, ...grouped, ...rest.slice(before.length)];
  await reorderTemplateItems(db, next);
}

export async function ungroupTemplateItem(db: Db, itemId: string): Promise<void> {
  const [it] = await db.query<{ superset_group: string | null }>(
    'SELECT superset_group FROM template_item WHERE id = ?',
    [itemId],
  );
  await db.run('UPDATE template_item SET superset_group = NULL WHERE id = ?', [itemId]);
  if (it?.superset_group) await dissolveSmallSuperset(db, 'template_item', it.superset_group);
}

// ---- template sets (WT-5) ----

async function renumber(
  db: Db,
  table: 'template_set' | 'log_set',
  parentCol: string,
  parentId: string,
) {
  for (const type of ['warmup', 'working'] as const) {
    const rows = await db.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE ${parentCol} = ? AND type = ? ORDER BY set_number`,
      [parentId, type],
    );
    for (const [i, r] of rows.entries())
      await db.run(`UPDATE ${table} SET set_number = ? WHERE id = ?`, [i + 1, r.id]);
  }
}
export { renumber as renumberSets };

/** Adds a set numbered next in sequence, copying the previous set of that type (AC-10). */
export async function addTemplateSet(db: Db, itemId: string, type: SetType): Promise<void> {
  const [last] = await db.query<SetDbRow>(
    'SELECT * FROM template_set WHERE template_item_id = ? AND type = ? ORDER BY set_number DESC LIMIT 1',
    [itemId, type],
  );
  await db.run(
    `INSERT INTO template_set (id, template_item_id, set_number, type, reps, weight_kg, time_s, distance_km)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      itemId,
      (last?.set_number ?? 0) + 1,
      type,
      last?.reps ?? null,
      last?.weight_kg ?? null,
      last?.time_s ?? null,
      last?.distance_km ?? null,
    ],
  );
}

export type SetPatch = Partial<{
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
}>;

const SET_COLS: Record<keyof SetPatch, string> = {
  reps: 'reps',
  weightKg: 'weight_kg',
  timeS: 'time_s',
  distanceKm: 'distance_km',
};

export async function updateTemplateSet(db: Db, setId: string, patch: SetPatch): Promise<void> {
  for (const [k, v] of Object.entries(patch) as [keyof SetPatch, number | null][]) {
    await db.run(`UPDATE template_set SET ${SET_COLS[k]} = ? WHERE id = ?`, [v, setId]);
  }
}

export async function deleteTemplateSet(db: Db, setId: string): Promise<void> {
  const [s] = await db.query<{ template_item_id: string }>(
    'SELECT template_item_id FROM template_set WHERE id = ?',
    [setId],
  );
  await db.run('DELETE FROM template_set WHERE id = ?', [setId]);
  if (s) await renumber(db, 'template_set', 'template_item_id', s.template_item_id);
}

export async function templateNames(db: Db): Promise<{ id: string; name: string }[]> {
  return db.query('SELECT id, name FROM workout_template ORDER BY name COLLATE NOCASE');
}
