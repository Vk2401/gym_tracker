import { describe, expect, it } from 'vitest';
import { durationParts, formatDuration } from './duration';
import { parseDecimal, parseTime } from './parse';
import { validateName, validateRange, validateSessionTimes } from './validation';
import { estimateOneRepMax } from './oneRepMax';
import { formatTotals, templateTotals, volumeKg } from './totals';
import { setColumns } from './setColumns';
import { sortByName } from './sort';
import { kgToLb, kmToMi, lbToKg, miToKm } from './units';
import type { SetValues } from './types';

const set = (p: Partial<SetValues>): SetValues => ({
  type: 'working',
  reps: null,
  weightKg: null,
  timeS: null,
  distanceKm: null,
  ...p,
});

describe('duration (BR-4)', () => {
  it('AC-7: 10:30 to 13:34:xx is 3 hours 4 minutes, seconds dropped', () => {
    expect(formatDuration('2026-09-10T10:30:00Z', '2026-09-10T13:34:45Z')).toBe(
      '3 hours 4 minutes',
    );
  });
  it('singular units', () => {
    expect(formatDuration('2026-09-10T10:00:00Z', '2026-09-10T11:01:00Z')).toBe('1 hour 1 minute');
  });
  it('never negative', () => {
    expect(durationParts('2026-09-10T10:00:00Z', '2026-09-10T09:00:00Z')).toEqual({
      hours: 0,
      minutes: 0,
    });
  });
});

describe('parseDecimal (device-independence §7)', () => {
  it.each([
    ['62.5', 62.5],
    ['62,5', 62.5],
    [' 100 ', 100],
    ['.5', 0.5],
    ['5.', 5],
  ])('%s → %s', (input, out) => expect(parseDecimal(input)).toBe(out));
  it.each(['', 'abc', '-1', '1.2.3', '1e3'])('rejects %s', (input) =>
    expect(parseDecimal(input)).toBeNull(),
  );
});

describe('parseTime (BR-8)', () => {
  it('parses', () => {
    expect(parseTime('01:02:03')).toBe(3723);
    expect(parseTime('2:30')).toBe(150);
    expect(parseTime('45')).toBe(45);
  });
  it('rejects malformed', () => {
    expect(parseTime('00:60:00')).toBeNull();
    expect(parseTime('a:b')).toBeNull();
    expect(parseTime('1:2:3:4')).toBeNull();
  });
});

describe('validateName (VR-1)', () => {
  it('length after trimming', () => {
    expect(validateName('  ').ok).toBe(false);
    expect(validateName('x'.repeat(61)).ok).toBe(false);
    expect(validateName('  Chest  ').ok).toBe(true);
  });
  it('unique case-insensitive for exercises', () => {
    const r = validateName('cable crunch', { existing: ['Cable Crunch'], kind: 'exercise' });
    expect(r).toEqual({ ok: false, message: 'An exercise called "cable crunch" already exists.' });
    expect(validateName('Hamstrings', { existing: ['hamstrings'], kind: 'category' }).ok).toBe(
      false,
    );
    expect(validateName('New', { existing: ['Old'], kind: 'exercise' }).ok).toBe(true);
  });
});

describe('validateRange (VR-2)', () => {
  it('accepts in-range values', () => {
    expect(validateRange('reps', 999).ok).toBe(true);
    expect(validateRange('weightKg', 999.9).ok).toBe(true);
    expect(validateRange('rpe', 7.5).ok).toBe(true);
    expect(validateRange('bodyWeightKg', 20).ok).toBe(true);
    expect(validateRange('timeS', 86399).ok).toBe(true);
  });
  it('rejects out-of-range with BRD message', () => {
    expect(validateRange('reps', 1000)).toEqual({
      ok: false,
      message: 'Enter a value between 0 and 999.',
    });
    expect(validateRange('reps', 2.5).ok).toBe(false);
    expect(validateRange('rpe', 7.3).ok).toBe(false);
    expect(validateRange('rpe', 0.5).ok).toBe(false);
    expect(validateRange('bodyWeightKg', 19.9)).toEqual({
      ok: false,
      message: 'Enter a value between 20.0 and 400.0.',
    });
    expect(validateRange('weightKg', Number.NaN).ok).toBe(false);
  });
});

describe('validateSessionTimes (VR-3, VR-4)', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  it('AC-18: end before start is blocked', () => {
    expect(validateSessionTimes('2026-10-04T10:00:00Z', '2026-10-04T09:00:00Z', now)).toEqual({
      ok: false,
      message: 'End time must be after start time.',
    });
  });
  it('future start is blocked', () => {
    expect(validateSessionTimes('2026-10-04T13:00:00Z', null, now)).toEqual({
      ok: false,
      message: "A workout can't start in the future.",
    });
  });
  it('max 24 hours', () => {
    expect(validateSessionTimes('2026-10-02T10:00:00Z', '2026-10-03T10:00:01Z', now).ok).toBe(
      false,
    );
    expect(validateSessionTimes('2026-10-02T10:00:00Z', '2026-10-03T10:00:00Z', now).ok).toBe(true);
  });
});

describe('estimateOneRepMax (section 7)', () => {
  it('Epley for 2–12 reps, w for 1 rep, null otherwise', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.667, 3);
    expect(estimateOneRepMax(100, 12)).toBeCloseTo(140, 6);
    expect(estimateOneRepMax(100, 13)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(0, 5)).toBeNull();
  });
});

describe('totals (BR-3, BR-12, XP-3)', () => {
  it('excludes warm-ups from Next Workout totals', () => {
    const t = templateTotals([
      { sets: [set({ type: 'warmup', reps: 20 }), set({ reps: 10 }), set({ reps: 8 })] },
      { sets: [set({ reps: 12 })] },
    ]);
    expect(t).toEqual({ exercises: 2, sets: 3, reps: 30 });
    expect(formatTotals({ exercises: 9, sets: 30, reps: 356 })).toBe(
      '9 Exercises, 30 Sets, 356 Reps',
    );
    expect(formatTotals({ exercises: 1, sets: 1, reps: 1 })).toBe('1 Exercise, 1 Set, 1 Rep');
  });
  it('AC-13: 3×15 @ 65 kg + 3×10 @ 40 kg = 4,125 kg', () => {
    const sets = [
      ...Array.from({ length: 3 }, () => set({ reps: 15, weightKg: 65, completed: true })),
      ...Array.from({ length: 3 }, () => set({ reps: 10, weightKg: 40, completed: true })),
      set({ type: 'warmup', reps: 10, weightKg: 20, completed: true }),
      set({ reps: 10, weightKg: 100, completed: false }),
    ];
    expect(volumeKg(sets)).toBe(4125);
  });
});

describe('setColumns (WL-4, BR-7, AC-8)', () => {
  it('reps + weight', () =>
    expect(setColumns('reps', 'weight')).toEqual(['reps', 'weight', 'rpe']));
  it('time + distance', () =>
    expect(setColumns('time', 'distance')).toEqual(['time', 'distance', 'rpe']));
  it('single focus', () => expect(setColumns('reps', null)).toEqual(['reps', 'rpe']));
});

describe('sortByName (EX-2, AC-4)', () => {
  it('numbers before letters', () => {
    const names = sortByName([
      { name: 'Ab Crunch Machine' },
      { name: '90/90 Hamstring' },
      { name: '3/4 Sit-Up' },
    ]).map((e) => e.name);
    expect(names).toEqual(['3/4 Sit-Up', '90/90 Hamstring', 'Ab Crunch Machine']);
  });
});

describe('units (BR-9)', () => {
  it('round-trips', () => {
    expect(lbToKg(kgToLb(65))).toBeCloseTo(65, 10);
    expect(miToKm(kmToMi(5))).toBeCloseTo(5, 10);
  });
});

describe('clampTextScale (device-independence §2)', () => {
  it('clamps to 0.85–1.35', async () => {
    const { clampTextScale } = await import('./units');
    expect(clampTextScale(1)).toBe(1);
    expect(clampTextScale(2.0)).toBe(1.35);
    expect(clampTextScale(0.5)).toBe(0.85);
    expect(clampTextScale(1.234)).toBe(1.23);
    expect(clampTextScale(Number.NaN)).toBe(1);
    expect(clampTextScale(0)).toBe(1);
  });
});
