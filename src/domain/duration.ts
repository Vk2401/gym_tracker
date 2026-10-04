/**
 * BR-4: duration = end − start on full timestamps (incl. seconds), shown in whole hours and
 * minutes with remaining seconds dropped.
 */
export function durationParts(
  startUtc: string,
  endUtc: string,
): { hours: number; minutes: number } {
  const ms = Date.parse(endUtc) - Date.parse(startUtc);
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** LG-7: "3 hours 4 minutes". */
export function formatDuration(startUtc: string, endUtc: string): string {
  const { hours, minutes } = durationParts(startUtc, endUtc);
  return `${plural(hours, 'hour')} ${plural(minutes, 'minute')}`;
}

/** Compact duration for log cards: "58 min", "1 h 05 min" (BR-4 whole minutes). */
export function formatDurationShort(startUtc: string, endUtc: string): string {
  const { hours, minutes } = durationParts(startUtc, endUtc);
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`;
}

/** Running session clock for the resume card: "24:18", "1:02:05". */
export function formatElapsed(startUtc: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - Date.parse(startUtc)) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
