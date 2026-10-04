import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export type Tint = 'blue' | 'teal' | 'purple' | 'pink' | 'amber' | 'red' | 'green' | 'gray';

/** Leading tinted icon square for settings-style rows. */
export function RowIcon({ icon, tint = 'blue' }: { icon: LucideIcon; tint?: Tint }) {
  return (
    <span slot="start" className={`gt-ico gt-ico--${tint}`} aria-hidden="true">
      <Icon icon={icon} />
    </span>
  );
}
