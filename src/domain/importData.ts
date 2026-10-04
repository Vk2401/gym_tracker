/**
 * PD-19 / ST-6: importing workout history from a CSV file (ours or another app's) or a JSON
 * list of sets. Pure functions: parse → match columns → validate every cell against the app's
 * formats and ranges → group rows into workouts. The repository writes the result.
 */
import { CSV_HEADER } from './csv';
import { IMPORT_MSG } from './messages';
import { parseDecimal, parseTime } from './parse';
import { addDaysKey } from './time';
import type { FocusMetric } from './types';
import { lbToKg, miToKm } from './units';
import { validateName, validateRange, type RangeField } from './validation';

/* ------------------------------------------------------------------ parsing ------------ */

export interface Table {
  headers: string[];
  rows: string[][];
}

/** RFC 4180 CSV with BOM, CRLF/LF, quoted fields and `,` `;` or tab as delimiter. */
export function parseCsv(text: string): Table {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    out.push(row);
  }
  const nonEmpty = out.filter((r) => r.some((c) => c.trim() !== ''));
  const [headers = [], ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

function detectDelimiter(line: string): string {
  const count = (d: string) => line.split(d).length - 1;
  return [',', ';', '\t'].reduce((best, d) => (count(d) > count(best) ? d : best), ',');
}

/**
 * JSON import: an array of flat objects (or such an array under a common key) becomes a
 * table whose headers are the union of the keys. Returns null for any other shape.
 */
export function jsonToTable(value: unknown): Table | null {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? (['sets', 'rows', 'data', 'workouts', 'logs', 'records']
          .map((k) => (value as Record<string, unknown>)[k])
          .find(Array.isArray) ?? null)
      : null;
  if (!list || list.length === 0) return null;
  if (!list.every((r) => r && typeof r === 'object' && !Array.isArray(r))) return null;
  const headers: string[] = [];
  for (const r of list as Record<string, unknown>[])
    for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  const cellOf = (v: unknown): string | null =>
    v === null || v === undefined
      ? ''
      : typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        ? String(v)
        : null;
  const rows: string[][] = [];
  for (const r of list as Record<string, unknown>[]) {
    const cells = headers.map((h) => cellOf(r[h]));
    if (cells.some((c) => c === null)) return null; // nested objects: not a flat set list
    rows.push(cells as string[]);
  }
  return { headers, rows };
}

/* ------------------------------------------------------------- column matching ---------- */

export type ImportField = (typeof CSV_HEADER)[number];
export type ValueKind =
  | 'text'
  | 'date'
  | 'clock'
  | 'int'
  | 'weight'
  | 'distance'
  | 'duration'
  | 'rpe'
  | 'setType'
  | 'bool';

export interface FieldSpec {
  key: ImportField;
  kind: ValueKind;
  required?: boolean;
}

/** Every column of our own CSV export, in export order. */
export const IMPORT_FIELDS: readonly FieldSpec[] = [
  { key: 'log_id', kind: 'text' },
  { key: 'workout', kind: 'text' },
  { key: 'date', kind: 'date', required: true },
  { key: 'start_time', kind: 'clock' },
  { key: 'end_time', kind: 'clock' },
  { key: 'body_weight_kg', kind: 'weight' },
  { key: 'exercise_order', kind: 'int' },
  { key: 'exercise', kind: 'text', required: true },
  { key: 'equipment', kind: 'text' },
  { key: 'set_number', kind: 'int' },
  { key: 'set_type', kind: 'setType' },
  { key: 'reps', kind: 'int' },
  { key: 'weight_kg', kind: 'weight' },
  { key: 'time_s', kind: 'duration' },
  { key: 'distance_km', kind: 'distance' },
  { key: 'rpe', kind: 'rpe' },
  { key: 'completed', kind: 'bool' },
];

const METRICS: readonly ImportField[] = ['reps', 'weight_kg', 'time_s', 'distance_km'];

/** "Weight (lbs)" → "weight_lbs". */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ALIASES: Record<ImportField, readonly string[]> = {
  log_id: ['log_id', 'workout_id', 'session_id'],
  workout: [
    'workout',
    'workout_name',
    'session',
    'session_name',
    'routine',
    'routine_name',
    'title',
  ],
  date: ['date', 'day', 'workout_date', 'session_date', 'start_date', 'performed_on', 'date_time'],
  start_time: ['start_time', 'start', 'started', 'started_at', 'time_started'],
  end_time: ['end_time', 'end', 'finished', 'ended_at', 'finish_time', 'time_finished'],
  body_weight_kg: ['body_weight_kg', 'body_weight', 'bodyweight', 'bodyweight_kg', 'bw'],
  exercise_order: ['exercise_order', 'exercise_no', 'exercise_number', 'exercise_index', 'order'],
  exercise: ['exercise', 'exercise_name', 'movement', 'lift', 'exercise_title'],
  equipment: ['equipment', 'gear'],
  set_number: ['set_number', 'set', 'set_no', 'set_order', 'set_index'],
  set_type: ['set_type', 'type', 'set_kind'],
  reps: ['reps', 'rep', 'repetitions', 'rep_count'],
  weight_kg: ['weight_kg', 'weight', 'load', 'kg', 'weight_kgs', 'load_kg'],
  time_s: [
    'time_s',
    'duration',
    'duration_s',
    'seconds',
    'duration_seconds',
    'time_seconds',
    'time',
  ],
  distance_km: ['distance_km', 'distance', 'km'],
  rpe: ['rpe'],
  completed: ['completed', 'done', 'complete', 'is_completed'],
};
const LB_HEADERS = ['weight_lb', 'weight_lbs', 'lb', 'lbs', 'load_lb', 'load_lbs'];
const BW_LB_HEADERS = ['body_weight_lb', 'body_weight_lbs', 'bodyweight_lb', 'bodyweight_lbs'];
const MI_HEADERS = ['distance_mi', 'distance_miles', 'miles', 'mi'];

export type DateOrder = 'dmy' | 'mdy';

export interface ImportSettings {
  /** Our field → column index in the file (absent = not in the file). */
  mapping: Partial<Record<ImportField, number>>;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  /** Only matters for dates like 03/04/2026; ISO dates are unambiguous. */
  dateOrder: DateOrder;
}

/** Guesses the mapping and units from the header names. `exact` = the file is our export. */
export function autoMatch(headers: readonly string[]): {
  settings: ImportSettings;
  exact: boolean;
} {
  const norm = headers.map(normalizeHeader);
  const mapping: ImportSettings['mapping'] = {};
  const used = new Set<number>();
  const take = (field: ImportField, names: readonly string[]) => {
    if (mapping[field] !== undefined) return false;
    for (const n of names) {
      const i = norm.findIndex((h, j) => h === n && !used.has(j));
      if (i >= 0) {
        mapping[field] = i;
        used.add(i);
        return true;
      }
    }
    return false;
  };
  // exact names first so e.g. "time_s" is never taken by a looser alias
  for (const f of IMPORT_FIELDS) take(f.key, [f.key]);
  const lb = take('weight_kg', LB_HEADERS);
  const bwLb = take('body_weight_kg', BW_LB_HEADERS);
  const mi = take('distance_km', MI_HEADERS);
  for (const f of IMPORT_FIELDS) take(f.key, ALIASES[f.key]);
  const exact = CSV_HEADER.every((h) => norm.includes(h));
  return {
    settings: {
      mapping,
      weightUnit: lb || bwLb ? 'lb' : 'kg',
      distanceUnit: mi ? 'mi' : 'km',
      dateOrder: 'dmy',
    },
    exact,
  };
}

/** What still blocks the import with this mapping; empty when it can run. */
export function mappingProblems(mapping: ImportSettings['mapping']): string[] {
  const out: string[] = [];
  for (const f of IMPORT_FIELDS)
    if (f.required && mapping[f.key] === undefined) out.push(IMPORT_MSG.needField(f.key));
  if (!METRICS.some((m) => mapping[m] !== undefined)) out.push(IMPORT_MSG.needMetric);
  const cols = Object.values(mapping);
  if (new Set(cols).size !== cols.length) out.push(IMPORT_MSG.columnTwice);
  return out;
}

/* ------------------------------------------------------------- cell parsing ------------- */

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };
const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const bad = <T>(message: string): Parsed<T> => ({ ok: false, message });

const pad = (n: number) => String(n).padStart(2, '0');
function dateKey(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Dates: 2026-10-04, 2026/10/04, 2026-10-04T07:30[:00][Z], or 04/10/2026, 04-10-26,
 * 04.10.2026 read as day-month (or month-day when `order` is 'mdy'). A time part is returned
 * so files with one date-time column still get a start time.
 */
export function parseDateCell(
  raw: string,
  order: DateOrder,
): Parsed<{ date: string; time?: string }> {
  const s = raw.trim();
  let m =
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i.exec(
      s,
    );
  if (m) {
    const d = dateKey(+m[1]!, +m[2]!, +m[3]!);
    if (!d) return bad(IMPORT_MSG.badDate);
    return ok(m[4] ? { date: d, time: `${pad(+m[4])}:${m[5]}` } : { date: d });
  }
  m =
    /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?)?$/i.exec(
      s,
    );
  if (m) {
    const [a, b] = [+m[1]!, +m[2]!];
    const [day, month] = order === 'mdy' ? [b, a] : [a, b];
    const d = dateKey(+m[3]!, month, day);
    if (!d) return bad(IMPORT_MSG.badDate);
    if (!m[4]) return ok({ date: d });
    const clock = parseClockCell(`${m[4]}:${m[5]}${m[6] ? ` ${m[6]}` : ''}`);
    return clock.ok ? ok({ date: d, time: clock.value }) : ok({ date: d });
  }
  return bad(IMPORT_MSG.badDate);
}

/** Times of day: 07:30, 7:30:15, 7:30 pm → "HH:MM" (24-hour, stored as such). */
export function parseClockCell(raw: string): Parsed<string> {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i.exec(raw.trim());
  if (!m) return bad(IMPORT_MSG.badClock);
  let h = +m[1]!;
  const min = +m[2]!;
  const ampm = m[4]?.toLowerCase().replace(/\./g, '');
  if (ampm) {
    if (h < 1 || h > 12) return bad(IMPORT_MSG.badClock);
    h = (h % 12) + (ampm === 'pm' ? 12 : 0);
  }
  if (h > 23 || min > 59) return bad(IMPORT_MSG.badClock);
  return ok(`${pad(h)}:${pad(min)}`);
}

function inRange(field: RangeField, n: number): Parsed<number> {
  const r = validateRange(field, n);
  return r.ok ? ok(n) : bad(r.message);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function parseValue(
  kind: ValueKind,
  raw: string,
  field: ImportField,
  s: Pick<ImportSettings, 'weightUnit' | 'distanceUnit'>,
): Parsed<string | number | boolean> {
  const text = raw.trim();
  switch (kind) {
    case 'text':
      return ok(text);
    case 'int': {
      const n = parseDecimal(text);
      if (n === null || !Number.isInteger(n)) return bad(IMPORT_MSG.badWhole);
      return field === 'reps' ? inRange('reps', n) : n >= 1 ? ok(n) : bad(IMPORT_MSG.badWhole);
    }
    case 'weight': {
      const n = parseDecimal(text.replace(/\s*(kgs?|lbs?)$/i, ''));
      if (n === null) return bad(IMPORT_MSG.badNumber);
      const kg = round1(s.weightUnit === 'lb' ? lbToKg(n) : n);
      return inRange(field === 'body_weight_kg' ? 'bodyWeightKg' : 'weightKg', kg);
    }
    case 'distance': {
      const n = parseDecimal(text.replace(/\s*(km|mi|miles?)$/i, ''));
      if (n === null) return bad(IMPORT_MSG.badNumber);
      return inRange('distanceKm', round1(s.distanceUnit === 'mi' ? miToKm(n) : n));
    }
    case 'duration': {
      // whole seconds (our export) or H:MM:SS / MM:SS
      const n = /^\d+$/.test(text) ? Number(text) : parseTime(text);
      if (n === null) return bad(IMPORT_MSG.badDuration);
      return inRange('timeS', n);
    }
    case 'rpe': {
      const n = parseDecimal(text);
      if (n === null) return bad(IMPORT_MSG.badNumber);
      return inRange('rpe', n);
    }
    case 'setType': {
      const t = text.toLowerCase().replace(/[^a-z]/g, '');
      if (['warmup', 'w', 'warm', 'wu'].includes(t)) return ok('warmup');
      if (
        [
          'working',
          'work',
          'normal',
          'n',
          'set',
          'main',
          'drop',
          'dropset',
          'failure',
          'f',
        ].includes(t)
      )
        return ok('working');
      return bad(IMPORT_MSG.badSetType);
    }
    case 'bool': {
      const t = text.toLowerCase();
      if (['yes', 'y', 'true', '1', 'done', 'completed', 'x', '✓'].includes(t)) return ok(true);
      if (['no', 'n', 'false', '0', 'not done'].includes(t)) return ok(false);
      return bad(IMPORT_MSG.badBool);
    }
    case 'date':
    case 'clock':
      return bad(IMPORT_MSG.badDate); // handled by parseDateCell / parseClockCell
  }
}

/** Day-month vs month-day from the data itself: a first part over 12 can only be a day. */
export function guessDateOrder(values: readonly string[]): DateOrder {
  for (const v of values) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(v.trim());
    if (!m) continue;
    if (+m[1]! > 12) return 'dmy';
    if (+m[2]! > 12) return 'mdy';
  }
  return 'dmy';
}

/* ------------------------------------------------------------- validation --------------- */

export interface ImportSet {
  setNumber: number | null;
  type: 'warmup' | 'working';
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
  rpe: number | null;
  completed: boolean;
}
export interface ImportExercise {
  name: string;
  equipment: string | null;
  sets: ImportSet[];
}
export interface ImportLog {
  /** Id from the file (our export's log_id) — used to skip workouts already in the app. */
  sourceId: string | null;
  name: string;
  date: string;
  startTime: string;
  /** May be earlier than the start: the workout then ended after midnight. */
  endTime: string | null;
  bodyWeightKg: number | null;
  exercises: ImportExercise[];
}
export interface CellError {
  /** Spreadsheet row number (header = row 1). */
  row: number;
  column: string;
  value: string;
  message: string;
}
export interface ImportPreview {
  logs: ImportLog[];
  setCount: number;
  errors: CellError[];
  /** Rows dropped because one of their cells is invalid. */
  skippedRows: number;
}

/** Default start time when the file has none (noon keeps the date stable in any zone). */
export const DEFAULT_START = '12:00';

interface RowOut {
  logKey: string;
  sourceId: string | null;
  name: string;
  date: string;
  start: string;
  end: string | null;
  bw: number | null;
  exOrder: number | null;
  exercise: string;
  equipment: string | null;
  set: ImportSet;
}

/**
 * Checks every mapped cell against the app's formats and ranges (VR-1, VR-2, VR-4) and groups
 * the good rows into workouts → exercises → sets. Rows with a bad cell are reported and left out.
 */
export function buildImport(table: Table, s: ImportSettings, today: string): ImportPreview {
  const errors: CellError[] = [];
  const good: RowOut[] = [];
  let skippedRows = 0;
  const col = (f: ImportField) => s.mapping[f];
  table.rows.forEach((cells, i) => {
    const rowNo = i + 2;
    const rowErrors: CellError[] = [];
    const cell = (f: ImportField) => {
      const c = col(f);
      return c === undefined ? '' : (cells[c] ?? '').trim();
    };
    const fail = (f: ImportField, message: string) =>
      rowErrors.push({ row: rowNo, column: table.headers[col(f)!] ?? f, value: cell(f), message });
    const val = <T>(f: ImportField): T | null => {
      const raw = cell(f);
      if (raw === '') return null;
      const spec = IMPORT_FIELDS.find((x) => x.key === f)!;
      const p = parseValue(spec.kind, raw, f, s);
      if (!p.ok) {
        fail(f, p.message);
        return null;
      }
      return p.value as T;
    };

    let date = '';
    let timeFromDate: string | undefined;
    const rawDate = cell('date');
    if (!rawDate) fail('date', IMPORT_MSG.missing);
    else {
      const d = parseDateCell(rawDate, s.dateOrder);
      if (!d.ok) fail('date', d.message);
      else if (d.value.date > today) fail('date', IMPORT_MSG.futureDate);
      else ({ date, time: timeFromDate } = d.value);
    }
    const clock = (f: 'start_time' | 'end_time') => {
      const raw = cell(f);
      if (!raw) return null;
      const c = parseClockCell(raw);
      if (!c.ok) {
        fail(f, c.message);
        return null;
      }
      return c.value;
    };
    const start = clock('start_time') ?? timeFromDate ?? DEFAULT_START;
    const end = clock('end_time');
    const exercise = cell('exercise');
    if (!exercise) fail('exercise', IMPORT_MSG.missing);
    else if (!validateName(exercise).ok) fail('exercise', IMPORT_MSG.badName);
    const workout = cell('workout');
    if (workout && !validateName(workout).ok) fail('workout', IMPORT_MSG.badName);
    const set: ImportSet = {
      setNumber: val<number>('set_number'),
      type: val<'warmup' | 'working'>('set_type') ?? 'working',
      reps: val<number>('reps'),
      weightKg: val<number>('weight_kg'),
      timeS: val<number>('time_s'),
      distanceKm: val<number>('distance_km'),
      rpe: val<number>('rpe'),
      // history from another app is done work unless the file says otherwise
      completed: val<boolean>('completed') ?? true,
    };
    const bw = val<number>('body_weight_kg');
    const exOrder = val<number>('exercise_order');
    if (rowErrors.length) {
      errors.push(...rowErrors);
      skippedRows++;
      return;
    }
    const sourceId = cell('log_id') || null;
    good.push({
      logKey: sourceId ?? `${date}|${start}|${workout.toLowerCase()}`,
      sourceId,
      name: workout || IMPORT_MSG.defaultWorkoutName,
      date,
      start,
      end,
      bw,
      exOrder,
      exercise,
      equipment: cell('equipment') || null,
      set,
    });
  });
  const logs = groupRows(good);
  return { logs, setCount: good.length, errors, skippedRows };
}

function groupRows(rows: readonly RowOut[]): ImportLog[] {
  const logs = new Map<
    string,
    { log: ImportLog; ex: Map<string, ImportExercise & { order: number; first: number }> }
  >();
  rows.forEach((r, i) => {
    let entry = logs.get(r.logKey);
    if (!entry) {
      entry = {
        log: {
          sourceId: r.sourceId,
          name: r.name,
          date: r.date,
          startTime: r.start,
          endTime: r.end,
          bodyWeightKg: r.bw,
          exercises: [],
        },
        ex: new Map(),
      };
      logs.set(r.logKey, entry);
    }
    entry.log.endTime ??= r.end;
    entry.log.bodyWeightKg ??= r.bw;
    const exKey = `${r.exOrder ?? ''}|${r.exercise.toLowerCase()}`;
    let ex = entry.ex.get(exKey);
    if (!ex) {
      ex = {
        name: r.exercise,
        equipment: r.equipment,
        sets: [],
        order: r.exOrder ?? Infinity,
        first: i,
      };
      entry.ex.set(exKey, ex);
    }
    ex.sets.push(r.set);
  });
  return [...logs.values()].map(({ log, ex }) => ({
    ...log,
    exercises: [...ex.values()]
      .sort((a, b) => a.order - b.order || a.first - b.first)
      .map(({ name, equipment, sets }) => ({ name, equipment, sets: orderSets(sets) })),
  }));
}

/** Warm-ups first, each kind in its set-number order (file order when absent). */
function orderSets(sets: readonly ImportSet[]): ImportSet[] {
  const byKind = (t: ImportSet['type']) =>
    sets
      .map((s, i) => ({ s, i }))
      .filter((x) => x.s.type === t)
      .sort((a, b) => (a.s.setNumber ?? a.i) - (b.s.setNumber ?? b.i) || a.i - b.i)
      .map((x, n) => ({ ...x.s, setNumber: n + 1 }));
  return [...byKind('warmup'), ...byKind('working')];
}

/** Focus of an exercise first seen in an import: the first two metrics its sets record. */
export function inferFocus(sets: readonly ImportSet[]): [FocusMetric, FocusMetric | null] {
  const has: [FocusMetric, boolean][] = [
    ['reps', sets.some((s) => s.reps !== null)],
    ['weight', sets.some((s) => s.weightKg !== null)],
    ['time', sets.some((s) => s.timeS !== null)],
    ['distance', sets.some((s) => s.distanceKm !== null)],
  ];
  const present = has.filter(([, h]) => h).map(([m]) => m);
  if (present.length === 0) return ['reps', 'weight'];
  return [present[0]!, present[1] ?? null];
}

/** Local end of a workout: an end time before the start means it ran past midnight. */
export function endDateKey(log: Pick<ImportLog, 'date' | 'startTime' | 'endTime'>): string | null {
  if (!log.endTime) return null;
  return log.endTime > log.startTime ? log.date : addDaysKey(log.date, 1);
}
