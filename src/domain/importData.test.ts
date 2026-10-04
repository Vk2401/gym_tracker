import { describe, expect, it } from 'vitest';
import { CSV_HEADER } from './csv';
import {
  autoMatch,
  buildImport,
  guessDateOrder,
  jsonToTable,
  mappingProblems,
  normalizeHeader,
  parseClockCell,
  parseCsv,
  parseDateCell,
  parseValue,
  type ImportSettings,
} from './importData';

const KG = { weightUnit: 'kg', distanceUnit: 'km' } as const;

describe('PD-19 CSV parsing', () => {
  it('handles BOM, quotes, escaped quotes, CRLF and blank lines', () => {
    const t = parseCsv('\uFEFFa,b,c\r\n1,"x, y","say ""hi"""\r\n\r\n2,,"multi\nline"\n');
    expect(t.headers).toEqual(['a', 'b', 'c']);
    expect(t.rows).toEqual([
      ['1', 'x, y', 'say "hi"'],
      ['2', '', 'multi\nline'],
    ]);
  });
  it('detects ; and tab delimiters', () => {
    expect(parseCsv('a;b\n1,5;2').rows).toEqual([['1,5', '2']]);
    expect(parseCsv('a\tb\n1\t2').rows).toEqual([['1', '2']]);
  });
});

describe('PD-19 JSON → table', () => {
  it('reads an array of flat objects, or one under a common key', () => {
    expect(
      jsonToTable([
        { a: 1, b: 'x' },
        { a: 2, c: true },
      ]),
    ).toEqual({
      headers: ['a', 'b', 'c'],
      rows: [
        ['1', 'x', ''],
        ['2', '', 'true'],
      ],
    });
    expect(jsonToTable({ sets: [{ reps: 5 }] })?.rows).toEqual([['5']]);
  });
  it('rejects anything else', () => {
    expect(jsonToTable({ app: 'other' })).toBeNull();
    expect(jsonToTable([])).toBeNull();
    expect(jsonToTable([1, 2])).toBeNull();
    expect(jsonToTable([{ a: { nested: 1 } }])).toBeNull();
    expect(jsonToTable('text')).toBeNull();
  });
});

describe('PD-19 column matching', () => {
  it('normalises headers', () => {
    expect(normalizeHeader(' Weight (lbs) ')).toBe('weight_lbs');
    expect(normalizeHeader('Exercise Name')).toBe('exercise_name');
  });
  it('recognises our own export exactly', () => {
    const { settings, exact } = autoMatch([...CSV_HEADER]);
    expect(exact).toBe(true);
    expect(settings.mapping.time_s).toBe(CSV_HEADER.indexOf('time_s'));
    expect(mappingProblems(settings.mapping)).toEqual([]);
  });
  it('maps another app’s names and detects pounds and miles', () => {
    const { settings, exact } = autoMatch([
      'Date',
      'Workout Name',
      'Exercise Name',
      'Set Order',
      'Weight (lbs)',
      'Reps',
      'Distance (miles)',
      'Notes',
    ]);
    expect(exact).toBe(false);
    expect(settings.mapping).toMatchObject({
      date: 0,
      workout: 1,
      exercise: 2,
      set_number: 3,
      weight_kg: 4,
      reps: 5,
      distance_km: 6,
    });
    expect(settings.weightUnit).toBe('lb');
    expect(settings.distanceUnit).toBe('mi');
  });
  it('reports what is still missing', () => {
    expect(mappingProblems({})).toHaveLength(3);
    expect(mappingProblems({ date: 0, exercise: 1, reps: 1 })).toEqual([
      'Each file column can be used only once.',
    ]);
  });
});

describe('PD-19 cell formats', () => {
  it('dates', () => {
    expect(parseDateCell('2026-10-04', 'dmy')).toEqual({ ok: true, value: { date: '2026-10-04' } });
    expect(parseDateCell('2026-10-04T07:05:00Z', 'dmy')).toEqual({
      ok: true,
      value: { date: '2026-10-04', time: '07:05' },
    });
    expect(parseDateCell('04/10/2026', 'dmy')).toMatchObject({ value: { date: '2026-10-04' } });
    expect(parseDateCell('10/04/2026', 'mdy')).toMatchObject({ value: { date: '2026-10-04' } });
    expect(parseDateCell('4.10.26 6:15 pm', 'dmy')).toMatchObject({
      value: { date: '2026-10-04', time: '18:15' },
    });
    expect(parseDateCell('31/02/2026', 'dmy').ok).toBe(false);
    expect(parseDateCell('yesterday', 'dmy').ok).toBe(false);
  });
  it('guesses day/month order from the data', () => {
    expect(guessDateOrder(['01/02/2026', '25/02/2026'])).toBe('dmy');
    expect(guessDateOrder(['02/25/2026'])).toBe('mdy');
    expect(guessDateOrder(['2026-10-04'])).toBe('dmy');
  });
  it('times of day', () => {
    expect(parseClockCell('7:05')).toEqual({ ok: true, value: '07:05' });
    expect(parseClockCell('12:30 AM')).toEqual({ ok: true, value: '00:30' });
    expect(parseClockCell('1:30 p.m.')).toEqual({ ok: true, value: '13:30' });
    expect(parseClockCell('25:00').ok).toBe(false);
    expect(parseClockCell('13:00 pm').ok).toBe(false);
  });
  it('numbers, units and ranges (VR-2)', () => {
    expect(parseValue('weight', '62,5', 'weight_kg', KG)).toEqual({ ok: true, value: 62.5 });
    expect(parseValue('weight', '135 lbs', 'weight_kg', { ...KG, weightUnit: 'lb' })).toEqual({
      ok: true,
      value: 61.2,
    });
    expect(parseValue('weight', '1200', 'weight_kg', KG).ok).toBe(false);
    expect(parseValue('weight', '10', 'body_weight_kg', KG).ok).toBe(false);
    expect(parseValue('distance', '3.1', 'distance_km', { ...KG, distanceUnit: 'mi' })).toEqual({
      ok: true,
      value: 5,
    });
    expect(parseValue('int', '8', 'reps', KG)).toEqual({ ok: true, value: 8 });
    expect(parseValue('int', '8.5', 'reps', KG).ok).toBe(false);
    expect(parseValue('int', '0', 'set_number', KG).ok).toBe(false);
    expect(parseValue('duration', '90', 'time_s', KG)).toEqual({ ok: true, value: 90 });
    expect(parseValue('duration', '1:02:03', 'time_s', KG)).toEqual({ ok: true, value: 3723 });
    expect(parseValue('duration', 'long', 'time_s', KG).ok).toBe(false);
    expect(parseValue('rpe', '8.5', 'rpe', KG)).toEqual({ ok: true, value: 8.5 });
    expect(parseValue('rpe', '8.3', 'rpe', KG).ok).toBe(false);
    expect(parseValue('distance', 'far', 'distance_km', KG).ok).toBe(false);
    expect(parseValue('rpe', 'hard', 'rpe', KG).ok).toBe(false);
  });
  it('set types and yes/no', () => {
    expect(parseValue('setType', 'Warm-up', 'set_type', KG)).toEqual({ ok: true, value: 'warmup' });
    expect(parseValue('setType', 'Normal', 'set_type', KG)).toEqual({ ok: true, value: 'working' });
    expect(parseValue('setType', 'superset', 'set_type', KG).ok).toBe(false);
    expect(parseValue('bool', 'TRUE', 'completed', KG)).toEqual({ ok: true, value: true });
    expect(parseValue('bool', 'no', 'completed', KG)).toEqual({ ok: true, value: false });
    expect(parseValue('bool', 'maybe', 'completed', KG).ok).toBe(false);
    expect(parseValue('text', ' Barbell ', 'equipment', KG)).toEqual({
      ok: true,
      value: 'Barbell',
    });
  });
});

describe('PD-19 validation and grouping', () => {
  const ours = [
    CSV_HEADER.join(','),
    'L1,Push Day,2026-10-01,07:00,08:05,72.5,1,Bench Press,Barbell,1,working,8,60,,,8,yes',
    'L1,Push Day,2026-10-01,07:00,08:05,72.5,1,Bench Press,Barbell,1,warmup,10,40,,,,yes',
    'L1,Push Day,2026-10-01,07:00,08:05,72.5,2,Dips,None,1,working,12,,,,,no',
    'L2,Run,2026-10-02,23:30,00:20,,1,Treadmill,Machine,1,working,,,1800,5.2,,yes',
  ].join('\n');

  it('rebuilds workouts from our own export', () => {
    const t = parseCsv(ours);
    const { settings } = autoMatch(t.headers);
    const p = buildImport(t, settings, '2026-10-04');
    expect(p.errors).toEqual([]);
    expect(p.setCount).toBe(4);
    expect(p.logs).toHaveLength(2);
    const [push, run] = p.logs;
    expect(push).toMatchObject({
      sourceId: 'L1',
      name: 'Push Day',
      date: '2026-10-01',
      startTime: '07:00',
      endTime: '08:05',
      bodyWeightKg: 72.5,
    });
    expect(push!.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Dips']);
    expect(push!.exercises[0]!.sets.map((s) => [s.type, s.setNumber, s.reps])).toEqual([
      ['warmup', 1, 10],
      ['working', 1, 8],
    ]);
    expect(push!.exercises[1]!.sets[0]!.completed).toBe(false);
    expect(run!.exercises[0]!.sets[0]).toMatchObject({ timeS: 1800, distanceKm: 5.2 });
  });

  it('reports bad cells with row and column, and skips only those rows', () => {
    const t = parseCsv(
      [
        'Date,Exercise,Reps,Weight',
        '04/10/2026,Squat,5,100',
        '31/13/2026,Squat,5,100',
        '05/10/2026,Squat,five,100',
        '01/10/2030,Squat,5,100',
        ',Squat,5,100',
        '02/10/2026,,5,100',
      ].join('\n'),
    );
    const { settings } = autoMatch(t.headers);
    const p = buildImport(t, settings, '2026-10-04');
    expect(p.logs).toHaveLength(1);
    expect(p.logs[0]).toMatchObject({
      name: 'Imported Workout',
      date: '2026-10-04',
      startTime: '12:00',
    });
    expect(p.skippedRows).toBe(5);
    expect(p.errors.map((e) => [e.row, e.column])).toEqual([
      [3, 'Date'],
      [4, 'Date'],
      [4, 'Reps'],
      [5, 'Date'],
      [6, 'Date'],
      [7, 'Exercise'],
    ]);
  });

  it('groups another app’s rows by date + start + name and converts pounds', () => {
    const t = parseCsv(
      [
        'Date,Workout Name,Exercise Name,Set Order,Weight (lbs),Reps',
        '2026-09-30 18:00:00,Legs,Squat,2,225,5',
        '2026-09-30 18:00:00,Legs,Squat,1,135,8',
        '2026-09-30 18:00:00,Legs,Leg Press,1,300,10',
      ].join('\n'),
    );
    const { settings } = autoMatch(t.headers);
    const p = buildImport(t, settings as ImportSettings, '2026-10-04');
    expect(p.logs).toHaveLength(1);
    expect(p.logs[0]!.startTime).toBe('18:00');
    expect(p.logs[0]!.exercises[0]!.sets.map((s) => s.weightKg)).toEqual([61.2, 102.1]);
  });
});
