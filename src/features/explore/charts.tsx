import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';

ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

/** Chart colours come from theme tokens and are re-read when the theme changes. */
function useChartTheme() {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      key: dark ? 'dark' : 'light',
      // validated pair (dataviz validator, light & dark): brand blue + orange
      s1: v('--gt-blue') || '#1e7bf2',
      s2: dark ? '#d95926' : '#eb6834',
      surface: v('--gt-surface') || '#fff',
      grid: v('--gt-separator') || '#c6c6c8',
      text: v('--gt-text-secondary') || '#6b6b70',
      font: v('--ion-font-family') || 'system-ui',
    };
  };
  const [t, setT] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(read()));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });
    return () => mo.disconnect();
  }, []);
  return t;
}

export interface Series {
  label: string;
  values: (number | null)[];
}

interface ChartProps {
  labels: string[];
  series: Series[];
  /** Formats a value for ticks and tooltips. */
  format: (v: number) => string;
  /** XP-8: index of the tapped point. */
  onPick?: (index: number) => void;
  ariaLabel: string;
  /** Whole-number axis (counts). */
  integer?: boolean;
  /** Drawn on the navy highlight card: light bars, latest one bright, no grid. */
  tone?: 'navy';
}

function baseOptions(
  t: ReturnType<typeof useChartTheme>,
  p: ChartProps,
): ChartOptions<'bar' | 'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    onClick: (_e, els) => {
      const i = els[0]?.index;
      if (i !== undefined) p.onPick?.(i);
    },
    plugins: {
      legend: {
        display: p.series.length > 1,
        position: 'top',
        align: 'start',
        labels: {
          color: t.text,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          font: { family: t.font, size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (c) => `${c.dataset.label}: ${c.parsed.y === null ? '—' : p.format(c.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: p.tone === 'navy' ? 'transparent' : t.grid },
        ticks: {
          color: p.tone === 'navy' ? '#a9c4f5' : t.text,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          font: { family: t.font, size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        display: p.tone !== 'navy',
        grid: { color: t.grid, lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: t.text,
          maxTicksLimit: 5,
          precision: p.integer ? 0 : undefined,
          callback: (v) => p.format(Number(v)),
          font: { family: t.font, size: 11 },
        },
      },
    },
  };
}

/** Columns: ≤ 24px, 4px rounded data end, square at the baseline (dataviz mark specs). */
export function ColumnChart(p: ChartProps) {
  const t = useChartTheme();
  return (
    <div className="gt-chart" role="img" aria-label={p.ariaLabel}>
      <Bar
        key={t.key}
        data={{
          labels: p.labels,
          datasets: p.series.map((s, i) => ({
            label: s.label,
            data: s.values,
            backgroundColor:
              p.tone === 'navy'
                ? s.values.map((_, j) =>
                    j === s.values.length - 1 ? '#5ab0ff' : 'rgba(124, 192, 255, 0.35)',
                  )
                : i === 0
                  ? t.s1
                  : t.s2,
            maxBarThickness: 24,
            borderRadius: p.tone === 'navy' ? 8 : { topLeft: 6, topRight: 6 },
            borderSkipped: p.tone === 'navy' ? false : ('start' as const),
          })),
        }}
        options={baseOptions(t, p) as ChartOptions<'bar'>}
      />
    </div>
  );
}

/** Lines: 2px, ≥ 8px markers with a 2px surface ring. */
export function LineChart(p: ChartProps & { beginAtZero?: boolean }) {
  const t = useChartTheme();
  const opts = baseOptions(t, p) as ChartOptions<'line'>;
  if (p.beginAtZero === false) (opts.scales!.y as { beginAtZero: boolean }).beginAtZero = false;
  return (
    <div className="gt-chart" role="img" aria-label={p.ariaLabel}>
      <Line
        key={t.key}
        data={{
          labels: p.labels,
          datasets: p.series.map((s, i) => {
            const c = i === 0 ? t.s1 : t.s2;
            return {
              label: s.label,
              data: s.values,
              borderColor: c,
              backgroundColor: c,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHitRadius: 14,
              pointBorderColor: t.surface,
              pointBorderWidth: 2,
              spanGaps: true,
              tension: 0,
            };
          }),
        }}
        options={opts}
      />
    </div>
  );
}

/** Accessible table view of a chart (dataviz a11y pass). */
export function ChartTable({
  caption,
  labels,
  series,
  format,
}: {
  caption: string;
  labels: string[];
  series: Series[];
  format: (v: number) => string;
}) {
  return (
    <table className="gt-sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          {series.map((s) => (
            <th key={s.label} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((l, i) => (
          <tr key={`${l}-${i}`}>
            <th scope="row">{l}</th>
            {series.map((s) => (
              <td key={s.label}>{s.values[i] == null ? '—' : format(s.values[i]!)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
