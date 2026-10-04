import { MSG, MSG_EXTRA } from './messages';

export type ValidationResult = { ok: true } | { ok: false; message: string };
const OK: ValidationResult = { ok: true };
const fail = (message: string): ValidationResult => ({ ok: false, message });

/** VR-1: 1–60 chars after trimming; optional case-insensitive uniqueness. */
export function validateName(
  name: string,
  opts: { existing?: readonly string[]; kind?: 'exercise' | 'category' } = {},
): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) return fail(MSG_EXTRA.nameLength);
  if (opts.existing && opts.kind) {
    const lower = trimmed.toLocaleLowerCase('en');
    if (opts.existing.some((e) => e.trim().toLocaleLowerCase('en') === lower)) {
      return fail(
        opts.kind === 'exercise'
          ? MSG.duplicateExercise(trimmed)
          : MSG_EXTRA.duplicateCategory(trimmed),
      );
    }
  }
  return OK;
}

/** VR-2 numeric ranges (stored units). */
export const RANGES = {
  reps: { min: 0, max: 999, step: 1 },
  weightKg: { min: 0, max: 999.9, step: 0.1 },
  distanceKm: { min: 0, max: 999.9, step: 0.1 },
  timeS: { min: 0, max: 23 * 3600 + 59 * 60 + 59, step: 1 },
  rpe: { min: 1, max: 10, step: 0.5 },
  bodyWeightKg: { min: 20, max: 400, step: 0.1 },
} as const;

export type RangeField = keyof typeof RANGES;

const DISPLAY: Record<RangeField, [string, string]> = {
  reps: ['0', '999'],
  weightKg: ['0', '999.9'],
  distanceKm: ['0', '999.9'],
  timeS: ['00:00:00', '23:59:59'],
  rpe: ['1', '10'],
  bodyWeightKg: ['20.0', '400.0'],
};

export function validateRange(field: RangeField, value: number): ValidationResult {
  const r = RANGES[field];
  const [min, max] = DISPLAY[field];
  if (!Number.isFinite(value) || value < r.min || value > r.max)
    return fail(MSG.outOfRange(min, max));
  if (field === 'reps' || field === 'timeS') {
    if (!Number.isInteger(value)) return fail(MSG.outOfRange(min, max));
  }
  if (field === 'rpe' && !Number.isInteger(value * 2)) return fail(MSG.outOfRange(min, max));
  return OK;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** VR-3 (end after start, ≤ 24 h) and VR-4 (no future start). */
export function validateSessionTimes(
  startUtc: string,
  endUtc: string | null,
  now: Date = new Date(),
): ValidationResult {
  const start = Date.parse(startUtc);
  if (start > now.getTime()) return fail(MSG.futureStart);
  if (endUtc !== null) {
    const end = Date.parse(endUtc);
    if (end <= start) return fail(MSG.endBeforeStart);
    if (end - start > DAY_MS) return fail(MSG_EXTRA.sessionTooLong);
  }
  return OK;
}
