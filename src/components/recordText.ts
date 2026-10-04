import type { PersonalRecord } from '@/domain/records';
import { formatDistance, formatTime, formatWeight } from '@/domain/format';
import type { DistanceUnit, WeightUnit } from '@/domain/types';

/** XP-6 record value text in display units. */
export function recordValue(r: PersonalRecord, wu: WeightUnit, du: DistanceUnit): string {
  switch (r.recordType) {
    case 'maxWeight':
    case 'est1rm':
      return `${formatWeight(r.value, wu)} ${wu}`;
    case 'maxRepsAtWeight':
      return `${r.value} reps × ${formatWeight(r.weightKg ?? 0, wu)} ${wu}`;
    case 'maxTime':
      return formatTime(r.value);
    case 'maxDistance':
      return `${formatDistance(r.value, du)} ${du}`;
  }
}
