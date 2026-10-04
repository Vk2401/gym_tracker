/** ED-2 / LG-4: category colour dot (optionally with a soft halo, as on group headers). */
export function CategoryDot({
  color,
  size = 8,
  label,
  halo,
}: {
  color: string;
  size?: number;
  label?: string;
  halo?: boolean;
}) {
  return (
    <span
      className={`gt-dot${halo ? ' gt-dot--halo' : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ background: color, width: size, height: size, color }}
    />
  );
}
