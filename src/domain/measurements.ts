/** PD-14 / section 7: body measurement types, each optional per log. Stored in cm or %. */
export const MEASUREMENT_TYPES = [
  { type: 'chest', label: 'Chest', unit: 'cm' },
  { type: 'waist', label: 'Waist', unit: 'cm' },
  { type: 'hips', label: 'Hips', unit: 'cm' },
  { type: 'arm', label: 'Arm', unit: 'cm' },
  { type: 'thigh', label: 'Thigh', unit: 'cm' },
  { type: 'calf', label: 'Calf', unit: 'cm' },
  { type: 'neck', label: 'Neck', unit: 'cm' },
  { type: 'bodyFat', label: 'Body fat', unit: '%' },
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number]['type'];

/** Measurement range (not in VR-2; sane bounds so typos are caught). */
export function measurementRange(type: MeasurementType): { min: number; max: number } {
  return type === 'bodyFat' ? { min: 1, max: 75 } : { min: 1, max: 300 };
}
