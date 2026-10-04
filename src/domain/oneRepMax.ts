/**
 * Section 7: Epley estimated one-rep max, only for sets of 1–12 reps; 1 rep returns w.
 * 1RM = w × (1 + r / 30)
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!Number.isInteger(reps) || reps < 1 || reps > 12 || weightKg <= 0) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
