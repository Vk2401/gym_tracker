import { describe, expect, it } from 'vitest';
import { formatDateShortKey, formatDayHeading } from './time';
import { totalsParts } from './totals';
import { restProgress } from './session';
import { formatDurationShort, formatElapsed } from './duration';
import { setChipText } from './setText';

describe('modern UI helpers', () => {
  it('formats the screen eyebrow date', () => {
    expect(formatDayHeading('2026-10-04')).toBe('Sunday, 4 Oct');
    expect(formatDayHeading('2026-02-28')).toBe('Saturday, 28 Feb');
    expect(formatDateShortKey('2026-09-28')).toBe('28/09/26');
  });
  it('splits WO-3 totals into chips', () => {
    expect(totalsParts({ exercises: 9, sets: 30, reps: 356 })).toEqual([
      '9 Exercises',
      '30 Sets',
      '356 Reps',
    ]);
    expect(totalsParts({ exercises: 1, sets: 1, reps: 1 })).toEqual([
      '1 Exercise',
      '1 Set',
      '1 Rep',
    ]);
  });
  it('clamps rest progress', () => {
    expect(restProgress(45, 90)).toBe(0.5);
    expect(restProgress(120, 90)).toBe(1);
    expect(restProgress(-5, 90)).toBe(0);
    expect(restProgress(10, 0)).toBe(0);
  });

  it('formats compact durations and the running clock', () => {
    expect(formatDurationShort('2026-10-02T08:00:00Z', '2026-10-02T08:58:40Z')).toBe('58 min');
    expect(formatDurationShort('2026-10-02T08:00:00Z', '2026-10-02T09:05:00Z')).toBe('1 h 05 min');
    const start = '2026-10-02T08:00:00Z';
    expect(formatElapsed(start, Date.parse('2026-10-02T08:24:18Z'))).toBe('24:18');
    expect(formatElapsed(start, Date.parse('2026-10-02T09:02:05Z'))).toBe('1:02:05');
    expect(formatElapsed(start, Date.parse('2026-10-02T07:00:00Z'))).toBe('0:00');
  });
  it('builds template set chips', () => {
    const u = { weight: 'kg' as const, distance: 'km' as const };
    const set = { type: 'working' as const, reps: 10, weightKg: 60, timeS: null, distanceKm: null };
    expect(setChipText(set, 'reps', 'weight', u)).toBe('10 × 60 kg');
    expect(setChipText({ ...set, weightKg: 62.5 }, 'reps', 'weight', u)).toBe('10 × 62.5 kg');
    expect(setChipText({ ...set, type: 'warmup' }, 'reps', 'weight', u)).toBe('W 10 × 60 kg');
    expect(setChipText({ ...set, reps: null, weightKg: null }, 'reps', 'weight', u)).toBe(
      '— × — kg',
    );
    expect(setChipText({ ...set, timeS: 90 }, 'time', null, u)).toBe('00:01:30');
    expect(
      setChipText({ ...set, distanceKm: 5 }, 'distance', 'time', { weight: 'lb', distance: 'mi' }),
    ).toBe('3.1 mi × —');
  });
});
