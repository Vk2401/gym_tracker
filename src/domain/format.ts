import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale';
import type { DistanceUnit, WeightUnit } from './types';
import { kgToLb, kmToMi } from './units';

/**
 * All formatting is fixed and locale-independent (device-independence §6–7):
 * '.' decimal separator, 24-hour clock, BR-8 / BR-10 patterns.
 */

const oneDecimal = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/** BR-8 + ST-1: one decimal, converted for display only. */
export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  return oneDecimal(unit === 'lb' ? kgToLb(kg) : kg);
}

export function formatDistance(km: number, unit: DistanceUnit = 'km'): string {
  return oneDecimal(unit === 'mi' ? kmToMi(km) : km);
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** BR-8: time as HH:MM:SS. */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** UTC offset in minutes → "+05:30" style zone accepted by date-fns-tz. */
export function offsetToZone(offsetMin: number): string {
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/**
 * VR-15: timestamps are stored as UTC + original offset and shown in the session's own
 * local time.
 */
function fmt(utcIso: string, offsetMin: number, pattern: string): string {
  return formatInTimeZone(utcIso, offsetToZone(offsetMin), pattern, { locale: enGB });
}

/** BR-10: DD/MM/YY on template rows. */
export const formatDateShort = (utcIso: string, offsetMin: number): string =>
  fmt(utcIso, offsetMin, 'dd/MM/yy');

/** BR-10: DD MMM YYYY on log pickers and day headers. */
export const formatDateLong = (utcIso: string, offsetMin: number): string =>
  fmt(utcIso, offsetMin, 'dd MMM yyyy');

/** BR-10: 24-hour HH:MM regardless of the device 12/24-hour setting. */
export const formatClock = (utcIso: string, offsetMin: number): string =>
  fmt(utcIso, offsetMin, 'HH:mm');

/** Local calendar date key (YYYY-MM-DD) of a session; a log belongs to its start date (VR-14). */
export const localDateKey = (utcIso: string, offsetMin: number): string =>
  fmt(utcIso, offsetMin, 'yyyy-MM-dd');
