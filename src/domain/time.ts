import { formatInTimeZone } from 'date-fns-tz';
import { offsetToZone } from './format';

/** A stored instant: UTC ISO string plus the device offset at that moment (VR-15). */
export interface Stamp {
  utc: string;
  offsetMin: number;
}

export function stampOf(date: Date): Stamp {
  return { utc: date.toISOString(), offsetMin: -date.getTimezoneOffset() };
}

export const nowStamp = (): Stamp => stampOf(new Date());

/** YYYY-MM-DD of an instant in the given offset (VR-14: a log belongs to its start date). */
export function dateKeyAt(utc: string, offsetMin: number): string {
  return formatInTimeZone(utc, offsetToZone(offsetMin), 'yyyy-MM-dd');
}

/** HH:MM (24-hour) of an instant in the given offset. */
export function clockAt(utc: string, offsetMin: number): string {
  return formatInTimeZone(utc, offsetToZone(offsetMin), 'HH:mm');
}

/** Local calendar key for "today" on this device. */
export const todayKey = (now: Date = new Date()): string => {
  const s = stampOf(now);
  return dateKeyAt(s.utc, s.offsetMin);
};

/**
 * Converts a local date (YYYY-MM-DD) and time (HH:MM or HH:MM:SS) in a fixed offset to a UTC
 * ISO string. Used by the Start/End pickers, which edit in the session's own local time.
 */
export function localToUtc(dateKey: string, time: string, offsetMin: number): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const [hh, mm, ss = 0] = time.split(':').map(Number) as [number, number, number?];
  const ms = Date.UTC(y, m - 1, d, hh, mm, ss) - offsetMin * 60_000;
  return new Date(ms).toISOString();
}

/** Adds days to a YYYY-MM-DD key. */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Formats a YYYY-MM-DD key as DD MMM YYYY (BR-10). */
export function formatDateKeyLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface LocalParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
}

/** Local calendar parts of an instant in a fixed offset (VR-15). */
export function localParts(utc: string, offsetMin: number): LocalParts {
  const d = new Date(Date.parse(utc) + offsetMin * 60_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** Builds the UTC instant for local parts in a fixed offset; the day is clamped to the month. */
export function partsToUtc(p: LocalParts, offsetMin: number): string {
  const maxDay = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  const day = Math.min(p.day, maxDay);
  return new Date(
    Date.UTC(p.year, p.month - 1, day, p.hour, p.minute) - offsetMin * 60_000,
  ).toISOString();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "Sun, 04 Oct 2026 · 15:05" — BR-10 date and 24-hour time with weekday. */
export function formatPartsLong(p: LocalParts): string {
  const maxDay = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  const day = Math.min(p.day, maxDay);
  const wd = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, day)).getUTCDay()];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${wd}, ${pad(day)} ${MONTHS_SHORT[p.month - 1]} ${p.year} · ${pad(p.hour)}:${pad(p.minute)}`;
}
