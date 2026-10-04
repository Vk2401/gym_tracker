/**
 * Locale-tolerant number input (device-independence §7): accepts '.' or ',' as decimal
 * separator and ignores spaces. Returns null for anything that is not a plain number.
 */
export function parseDecimal(input: string): number | null {
  const s = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parses HH:MM:SS (also MM:SS or SS) into seconds; null when malformed (BR-8). */
export function parseTime(input: string): number | null {
  const parts = input.trim().split(':');
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const nums = parts.map(Number);
  while (nums.length < 3) nums.unshift(0);
  const [h, m, s] = nums as [number, number, number];
  if (m > 59 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}
