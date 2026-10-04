// BR-9: values are stored in metric; conversion only for display/input.
export const LB_PER_KG = 2.20462;
export const MI_PER_KM = 0.621371;

export const kgToLb = (kg: number): number => kg * LB_PER_KG;
export const lbToKg = (lb: number): number => lb / LB_PER_KG;
export const kmToMi = (km: number): number => km * MI_PER_KM;
export const miToKm = (mi: number): number => mi / MI_PER_KM;

/** Device-independence §2: OS text size is honoured only within the designed range. */
export const TEXT_SCALE_MIN = 0.85;
export const TEXT_SCALE_MAX = 1.35;
export function clampTextScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(scale * 100) / 100));
}
