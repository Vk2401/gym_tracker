import type { WeekStart } from './types';
import { MONTHS_LONG } from './time';

const WEEKDAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** LG-2 / ST-2: weekday headers starting Sunday or Monday. */
export function weekdayHeaders(weekStart: WeekStart): string[] {
  return weekStart === 'sun' ? [...WEEKDAYS_SUN] : [...WEEKDAYS_SUN.slice(1), 'Sun'];
}

/**
 * LG-2: month grid as weeks of YYYY-MM-DD keys (null for padding cells).
 * month is 1-based.
 */
export function monthGrid(year: number, month: number, weekStart: WeekStart): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sun
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = weekStart === 'sun' ? first : (first + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "September 2026". */
export const monthTitle = (year: number, month: number): string =>
  `${MONTHS_LONG[month - 1]} ${year}`;

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** First and last date keys of a month. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(days).padStart(2, '0')}` };
}
