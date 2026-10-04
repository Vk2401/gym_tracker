import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDateLong,
  formatDateShort,
  formatDistance,
  formatTime,
  formatWeight,
  localDateKey,
  offsetToZone,
} from './format';

describe('formatWeight (BR-8, ST-1)', () => {
  it('shows one decimal in kg', () => {
    expect(formatWeight(5)).toBe('5.0');
    expect(formatWeight(65)).toBe('65.0');
    expect(formatWeight(79)).toBe('79.0');
  });
  it('AC-15: 65.0 kg displays as 143.3 lb and back as 65.0 kg', () => {
    expect(formatWeight(65, 'lb')).toBe('143.3');
    expect(formatWeight(65, 'kg')).toBe('65.0');
  });
});

describe('formatDistance (BR-8, BR-9)', () => {
  it('formats km and mi', () => {
    expect(formatDistance(5)).toBe('5.0');
    expect(formatDistance(10, 'mi')).toBe('6.2');
  });
});

describe('formatTime (BR-8)', () => {
  it('formats HH:MM:SS', () => {
    expect(formatTime(0)).toBe('00:00:00');
    expect(formatTime(3723)).toBe('01:02:03');
    expect(formatTime(86399)).toBe('23:59:59');
    expect(formatTime(-5)).toBe('00:00:00');
  });
});

describe('dates (BR-10, VR-14, VR-15)', () => {
  const utc = '2026-09-13T05:00:00.000Z';
  it('formats in the session offset with fixed patterns', () => {
    expect(formatDateShort(utc, 330)).toBe('13/09/26');
    expect(formatDateLong(utc, 330)).toMatch(/^13 Sep/);
    expect(formatClock(utc, 330)).toBe('10:30');
    expect(formatClock(utc, -240)).toBe('01:00');
  });
  it('uses 24-hour time', () => {
    expect(formatClock('2026-09-13T20:35:00Z', 0)).toBe('20:35');
  });
  it('a session across midnight belongs to its start date (VR-14)', () => {
    expect(localDateKey('2026-09-13T18:00:00Z', 330)).toBe('2026-09-13');
    expect(localDateKey('2026-09-13T18:31:00Z', 330)).toBe('2026-09-14');
  });
  it('offsetToZone', () => {
    expect(offsetToZone(330)).toBe('+05:30');
    expect(offsetToZone(-90)).toBe('-01:30');
    expect(offsetToZone(0)).toBe('+00:00');
  });
});
