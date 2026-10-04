import { describe, expect, it } from 'vitest';
import {
  addDaysKey,
  clockAt,
  dateKeyAt,
  formatDateKeyLong,
  localToUtc,
  stampOf,
  todayKey,
} from './time';
import { monthGrid, monthRange, monthTitle, shiftMonth, weekdayHeaders } from './calendar';
import { computeRecords, newRecordsInLog, type RecordSet } from './records';
import { rangeStart, volumePerWeek, weekKey, weekStreak, workoutsPerWeek } from './stats';
import {
  adjustRestEnd,
  finishEndUtc,
  formatCountdown,
  hasCompletedSet,
  openSetCount,
  remainingSeconds,
  REST_OPTIONS_S,
  startsRest,
} from './session';
import { exerciseShareText, logShareText, templateShareText } from './share';
import { csvCell, toCsv } from './csv';
import { measurementRange } from './measurements';
import type { SetValues } from './types';

const set = (p: Partial<SetValues>): SetValues => ({
  type: 'working',
  reps: null,
  weightKg: null,
  timeS: null,
  distanceKm: null,
  ...p,
});

describe('time (VR-14, VR-15)', () => {
  it('local ↔ UTC in a fixed offset', () => {
    const utc = localToUtc('2026-09-13', '10:30', 330);
    expect(utc).toBe('2026-09-13T05:00:00.000Z');
    expect(dateKeyAt(utc, 330)).toBe('2026-09-13');
    expect(clockAt(utc, 330)).toBe('10:30');
    expect(localToUtc('2026-09-13', '00:00:30', -60)).toBe('2026-09-13T01:00:30.000Z');
  });
  it('helpers', () => {
    expect(addDaysKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(formatDateKeyLong('2026-09-05')).toBe('05 Sep 2026');
    const d = new Date('2026-10-04T12:00:00Z');
    expect(stampOf(d).utc).toBe('2026-10-04T12:00:00.000Z');
    expect(todayKey(d)).toMatch(/^2026-10-0[45]$/);
  });
});

describe('calendar (LG-2, ST-2)', () => {
  it('September 2026 starts on a Tuesday', () => {
    const sun = monthGrid(2026, 9, 'sun');
    expect(sun[0]).toEqual([
      null,
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
    const mon = monthGrid(2026, 9, 'mon');
    expect(mon[0]![1]).toBe('2026-09-01');
    expect(sun.flat().filter(Boolean)).toHaveLength(30);
    expect(sun.every((w) => w.length === 7)).toBe(true);
  });
  it('headers and navigation', () => {
    expect(weekdayHeaders('sun')[0]).toBe('Sun');
    expect(weekdayHeaders('mon')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(monthTitle(2026, 9)).toBe('September 2026');
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthRange(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

const rs = (p: Partial<RecordSet>): RecordSet => ({
  setId: Math.random().toString(),
  exerciseId: 'bench',
  logId: 'l1',
  achievedUtc: '2026-09-01T10:00:00Z',
  type: 'working',
  completed: true,
  reps: null,
  weightKg: null,
  timeS: null,
  distanceKm: null,
  ...p,
});

describe('records (XP-6, AC-14)', () => {
  it('computes best values and ignores warm-ups / open sets', () => {
    const recs = computeRecords([
      rs({ reps: 5, weightKg: 100 }),
      rs({ reps: 8, weightKg: 90 }),
      rs({ reps: 3, weightKg: 110, type: 'warmup' }),
      rs({ reps: 3, weightKg: 120, completed: false }),
      rs({ exerciseId: 'rope', timeS: 300, distanceKm: 1.2 }),
    ]);
    const get = (e: string, t: string) =>
      recs.find((r) => r.exerciseId === e && r.recordType === t);
    expect(get('bench', 'maxWeight')?.value).toBe(100);
    expect(get('bench', 'maxRepsAtWeight')).toMatchObject({ value: 5, weightKg: 100 });
    expect(get('bench', 'est1rm')?.value).toBeCloseTo(116.67, 2);
    expect(get('rope', 'maxTime')?.value).toBe(300);
    expect(get('rope', 'maxDistance')?.value).toBe(1.2);
  });
  it('AC-14: 102.5 kg × 5 beats a previous best of 100 kg × 5', () => {
    const all = [
      rs({ reps: 5, weightKg: 100, logId: 'old', achievedUtc: '2026-09-01T10:00:00Z' }),
      rs({ reps: 5, weightKg: 102.5, logId: 'new', achievedUtc: '2026-10-04T10:00:00Z' }),
    ];
    const types = newRecordsInLog(all, 'new')
      .map((r) => r.recordType)
      .sort();
    expect(types).toEqual(['est1rm', 'maxRepsAtWeight', 'maxWeight']);
    expect(newRecordsInLog(all, 'old')).toEqual([]);
  });
  it('first log sets first records; equal values are not new', () => {
    expect(newRecordsInLog([rs({ reps: 5, weightKg: 50, logId: 'a' })], 'a').length).toBe(3);
    const tie = [
      rs({ reps: 5, weightKg: 50, logId: 'a', achievedUtc: '2026-09-01T00:00:00Z' }),
      rs({ reps: 5, weightKg: 50, logId: 'b', achievedUtc: '2026-09-02T00:00:00Z' }),
    ];
    expect(newRecordsInLog(tie, 'b')).toEqual([]);
  });
});

describe('stats (XP-1..3)', () => {
  it('range start', () => {
    expect(rangeStart('4w', '2026-10-04')).toBe('2026-09-07');
    expect(rangeStart('3m', '2026-10-04')).toBe('2026-07-05');
    expect(rangeStart('1y', '2026-10-04')).toBe('2025-10-05');
    expect(rangeStart('all', '2026-10-04')).toBeNull();
    expect(rangeStart('6m', '2026-10-04')).toBe('2026-04-05');
  });
  it('week keys and counts', () => {
    expect(weekKey('2026-10-04', 'sun')).toBe('2026-10-04');
    expect(weekKey('2026-10-04', 'mon')).toBe('2026-09-28');
    const w = workoutsPerWeek(
      ['2026-09-28', '2026-09-30', '2026-10-04'],
      '2026-09-20',
      '2026-10-04',
      'sun',
    );
    expect(w).toEqual([
      { week: '2026-09-20', count: 0 },
      { week: '2026-09-27', count: 2 },
      { week: '2026-10-04', count: 1 },
    ]);
  });
  it('streak counts consecutive weeks, current week optional', () => {
    expect(weekStreak(['2026-09-22', '2026-09-29'], '2026-10-04', 'mon')).toBe(2);
    expect(weekStreak(['2026-09-22', '2026-09-29', '2026-10-04'], '2026-10-04', 'sun')).toBe(3);
    expect(weekStreak(['2026-09-15'], '2026-10-04', 'mon')).toBe(0);
  });
  it('AC-13: weekly volume', () => {
    const sets = [
      ...Array.from({ length: 3 }, () => ({ dateKey: '2026-09-29', reps: 15, weightKg: 65 })),
      ...Array.from({ length: 3 }, () => ({ dateKey: '2026-10-01', reps: 10, weightKg: 40 })),
    ];
    expect(volumePerWeek(sets, '2026-09-28', '2026-10-04', 'mon')).toEqual([
      { week: '2026-09-28', volume: 4125 },
    ]);
  });
});

describe('session (VR-5, VR-6, SS-1, PD-7)', () => {
  it('open / completed sets', () => {
    expect(openSetCount([{ completed: true }, { completed: false }, {}])).toBe(2);
    expect(hasCompletedSet([{ completed: false }])).toBe(false);
    expect(hasCompletedSet([{ completed: true }])).toBe(true);
  });
  it('finish end time', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    expect(finishEndUtc('2026-10-04T10:00:00Z', now)).toBe(now.toISOString());
    expect(finishEndUtc('2026-10-01T10:00:00Z', now)).toBe('2026-10-01T11:00:00.000Z');
  });
  it('rest timer', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    expect(adjustRestEnd('2026-10-04T12:01:00Z', 15, now)).toBe('2026-10-04T12:01:15.000Z');
    expect(adjustRestEnd('2026-10-04T12:00:10Z', -15, now)).toBe(now.toISOString());
    expect(remainingSeconds('2026-10-04T12:01:30Z', now.getTime())).toBe(90);
    expect(remainingSeconds('2026-10-04T11:00:00Z', now.getTime())).toBe(0);
    expect(formatCountdown(90)).toBe('1:30');
    expect(formatCountdown(5)).toBe('0:05');
    expect(REST_OPTIONS_S[0]).toBe(0);
    expect(REST_OPTIONS_S.at(-1)).toBe(600);
    expect(startsRest('a', [])).toBe(true);
    expect(startsRest('a', ['a', 'b'])).toBe(false);
    expect(startsRest('b', ['a', 'b'])).toBe(true);
  });
});

describe('share (PD-13)', () => {
  const u = { weight: 'kg', distance: 'km' } as const;
  it('template text', () => {
    const t = templateShareText(
      {
        name: 'Thursday - Shoulder Lead',
        note: 'Go heavy',
        blocks: [
          {
            kind: 'exercise',
            name: 'Cable Crunch',
            equipment: 'Cable',
            primary: 'reps',
            secondary: 'weight',
            supersetLabel: 'Superset 1',
            sets: [
              set({ type: 'warmup', reps: 20, weightKg: 20 }),
              set({ reps: 15, weightKg: 65, rpe: 8 }),
            ],
          },
          { kind: 'wod', title: 'Finisher', description: '5 rounds', resultS: 600 },
        ],
      },
      u,
    );
    expect(t).toBe(
      [
        'Thursday - Shoulder Lead',
        'Go heavy',
        '',
        'CABLE CRUNCH (Cable) [Superset 1]',
        'W. 20 reps × 20.0 kg',
        '1. 15 reps × 65.0 kg  RPE 8',
        '',
        'Workout of the Day: Finisher',
        '5 rounds',
        'Result: 00:10:00',
      ].join('\n'),
    );
  });
  it('log text keeps completed sets only', () => {
    const t = logShareText(
      {
        name: 'Quick Workout',
        dateLabel: '13 Sep 2026',
        startUtc: '2026-09-13T10:30:00Z',
        endUtc: '2026-09-13T13:34:50Z',
        bodyWeightKg: 79,
        blocks: [
          {
            kind: 'exercise',
            name: 'Rope Jumping',
            equipment: null,
            primary: 'time',
            secondary: 'distance',
            supersetLabel: null,
            note: 'easy',
            sets: [
              set({ timeS: 300, distanceKm: 1, completed: true }),
              set({ timeS: 60, completed: false }),
            ],
          },
        ],
      },
      { weight: 'lb', distance: 'mi' },
    );
    expect(t).toContain('Completed in 3 hours 4 minutes');
    expect(t).toContain('Body weight: 174.2 lb');
    expect(t).toContain('1. 00:05:00 × 0.6 mi');
    expect(t).not.toContain('00:01:00');
    expect(t).toContain('Note: easy');
  });
  it('exercise text', () => {
    expect(
      exerciseShareText({
        name: '3/4 Sit-Up',
        primary: 'reps',
        secondary: 'weight',
        equipment: null,
        categories: ['Abdominals (Lower)'],
        note: '1. Lie down',
      }),
    ).toBe(
      '3/4 Sit-Up\nFocus: Reps, Weight\nEquipment: None\nCategories: Abdominals (Lower)\n\n1. Lie down',
    );
  });
});

describe('csv (ST-6)', () => {
  it('escapes and neutralises formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(null)).toBe('');
    expect(csvCell(true)).toBe('yes');
    expect(csvCell(-5)).toBe('-5');
  });
  it('one row per set', () => {
    const csv = toCsv([
      {
        logId: 'l',
        workout: 'W',
        date: '2026-09-13',
        startTime: '10:30',
        endTime: '13:35',
        bodyWeightKg: 79,
        exerciseOrder: 1,
        exercise: 'Bench Press',
        equipment: 'Barbell',
        setNumber: 1,
        setType: 'working',
        reps: 5,
        weightKg: 100,
        timeS: null,
        distanceKm: null,
        rpe: null,
        completed: true,
      },
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      'l,W,2026-09-13,10:30,13:35,79,1,Bench Press,Barbell,1,working,5,100,,,,yes',
    );
  });
  it('measurement ranges', () => {
    expect(measurementRange('bodyFat').max).toBe(75);
    expect(measurementRange('waist').max).toBe(300);
  });
});

describe('sessionBests (XP-5)', async () => {
  const { sessionBests } = await import('./stats');
  it('best set and e1RM per session', () => {
    const b = sessionBests([
      { logId: 'a', dateKey: '2026-09-01', reps: 5, weightKg: 100, timeS: null, distanceKm: null },
      { logId: 'a', dateKey: '2026-09-01', reps: 8, weightKg: 100, timeS: null, distanceKm: null },
      { logId: 'a', dateKey: '2026-09-01', reps: 12, weightKg: 80, timeS: null, distanceKm: null },
      { logId: 'b', dateKey: '2026-09-03', reps: 20, weightKg: null, timeS: 60, distanceKm: 1 },
      { logId: 'b', dateKey: '2026-09-03', reps: 25, weightKg: null, timeS: 30, distanceKm: 2 },
    ]);
    expect(b[0]).toMatchObject({ bestWeightKg: 100, bestReps: 8 });
    expect(b[0]!.e1rm).toBeCloseTo(126.67, 2);
    expect(b[1]).toMatchObject({
      bestWeightKg: null,
      bestReps: 25,
      bestTimeS: 60,
      bestDistanceKm: 2,
      e1rm: null,
    });
  });
});

describe('date-time picker helpers (WL-2, VR-15)', async () => {
  const { localParts, partsToUtc, formatPartsLong } = await import('./time');
  const { daysInMonth } = await import('./calendar');
  it('round-trips local parts in the session offset', () => {
    const p = localParts('2026-10-04T09:35:00.000Z', 330);
    expect(p).toEqual({ year: 2026, month: 10, day: 4, hour: 15, minute: 5 });
    expect(partsToUtc(p, 330)).toBe('2026-10-04T09:35:00.000Z');
    expect(formatPartsLong(p)).toBe('Sun, 04 Oct 2026 · 15:05');
  });
  it('clamps the day to the month', () => {
    expect(partsToUtc({ year: 2026, month: 2, day: 31, hour: 0, minute: 0 }, 0)).toBe(
      '2026-02-28T00:00:00.000Z',
    );
    expect(formatPartsLong({ year: 2026, month: 2, day: 31, hour: 7, minute: 0 })).toBe(
      'Sat, 28 Feb 2026 · 07:00',
    );
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});
