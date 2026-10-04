import type { Exercise } from '@/db/models';
import { focusLabel } from '@/domain/share';

/** EX-3 row text: "Reps, Weight · Machine". */
export function focusSummary(e: Pick<Exercise, 'primary' | 'secondary' | 'equipmentName'>): string {
  const focus = [e.primary, e.secondary]
    .filter(Boolean)
    .map((m) => focusLabel(m!))
    .join(', ');
  return `${focus} · ${e.equipmentName ?? 'None'}`;
}
