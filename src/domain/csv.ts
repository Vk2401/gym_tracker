/** ST-6 / AC-19: CSV export with one row per set of every log. Stored metric values. */
export interface CsvSetRow {
  logId: string;
  workout: string;
  date: string; // YYYY-MM-DD (start date, VR-14)
  startTime: string; // HH:MM
  endTime: string;
  bodyWeightKg: number | null;
  exerciseOrder: number;
  exercise: string;
  equipment: string | null;
  setNumber: number;
  setType: 'warmup' | 'working';
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
  rpe: number | null;
  completed: boolean;
}

export const CSV_HEADER = [
  'log_id',
  'workout',
  'date',
  'start_time',
  'end_time',
  'body_weight_kg',
  'exercise_order',
  'exercise',
  'equipment',
  'set_number',
  'set_type',
  'reps',
  'weight_kg',
  'time_s',
  'distance_km',
  'rpe',
  'completed',
] as const;

export function csvCell(v: string | number | boolean | null): string {
  if (v === null) return '';
  const s = typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);
  // Quote when needed; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === 'string' ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: readonly CsvSetRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.logId,
        r.workout,
        r.date,
        r.startTime,
        r.endTime,
        r.bodyWeightKg,
        r.exerciseOrder,
        r.exercise,
        r.equipment,
        r.setNumber,
        r.setType,
        r.reps,
        r.weightKg,
        r.timeS,
        r.distanceKm,
        r.rpe,
        r.completed,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
