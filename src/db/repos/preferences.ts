import type { Appearance, DistanceUnit, WeekStart, WeightUnit } from '@/domain/types';
import type { Db } from '../types';

export interface Preferences {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  weekStart: WeekStart;
  showDots: boolean;
  restS: number;
  sound: boolean;
  haptics: boolean;
  keepAwake: boolean;
  appearance: Appearance;
}

interface Row {
  weight_unit: WeightUnit;
  distance_unit: DistanceUnit;
  week_start: WeekStart;
  show_dots: number;
  rest_s: number;
  sound: number;
  haptics: number;
  keep_awake: number;
  appearance: Appearance;
}

const COLUMN: Record<keyof Preferences, keyof Row> = {
  weightUnit: 'weight_unit',
  distanceUnit: 'distance_unit',
  weekStart: 'week_start',
  showDots: 'show_dots',
  restS: 'rest_s',
  sound: 'sound',
  haptics: 'haptics',
  keepAwake: 'keep_awake',
  appearance: 'appearance',
};

export async function loadPreferences(db: Db): Promise<Preferences> {
  const [r] = await db.query<Row>('SELECT * FROM preferences WHERE id = 1');
  if (!r) throw new Error('preferences row missing');
  return {
    weightUnit: r.weight_unit,
    distanceUnit: r.distance_unit,
    weekStart: r.week_start,
    showDots: !!r.show_dots,
    restS: r.rest_s,
    sound: !!r.sound,
    haptics: !!r.haptics,
    keepAwake: !!r.keep_awake,
    appearance: r.appearance,
  };
}

export async function savePreference<K extends keyof Preferences>(
  db: Db,
  key: K,
  value: Preferences[K],
): Promise<void> {
  const v = typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number);
  await db.run(`UPDATE preferences SET ${COLUMN[key]} = ? WHERE id = 1`, [v]);
  await db.persist();
}
