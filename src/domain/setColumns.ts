import type { FocusMetric } from './types';

export type SetColumn = FocusMetric | 'rpe';

/**
 * BR-7 / WL-4: set table columns follow the exercise's primary and secondary focus,
 * followed by RPE (always optional, BR-11). SET # and the completion control are fixed
 * and not part of this list.
 */
export function setColumns(primary: FocusMetric, secondary: FocusMetric | null): SetColumn[] {
  const cols: SetColumn[] = [primary];
  if (secondary && secondary !== primary) cols.push(secondary);
  cols.push('rpe');
  return cols;
}

export const COLUMN_LABEL: Record<SetColumn, string> = {
  reps: 'REPS',
  weight: 'WEIGHT',
  time: 'TIME',
  distance: 'DISTANCE',
  rpe: 'RPE',
};
