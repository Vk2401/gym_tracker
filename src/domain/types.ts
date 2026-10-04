/** Focus metrics an exercise is measured by (ED-3, section 7). */
export type FocusMetric = 'reps' | 'weight' | 'time' | 'distance';
export type SetType = 'warmup' | 'working';
export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type Appearance = 'system' | 'light' | 'dark';
export type WeekStart = 'sun' | 'mon';

/** Stored values are metric: kg, km, seconds (BR-9). */
export interface SetValues {
  type: SetType;
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
  rpe?: number | null;
  completed?: boolean;
}
