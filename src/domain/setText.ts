import { formatDistance, formatTime, formatWeight } from './format';
import type { DistanceUnit, FocusMetric, SetValues, WeightUnit } from './types';

/** Weight without a trailing ".0" for compact chips: 60 kg, 62.5 kg. */
const compact = (s: string): string => s.replace(/\.0$/, '');

/**
 * Template set chip (design "10 × 60 kg"): the set's focus metrics joined with ×, warm-ups
 * prefixed with W (PD-9), missing values as —.
 */
export function setChipText(
  s: Pick<SetValues, 'type' | 'reps' | 'weightKg' | 'timeS' | 'distanceKm'>,
  primary: FocusMetric,
  secondary: FocusMetric | null,
  units: { weight: WeightUnit; distance: DistanceUnit },
): string {
  const one = (m: FocusMetric): string => {
    switch (m) {
      case 'reps':
        return s.reps == null ? '—' : String(s.reps);
      case 'weight':
        return s.weightKg == null
          ? `— ${units.weight}`
          : `${compact(formatWeight(s.weightKg, units.weight))} ${units.weight}`;
      case 'time':
        return s.timeS == null ? '—' : formatTime(s.timeS);
      case 'distance':
        return s.distanceKm == null
          ? `— ${units.distance}`
          : `${compact(formatDistance(s.distanceKm, units.distance))} ${units.distance}`;
    }
  };
  const text = [primary, secondary]
    .filter((m): m is FocusMetric => m !== null)
    .map(one)
    .join(' × ');
  return s.type === 'warmup' ? `W ${text}` : text;
}
