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
