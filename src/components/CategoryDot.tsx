/** ED-2 / LG-4: category colour dot. */
export function CategoryDot({
  color,
  size = 8,
  label,
}: {
  color: string;
  size?: number;
  label?: string;
}) {
  return (
    <span
      className="gt-dot"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ background: color, width: size, height: size }}
    />
  );
}
