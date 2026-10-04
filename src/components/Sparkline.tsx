/** Tiny trend line for the Explore summary tiles (design "Weekly volume" / "Body weight"). */
export function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const pts = values
    .map((v, i) => (v == null ? null : { i, v }))
    .filter((p): p is { i: number; v: number } => p !== null);
  if (pts.length === 0) return <svg className="gt-spark" viewBox="0 0 140 44" aria-hidden="true" />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const n = Math.max(1, values.length - 1);
  const xy = pts.map((p) => ({ x: 2 + (p.i / n) * 136, y: 38 - ((p.v - min) / span) * 32 }));
  const last = xy[xy.length - 1]!;
  return (
    <svg className="gt-spark" viewBox="0 0 140 44" aria-hidden="true">
      {xy.length > 1 && (
        <polyline
          points={xy.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle
        cx={last.x}
        cy={last.y}
        r="4"
        fill={color}
        stroke="var(--gt-surface)"
        strokeWidth="2"
      />
    </svg>
  );
}
