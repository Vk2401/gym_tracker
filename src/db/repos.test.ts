import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './testing/sqljsDb';
import { migrate } from './migrate';
import { MIGRATIONS } from './migrations';
import { seed, DEFAULT_GROUP_ID } from '@/seed/seed';
import type { Db } from './types';
import * as lib from './repos/library';
import * as wo from './repos/workouts';
import * as logs from './repos/logs';
import * as stats from './repos/stats';
import * as data from './repos/data';
import * as importer from './repos/importer';
import type { ImportLog } from '@/domain/importData';
import { newRecordsInLog } from '@/domain/records';
import { formatDateShort } from '@/domain/format';
import { localToUtc } from '@/domain/time';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await migrate(db);
  await seed(db);
});

const stamp = (date: string, time: string) => ({ utc: localToUtc(date, time, 0), offsetMin: 0 });

async function finishedLog(
  templateId: string | null,
  date: string,
  exerciseId = 'ex-bench-press',
  reps = 5,
  kg = 100,
) {
  const id = await logs.startSession(
    db,
    templateId ? { kind: 'template', templateId } : { kind: 'quick' },
    stamp(date, '10:30'),
  );
  if (!templateId) await logs.addLoggedExercise(db, id, exerciseId);
  const log = await logs.getLog(db, id);
  for (const e of log!.exercises) {
    for (const s of e.sets) {
      await logs.updateLogSet(db, s.id, { reps, weightKg: kg });
      await logs.setLogSetCompleted(db, s.id, true);
    }
  }
  await logs.finishSession(db, id, new Date(localToUtc(date, '11:30', 0)));
  return id;
}

describe('library (EX, ED, VR-9, VR-10, ST-4)', () => {
  it('lists the library with focus, equipment and categories (AC-4)', async () => {
    const all = await lib.listExercises(db);
    expect(all.slice(0, 3).map((e) => e.name)).toEqual([
      '3/4 Sit-Up',
      '90/90 Hamstring',
      'Ab Crunch Machine',
    ]);
    expect(all[2]).toMatchObject({
      primary: 'reps',
      secondary: 'weight',
      equipmentName: 'Machine',
    });
    expect(all[0]!.categories.map((c) => c.name)).toEqual(['Abdominals (Lower)']);
  });

  it('creates and edits a custom exercise (EX-5, ED-6)', async () => {
    const id = await lib.createExercise(db, '  Sled Push ');
    await lib.updateExercise(db, id, {
      primary: 'time',
      secondary: 'distance',
      equipmentId: 'eq-machine',
      note: 'Push',
    });
    await lib.addExerciseCategory(db, id, 'cat-quads');
    const e = await lib.getExercise(db, id);
    expect(e).toMatchObject({
      name: 'Sled Push',
      primary: 'time',
      secondary: 'distance',
      equipmentName: 'Machine',
      isCustom: true,
    });
    expect(e!.categories.map((c) => c.id)).toEqual(['cat-quads']);
    await lib.removeExerciseCategory(db, id, 'cat-quads');
    expect((await lib.getExercise(db, id))!.categories).toEqual([]);
    expect(await lib.exerciseNames(db)).toContain('Sled Push');
  });

  it('AC-20 / VR-9: deleting an exercise keeps past logs', async () => {
    const logId = await finishedLog(null, '2026-09-10');
    const t = await wo.createTemplate(db, 'Push');
    await wo.addTemplateExercise(db, t, 'ex-bench-press');
    await lib.deleteExercise(db, 'ex-bench-press');
    expect((await lib.listExercises(db)).some((e) => e.id === 'ex-bench-press')).toBe(false);
    expect((await wo.getTemplate(db, t))!.items).toHaveLength(0);
    const log = await logs.getLog(db, logId);
    expect(log!.exercises[0]).toMatchObject({ name: 'Bench Press' });
    expect(log!.exercises[0]!.sets[0]).toMatchObject({ reps: 5, weightKg: 100, completed: true });
  });

  it('VR-10: deleting a category updates calendar dots', async () => {
    await finishedLog(null, '2026-09-10');
    let cal = await logs.calendarMonth(db, '2026-09-01', '2026-09-30');
    expect(cal.get('2026-09-10')!.map((c) => c.name)).toEqual(['Chest', 'Front Delts', 'Triceps']);
    await lib.deleteCategory(db, 'cat-chest');
    cal = await logs.calendarMonth(db, '2026-09-01', '2026-09-30');
    expect(cal.get('2026-09-10')!.map((c) => c.name)).toEqual(['Front Delts', 'Triceps']);
    // seed does not resurrect deleted library items
    await seed(db);
    expect((await lib.listCategories(db)).some((c) => c.id === 'cat-chest')).toBe(false);
  });

  it('equipment management falls back to None', async () => {
    const id = await lib.createEquipment(db, 'Landmine');
    const ex = await lib.createExercise(db, 'Landmine Press');
    await lib.updateExercise(db, ex, { equipmentId: id });
    await lib.renameEquipment(db, id, 'Landmine Attachment');
    expect((await lib.getExercise(db, ex))!.equipmentName).toBe('Landmine Attachment');
    await lib.deleteEquipment(db, id);
    expect((await lib.getExercise(db, ex))!.equipmentName).toBe('None');
    await lib.deleteEquipment(db, 'eq-none');
    expect((await lib.listEquipment(db))[0]!.name).toBe('None');
  });

  it('categories CRUD', async () => {
    const id = await lib.createCategory(db, 'Neck', '#000000');
    await lib.updateCategory(db, id, { name: 'Neck Flexors', color: '#ffffff' });
    expect((await lib.listCategories(db)).find((c) => c.id === id)).toEqual({
      id,
      name: 'Neck Flexors',
      color: '#ffffff',
    });
  });
});

describe('workouts (WO, WT, BR-2, BR-3, VR-11, VR-12)', () => {
  it('AC-1: Next Workout totals exclude warm-ups', async () => {
    const t = await wo.createTemplate(db, 'Chest');
    const item = await wo.addTemplateExercise(db, t, 'ex-bench-press');
    const tpl = await wo.getTemplate(db, t);
    for (const s of (tpl!.items[0] as { sets: { id: string }[] }).sets)
      await wo.updateTemplateSet(db, s.id, { reps: 10, weightKg: 60 });
    await wo.addTemplateSet(db, item, 'warmup');
    await wo.addTemplateSet(db, item, 'working');
    await wo.addTemplateExercise(db, t, 'ex-cable-fly');
    const [row] = (await wo.listTemplates(db)).filter((x) => x.id === t);
    expect(row).toMatchObject({ exercises: 2, sets: 7, reps: 40 });
  });

  it('AC-11 / BR-2: Last Completed is the latest finished log from the template', async () => {
    const t = await wo.createTemplate(db, 'Thursday - Shoulder Lead');
    await wo.addTemplateExercise(db, t, 'ex-overhead-press');
    await finishedLog(t, '2026-09-06');
    await finishedLog(t, '2026-09-13');
    const [row] = (await wo.listTemplates(db)).filter((x) => x.id === t);
    expect(formatDateShort(row!.lastCompletedUtc!, row!.lastCompletedOffsetMin!)).toBe('13/09/26');
  });

  it('groups: create, reorder, VR-11 delete rules', async () => {
    const g = await wo.createGroup(db, 'Push Pull');
    const t = await wo.createTemplate(db, 'Push', g);
    await expect(wo.deleteGroup(db, DEFAULT_GROUP_ID, true)).rejects.toThrow();
    await expect(wo.deleteGroup(db, g, false)).rejects.toThrow(/not empty/);
    await wo.reorderGroups(db, [g, DEFAULT_GROUP_ID]);
    expect((await wo.listGroups(db))[0]!.id).toBe(g);
    await wo.updateGroup(db, g, { expanded: false, name: 'PPL', color: '#ff0000' });
    expect((await wo.listGroups(db))[0]).toMatchObject({ name: 'PPL', expanded: false });
    await wo.deleteGroup(db, g, true);
    const tpl = (await wo.listTemplates(db)).find((x) => x.id === t);
    expect(tpl!.groupId).toBe(DEFAULT_GROUP_ID);
  });

  it('VR-12: deleting a template keeps its logs', async () => {
    const t = await wo.createTemplate(db, 'Legs');
    await wo.addTemplateExercise(db, t, 'ex-back-squat');
    const logId = await finishedLog(t, '2026-09-10');
    await wo.deleteTemplate(db, t);
    expect((await logs.getLog(db, logId))!.exercises).toHaveLength(1);
  });

  it('supersets, WOD, reorder and set editing (WT-4, WT-7, PD-6..8)', async () => {
    const t = await wo.createTemplate(db, 'Mixed');
    await wo.addTemplateSuperset(db, t, ['ex-db-curl', 'ex-triceps-pushdown']);
    const wod = await wo.addTemplateWod(db, t, 'Finisher', '5 rounds');
    const solo = await wo.addTemplateExercise(db, t, 'ex-plank');
    let tpl = (await wo.getTemplate(db, t))!;
    expect(tpl.items.map((i) => i.kind)).toEqual(['exercise', 'exercise', 'wod', 'exercise']);
    expect(tpl.items[0]!.supersetGroup).toBe(tpl.items[1]!.supersetGroup);
    await wo.updateTemplateWod(db, wod, { title: 'Burner' });
    // PD-6: group solo with first curl
    await wo.groupTemplateItems(db, t, [tpl.items[0]!.id, solo]);
    tpl = (await wo.getTemplate(db, t))!;
    expect(tpl.items[0]!.supersetGroup).toBe(tpl.items[1]!.supersetGroup);
    expect(tpl.items[1]!.id).toBe(solo);
    expect(tpl.items[2]!.supersetGroup).toBeNull(); // pushdown left alone → dissolved
    await wo.ungroupTemplateItem(db, solo);
    tpl = (await wo.getTemplate(db, t))!;
    expect(tpl.items.every((i) => i.supersetGroup === null)).toBe(true);
    const ex = tpl.items[0] as Extract<(typeof tpl.items)[number], { kind: 'exercise' }>;
    await wo.deleteTemplateSet(db, ex.sets[0]!.id);
    expect(
      ((await wo.getTemplate(db, t))!.items[0] as typeof ex).sets.map((s) => s.setNumber),
    ).toEqual([1, 2]);
    await wo.removeTemplateItem(db, ex.id);
    await wo.reorderTemplateItems(
      db,
      [...(await wo.getTemplate(db, t))!.items.map((i) => i.id)].reverse(),
    );
    expect((await wo.getTemplate(db, t))!.items.at(-1)!.kind).toBe('exercise');
    await wo.updateTemplate(db, t, { name: 'Renamed', note: 'n' });
    expect((await wo.getTemplate(db, t))!.name).toBe('Renamed');
    expect((await wo.templateNames(db)).map((x) => x.name)).toContain('Renamed');
  });
});

describe('logs and sessions (PD-1..4, WL, SS-4, VR-5..8)', () => {
  it('PD-1: starting a template pre-fills sets and becomes the active session', async () => {
    const t = await wo.createTemplate(db, 'Chest');
    const item = await wo.addTemplateExercise(db, t, 'ex-bench-press');
    await wo.addTemplateSet(db, item, 'warmup');
    await wo.addTemplateWod(db, t, 'Finisher', 'desc');
    const tpl = await wo.getTemplate(db, t);
    const first = (tpl!.items[0] as { sets: { id: string; type: string }[] }).sets.find(
      (s) => s.type === 'working',
    )!;
    await wo.updateTemplateSet(db, first.id, { reps: 8, weightKg: 80 });
    const logId = await logs.startSession(db, { kind: 'template', templateId: t });
    expect(await logs.getActiveSession(db)).toEqual({ logId, restEndUtc: null });
    const log = (await logs.getLog(db, logId))!;
    expect(log.name).toBe('Chest');
    expect(log.exercises[0]!.sets.map((s) => s.type)).toEqual([
      'warmup',
      'working',
      'working',
      'working',
    ]);
    expect(log.exercises[0]!.sets[1]).toMatchObject({ reps: 8, weightKg: 80, completed: false });
    expect(log.exercises[1]).toMatchObject({ kind: 'wod', wodTitle: 'Finisher' });
  });

  it('AC-10: + Add Set copies the previous set and numbers it next', async () => {
    const logId = await logs.startSession(db, { kind: 'quick' });
    const le = await logs.addLoggedExercise(db, logId, 'ex-cable-crunch');
    const [s1] = (await logs.getLog(db, logId))!.exercises[0]!.sets;
    await logs.updateLogSet(db, s1!.id, { reps: 15, weightKg: 65, rpe: 8 });
    await logs.addLogSet(db, le, 'working');
    await logs.addLogSet(db, le, 'warmup');
    const sets = (await logs.getLog(db, logId))!.exercises[0]!.sets;
    expect(sets.map((s) => [s.type, s.setNumber, s.reps, s.weightKg, s.rpe])).toEqual([
      ['warmup', 1, 15, 65, null],
      ['working', 1, 15, 65, 8],
      ['working', 2, 15, 65, null],
    ]);
    await logs.deleteLogSet(db, sets[1]!.id);
    expect((await logs.getLog(db, logId))!.exercises[0]!.sets.at(-1)!.setNumber).toBe(1);
  });

  it('VR-5 / VR-6 / SS-4: finish flows', async () => {
    const logId = await logs.startSession(db, { kind: 'quick' });
    const le = await logs.addLoggedExercise(db, logId, 'ex-push-up');
    await logs.addLogSet(db, le, 'working');
    let log = (await logs.getLog(db, logId))!;
    await logs.setLogSetCompleted(db, log.exercises[0]!.sets[0]!.id, true);
    await logs.discardOpenSets(db, logId);
    log = (await logs.getLog(db, logId))!;
    expect(log.exercises[0]!.sets).toHaveLength(1);
    await logs.finishSession(db, logId);
    expect(await logs.getActiveSession(db)).toBeNull();
    expect((await logs.getLog(db, logId))!.endUtc).not.toBeNull();
    expect((await data.backupState(db)).sessionsSinceBackup).toBe(1);

    const other = await logs.startSession(db, { kind: 'empty' });
    const le2 = await logs.addLoggedExercise(db, other, 'ex-plank');
    await logs.completeAllSets(db, other);
    expect((await logs.getLog(db, other))!.exercises[0]!.sets[0]!.completed).toBe(true);
    expect((await logs.getLog(db, other))!.name).toBe('Workout');
    await logs.removeLoggedExercise(db, le2);
    await logs.deleteLog(db, other);
    expect(await logs.getLog(db, other)).toBeNull();
    expect(await logs.getActiveSession(db)).toBeNull();
  });

  it('AC-7: day list shows duration inputs and exercise counts, newest first (VR-13)', async () => {
    const a = await finishedLog(null, '2026-09-10');
    const b = await logs.startSession(db, { kind: 'quick' }, stamp('2026-09-10', '18:00'));
    const cards = await logs.logsOnDate(db, '2026-09-10');
    expect(cards.map((c) => c.id)).toEqual([b, a]);
    expect(cards[1]).toMatchObject({ exercises: 1 });
  });

  it('edits times, body weight, measurements, notes, rest and WOD result', async () => {
    const id = await logs.startSession(db, { kind: 'quick' }, stamp('2026-09-10', '10:00'));
    await logs.updateLog(db, id, {
      name: 'Morning',
      start: stamp('2026-09-11', '09:00'),
      end: stamp('2026-09-11', '10:00'),
      bodyWeightKg: 79,
      restTimeS: 120,
    });
    await logs.setMeasurement(db, id, 'waist', 80, 'cm');
    await logs.setMeasurement(db, id, 'chest', 100, 'cm');
    await logs.setMeasurement(db, id, 'chest', null, 'cm');
    const le = await logs.addLoggedExercise(db, id, 'ex-bench-press');
    await logs.updateLoggedExercise(db, le, { sessionNote: 'felt good', wodResultS: 30 });
    await logs.replaceLoggedExercise(db, le, 'ex-incline-db-press');
    await logs.reorderLoggedExercises(db, [le]);
    await logs.setRestEnd(db, '2026-09-11T09:01:30.000Z');
    const log = (await logs.getLog(db, id))!;
    expect(log).toMatchObject({
      name: 'Morning',
      startDateKey: '2026-09-11',
      bodyWeightKg: 79,
      restTimeS: 120,
      measurements: { waist: 80 },
    });
    expect(log.exercises[0]).toMatchObject({
      name: 'Incline Dumbbell Press',
      sessionNote: 'felt good',
      equipment: 'Dumbbell',
    });
    expect((await logs.getActiveSession(db))!.restEndUtc).toBe('2026-09-11T09:01:30.000Z');
  });

  it('PD-4 Update Template and PD-11 Save as Template', async () => {
    const t = await wo.createTemplate(db, 'Chest');
    await wo.addTemplateExercise(db, t, 'ex-bench-press');
    const logId = await finishedLog(t, '2026-09-10', 'ex-bench-press', 6, 102.5);
    await logs.updateTemplateFromLog(db, logId);
    const tpl = (await wo.getTemplate(db, t))!;
    expect(
      (tpl.items[0] as { sets: { reps: number | null; weightKg: number | null }[] }).sets[0],
    ).toMatchObject({ reps: 6, weightKg: 102.5 });
    const copy = await logs.saveLogAsTemplate(db, logId, 'Chest copy', DEFAULT_GROUP_ID);
    expect((await wo.getTemplate(db, copy))!.items).toHaveLength(1);
  });

  it('PD-10 View History', async () => {
    await finishedLog(null, '2026-09-10');
    await finishedLog(null, '2026-09-12', 'ex-bench-press', 3, 110);
    const h = await logs.exerciseHistory(db, 'ex-bench-press');
    expect(h.map((x) => x.sets[0]!.weightKg)).toEqual([110, 100]);
  });
});

describe('stats, records and data (XP, ST-6, VR-17)', () => {
  it('AC-14 / AC-13: records and volume from the database', async () => {
    await finishedLog(null, '2026-09-10', 'ex-bench-press', 5, 100);
    const newer = await finishedLog(null, '2026-10-01', 'ex-bench-press', 5, 102.5);
    const sets = await stats.recordSets(db);
    expect(
      newRecordsInLog(sets, newer)
        .map((r) => r.recordType)
        .sort(),
    ).toEqual(['est1rm', 'maxRepsAtWeight', 'maxWeight']);
    const ws = await stats.workingSetsSince(db, '2026-09-15');
    expect(ws).toHaveLength(1);
    expect((await stats.workingSetsSince(db, null, 'ex-bench-press')).length).toBe(2);
    expect((await stats.logsSince(db, null)).map((l) => l.dateKey)).toEqual([
      '2026-09-10',
      '2026-10-01',
    ]);
    const cats = await stats.setsPerCategory(db, null);
    expect(cats.find((c) => c.name === 'Chest')!.sets).toBe(2);
  });

  it('body data', async () => {
    const id = await finishedLog(null, '2026-09-10');
    await logs.updateLog(db, id, { bodyWeightKg: 80 });
    await logs.setMeasurement(db, id, 'waist', 82, 'cm');
    expect(await stats.bodySince(db, null)).toEqual([
      { logId: id, dateKey: '2026-09-10', bodyWeightKg: 80, measurements: { waist: 82 } },
    ]);
  });

  it('AC-19: CSV rows contain every set of every log', async () => {
    for (let i = 1; i <= 5; i++) await finishedLog(null, `2026-09-1${i}`);
    const rows = await stats.csvRows(db);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      exercise: 'Bench Press',
      startTime: '10:30',
      endTime: '11:30',
      completed: true,
    });
  });

  it('VR-17: backup → delete all → restore', async () => {
    const id = await finishedLog(null, '2026-09-10');
    await lib.deleteCategory(db, 'cat-chest');
    const b = await data.exportBackup(db);
    const text = JSON.stringify(b);
    await data.deleteAllData(db);
    expect(await logs.getLog(db, id)).toBeNull();
    expect((await lib.listCategories(db)).some((c) => c.id === 'cat-chest')).toBe(true); // re-seeded
    const parsed = data.parseBackup(text, MIGRATIONS[MIGRATIONS.length - 1]!.version);
    await data.restoreBackup(db, parsed);
    expect((await logs.getLog(db, id))!.exercises[0]!.sets).toHaveLength(1);
    expect((await lib.listCategories(db)).some((c) => c.id === 'cat-chest')).toBe(false);
    expect(() => data.parseBackup('{"app":"x"}', 2)).toThrow();
    expect(() => data.parseBackup(JSON.stringify({ ...b, schemaVersion: 99 }), 2)).toThrow(/newer/);
    await data.markBackedUp(db);
    expect((await data.backupState(db)).sessionsSinceBackup).toBe(0);
  });
});

describe('exercise tutorial link (ED-7)', () => {
  it('saves, shows on logs that use the exercise, and clears', async () => {
    expect((await lib.getExercise(db, 'ex-bench-press'))!.tutorialUrl).toBe('');
    await lib.updateExercise(db, 'ex-bench-press', { tutorialUrl: 'https://youtu.be/abc' });
    expect((await lib.getExercise(db, 'ex-bench-press'))!.tutorialUrl).toBe('https://youtu.be/abc');
    const id = await finishedLog(null, '2026-09-10');
    expect((await logs.getLog(db, id))!.exercises[0]!.exerciseTutorialUrl).toBe(
      'https://youtu.be/abc',
    );
    await lib.updateExercise(db, 'ex-bench-press', { tutorialUrl: '' });
    expect((await logs.getLog(db, id))!.exercises[0]!.exerciseTutorialUrl).toBeNull();
  });
});

describe('import (PD-19)', () => {
  const sets = (reps: number, kg: number) => ({
    setNumber: 1,
    type: 'working' as const,
    reps,
    weightKg: kg,
    timeS: null,
    distanceKm: null,
    rpe: null,
    completed: true,
  });
  const log = (over: Partial<ImportLog> = {}): ImportLog => ({
    sourceId: null,
    name: 'Push Day',
    date: '2026-09-20',
    startTime: '07:00',
    endTime: '08:00',
    bodyWeightKg: 72.5,
    exercises: [
      { name: 'bench press', equipment: 'Barbell', sets: [sets(8, 60)] },
      {
        name: 'Sled Push',
        equipment: 'Machine',
        sets: [{ ...sets(0, 0), reps: null, weightKg: null, distanceKm: 0.1, timeS: 30 }],
      },
    ],
    ...over,
  });

  it('adds workouts, matches library exercises by name and creates unknown ones', async () => {
    const r = await importer.importLogs(db, [log()], () => 0);
    expect(r).toEqual({ imported: 1, skipped: 0, newExercises: ['Sled Push'] });
    const [card] = await logs.logsOnDate(db, '2026-09-20');
    const l = (await logs.getLog(db, card!.id))!;
    expect(l.bodyWeightKg).toBe(72.5);
    expect(l.exercises.map((e) => [e.exerciseId, e.name])).toEqual([
      ['ex-bench-press', 'Bench Press'],
      [expect.any(String), 'Sled Push'],
    ]);
    expect(l.exercises[0]!.sets[0]).toMatchObject({ reps: 8, weightKg: 60, completed: true });
    const sled = (await lib.getExercise(db, l.exercises[1]!.exerciseId!))!;
    expect([sled.primary, sled.secondary, sled.equipmentName]).toEqual([
      'time',
      'distance',
      'Machine',
    ]);
    // records and stats see imported history
    expect((await stats.recordSets(db)).some((s) => s.logId === l.id)).toBe(true);
  });

  it('never duplicates a workout already in the app', async () => {
    await importer.importLogs(db, [log()], () => 0);
    const again = await importer.importLogs(db, [log(), log({ date: '2026-09-21' })], () => 0);
    expect(again).toMatchObject({ imported: 1, skipped: 1 });
    const own = await finishedLog(null, '2026-09-10');
    const mine = await importer.importLogs(
      db,
      [log({ sourceId: own, date: '2026-09-11' })],
      () => 0,
    );
    expect(mine.skipped).toBe(1);
  });

  it('stores a workout that ran past midnight with the next day as its end', async () => {
    await importer.importLogs(db, [log({ startTime: '23:30', endTime: '00:20' })], () => 0);
    const [card] = await logs.logsOnDate(db, '2026-09-20');
    const l = (await logs.getLog(db, card!.id))!;
    expect(l.endUtc).toBe('2026-09-21T00:20:00.000Z');
  });

  it('checks a backup for required columns before restoring', async () => {
    const b = await data.exportBackup(db);
    expect(await data.checkBackup(db, b)).toBeNull();
    const broken = { ...b, tables: { ...b.tables, exercise: [{ id: 'x' }] } };
    expect(await data.checkBackup(db, broken)).toEqual({
      table: 'exercise',
      row: 1,
      column: 'name',
    });
    expect(() => data.parseBackup('{"app":"gym-tracker","tables":null}', 3)).toThrow();
  });
});
