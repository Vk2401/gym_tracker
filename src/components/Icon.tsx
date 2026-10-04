import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  slot?: string;
  className?: string;
  /** Ionic colour name; only `primary` is used. */
  color?: 'primary';
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

/** Lucide icon (bundled, NFR-2) usable in Ionic slots like IonIcon. */
export function Icon({ icon: Svg, slot, className, color, 'aria-label': label }: Props) {
  const cls = ['gt-icon', color === 'primary' && 'gt-icon--primary', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Svg
      slot={slot}
      className={cls}
      strokeWidth={2}
      absoluteStrokeWidth={false}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
    />
  );
}
