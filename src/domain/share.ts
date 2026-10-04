import { formatDistance, formatTime, formatWeight } from './format';
import { formatDuration } from './duration';
import type { DistanceUnit, FocusMetric, SetValues, WeightUnit } from './types';
import { setColumns } from './setColumns';
import { COLUMN_LABEL } from './setColumns';

export interface ShareUnits {
  weight: WeightUnit;
  distance: DistanceUnit;
}

export interface ShareExerciseBlock {
  kind: 'exercise';
  name: string;
  equipment: string | null;
  primary: FocusMetric;
  secondary: FocusMetric | null;
  supersetLabel: string | null;
  note?: string;
  sets: readonly SetValues[];
}

export interface ShareWodBlock {
  kind: 'wod';
  title: string;
  description: string;
  resultS?: number | null;
}

export type ShareBlock = ShareExerciseBlock | ShareWodBlock;

function metricValue(m: FocusMetric, s: SetValues, u: ShareUnits): string {
  switch (m) {
    case 'reps':
      return s.reps == null ? '-' : `${s.reps} reps`;
    case 'weight':
      return s.weightKg == null ? '-' : `${formatWeight(s.weightKg, u.weight)} ${u.weight}`;
    case 'time':
      return s.timeS == null ? '-' : formatTime(s.timeS);
    case 'distance':
      return s.distanceKm == null
        ? '-'
        : `${formatDistance(s.distanceKm, u.distance)} ${u.distance}`;
  }
}

/** One line per set: "1. 15 reps × 65.0 kg  RPE 8" (warm-ups labelled W, PD-9). */
export function formatSetLine(
  s: SetValues,
  label: string,
  primary: FocusMetric,
  secondary: FocusMetric | null,
  u: ShareUnits,
): string {
  const metrics = setColumns(primary, secondary)
    .filter((c) => c !== 'rpe')
    .map((c) => metricValue(c as FocusMetric, s, u))
    .join(' × ');
  const rpe = s.rpe != null ? `  RPE ${s.rpe}` : '';
  return `${label}. ${metrics}${rpe}`;
}

function blockLines(b: ShareBlock, u: ShareUnits): string[] {
  if (b.kind === 'wod') {
    const lines = [`Workout of the Day: ${b.title}`];
    if (b.description.trim()) lines.push(b.description.trim());
    if (b.resultS != null) lines.push(`Result: ${formatTime(b.resultS)}`);
    return lines;
  }
  const head = `${b.name.toUpperCase()}${b.equipment ? ` (${b.equipment})` : ''}${
    b.supersetLabel ? ` [${b.supersetLabel}]` : ''
  }`;
  const lines = [head];
  let n = 0;
  for (const s of b.sets) {
    const label = s.type === 'warmup' ? 'W' : String(++n);
    lines.push(formatSetLine(s, label, b.primary, b.secondary, u));
  }
  if (b.note?.trim()) lines.push(`Note: ${b.note.trim()}`);
  return lines;
}

/** PD-13: template as a formatted plain-text summary. */
export function templateShareText(
  t: { name: string; note: string; blocks: readonly ShareBlock[] },
  u: ShareUnits,
): string {
  const out = [t.name];
  if (t.note.trim()) out.push(t.note.trim());
  for (const b of t.blocks) out.push('', ...blockLines(b, u));
  return out.join('\n');
}

/** PD-13: session log as a formatted plain-text summary. */
export function logShareText(
  l: {
    name: string;
    dateLabel: string;
    startUtc: string;
    endUtc: string | null;
    bodyWeightKg: number | null;
    blocks: readonly ShareBlock[];
  },
  u: ShareUnits,
): string {
  const out = [l.name, l.dateLabel];
  if (l.endUtc) out.push(`Completed in ${formatDuration(l.startUtc, l.endUtc)}`);
  if (l.bodyWeightKg != null)
    out.push(`Body weight: ${formatWeight(l.bodyWeightKg, u.weight)} ${u.weight}`);
  for (const b of l.blocks) {
    if (b.kind === 'exercise') {
      out.push('', ...blockLines({ ...b, sets: b.sets.filter((s) => s.completed) }, u));
    } else out.push('', ...blockLines(b, u));
  }
  return out.join('\n');
}

const FOCUS_LABEL: Record<FocusMetric, string> = {
  reps: 'Reps',
  weight: 'Weight',
  time: 'Time',
  distance: 'Distance',
};
export const focusLabel = (m: FocusMetric): string => FOCUS_LABEL[m];
export const columnLabel = COLUMN_LABEL;

/** PD-13: exercise share — name, focus, equipment, categories and note. */
export function exerciseShareText(e: {
  name: string;
  primary: FocusMetric;
  secondary: FocusMetric | null;
  equipment: string | null;
  categories: readonly string[];
  note: string;
}): string {
  const focus = [e.primary, e.secondary]
    .filter(Boolean)
    .map((m) => FOCUS_LABEL[m as FocusMetric])
    .join(', ');
  const out = [e.name, `Focus: ${focus}`, `Equipment: ${e.equipment ?? 'None'}`];
  if (e.categories.length) out.push(`Categories: ${e.categories.join(', ')}`);
  if (e.note.trim()) out.push('', e.note.trim());
  return out.join('\n');
}
