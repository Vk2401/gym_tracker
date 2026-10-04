// BRD §14 — user-facing copy, verbatim. Keep every user-facing string here (CLAUDE.md rule 8).

export const EMPTY = {
  workouts: {
    message: 'No workouts yet. Build your first template to plan your week.',
    action: 'Add Workout Template',
  },
  templateDetail: { message: 'This workout has no exercises.', action: 'Add Exercise' },
  exercisesSearch: (query: string) => ({
    message: `No exercises match "${query}".`,
    action: `Create "${query}"`,
  }),
  logsDay: { message: 'No workouts on this day.', action: 'Log a Workout' },
  explore: {
    message: 'Log your first workout to see your progress here.',
    action: 'Go to Workouts',
  },
  personalRecords: { message: 'Complete a set to set your first record.' },
} as const;

export const MSG = {
  endBeforeStart: 'End time must be after start time.',
  futureStart: "A workout can't start in the future.",
  outOfRange: (min: number | string, max: number | string) =>
    `Enter a value between ${min} and ${max}.`,
  duplicateExercise: (name: string) => `An exercise called "${name}" already exists.`,
  openSetsOnFinish: (n: number) => `You have ${n} unfinished sets. Mark them complete?`,
  deleteConfirm: (name: string) => `Delete "${name}"? This can't be undone.`,
  deleteAllData: 'Type DELETE to erase all workouts, exercises and settings.',
  icloudUnavailable: 'Sign in to iCloud in iOS Settings to back up your data.',
  backupFailed: "Backup didn't finish. Check your iCloud storage and try again.",
  healthDenied: 'Apple Health access is off. Turn it on in iOS Settings > Health.',
} as const;

/** Not in §14; needed for VR-1 length/empty checks and VR-3 max length. */
/** PD-20: device permissions for native features. Not in §14. */
export const PERMISSIONS = {
  section: 'Permissions',
  notifications: 'Notifications',
  notificationsWhy: 'Rest-timer alerts when the app is in the background',
  alarms: 'Alarms & reminders',
  alarmsWhy: 'Lets the rest-timer alert arrive exactly on time',
  keepAwake: 'Keep screen on',
  keepAwakeWhy: 'Screen stays on during a workout — no permission needed',
  granted: 'Allowed',
  prompt: 'Allow',
  blocked: 'Off',
  unavailable: 'Not on this device',
  blockedHelp:
    'Notifications are turned off for Gym Tracker. Turn them on in your phone’s Settings → Apps → Gym Tracker → Notifications.',
  askNotificationsTitle: 'Allow notifications?',
  askNotifications:
    'Gym Tracker alerts you when your rest is over, even when the app is in the background. Nothing else is ever sent.',
  askAlarmsTitle: 'Allow exact alarms?',
  askAlarms:
    'So the rest-timer alert arrives on the second, turn on “Allow setting alarms and reminders” for Gym Tracker on the next screen.',
  notNow: 'Not Now',
  allow: 'Allow',
  openSettings: 'Open Settings',
} as const;

/** PD-19: importing workout history (CSV or JSON). Not in §14. */
export const IMPORT_MSG = {
  title: 'Import Workouts',
  rowLabel: 'Import workouts',
  rowHint: 'CSV or JSON from Gym Tracker or another app',
  matchTitle: 'Match Columns',
  matchIntro:
    "This file's columns don't match Gym Tracker's. Choose which column holds each value; required ones are marked.",
  reviewTitle: 'Review Import',
  notInFile: 'Not in file',
  required: 'Required',
  format: (f: string) => `Format: ${f}`,
  sample: (v: string) => `In your file: ${v}`,
  weightUnit: 'Weights in this file',
  distanceUnit: 'Distances in this file',
  dateOrder: 'Dates like 03/04/2026 are',
  dayMonth: 'Day / Month',
  monthDay: 'Month / Day',
  needField: (f: string) => `Choose the column for ${IMPORT_FIELD_TEXT[f]?.label ?? f}.`,
  needMetric: 'Choose at least one of Reps, Weight, Time or Distance.',
  columnTwice: 'Each file column can be used only once.',
  summary: (logs: number, sets: number) =>
    `${logs} workout${logs === 1 ? '' : 's'} · ${sets} set${sets === 1 ? '' : 's'} ready to import`,
  skipped: (n: number) => `${n} row${n === 1 ? '' : 's'} with problems will be skipped:`,
  moreErrors: (n: number) => `…and ${n} more`,
  changeMatching: 'Change column matching',
  rowError: (row: number, column: string, value: string, message: string) =>
    `Row ${row} · ${column}${value ? ` “${value}”` : ''}: ${message}`,
  nothingValid: 'No rows in this file can be imported.',
  importButton: 'Import',
  done: (imported: number, skipped: number) =>
    `Imported ${imported} workout${imported === 1 ? '' : 's'}` +
    (skipped ? ` · ${skipped} already in the app were skipped.` : '.'),
  newExercises: (n: number) => ` ${n} new exercise${n === 1 ? '' : 's'} added to the library.`,
  unreadable: "This file can't be read. Choose a CSV file or a JSON export.",
  empty: 'This file has no rows to import.',
  isBackup:
    'This is a full Gym Tracker backup. Restore it instead? Restoring replaces all current data.',
  defaultWorkoutName: 'Imported Workout',
  missing: 'value is missing',
  badDate: 'use a date like 2026-10-04 or 04/10/2026',
  futureDate: "a workout can't be in the future",
  badClock: 'use a 24-hour time like 07:30',
  badWhole: 'use a whole number',
  badNumber: 'use a number like 62.5',
  badDuration: 'use seconds (90) or H:MM:SS',
  badSetType: 'use warmup or working',
  badBool: 'use yes or no',
  badName: 'use 1–60 characters',
  badBackup: (table: string, row: number, column: string) =>
    `This backup is damaged: ${table} row ${row} has no ${column}. Nothing was changed.`,
} as const;

/** Column names and the format each must have (shown when matching columns, PD-19). */
export const IMPORT_FIELD_TEXT: Record<string, { label: string; format: string }> = {
  log_id: { label: 'Workout ID', format: 'groups sets into one workout' },
  workout: { label: 'Workout name', format: 'Push Day' },
  date: { label: 'Date', format: '2026-10-04 or 04/10/2026' },
  start_time: { label: 'Start time', format: '07:30 (24-hour)' },
  end_time: { label: 'End time', format: '08:45 (24-hour)' },
  body_weight_kg: { label: 'Body weight', format: '72.5' },
  exercise_order: { label: 'Exercise order', format: '1, 2, 3…' },
  exercise: { label: 'Exercise', format: 'Bench Press' },
  equipment: { label: 'Equipment', format: 'Barbell' },
  set_number: { label: 'Set number', format: '1, 2, 3…' },
  set_type: { label: 'Set type', format: 'warmup or working' },
  reps: { label: 'Reps', format: 'whole number, 0–999' },
  weight_kg: { label: 'Weight', format: '62.5' },
  time_s: { label: 'Time', format: 'seconds or H:MM:SS' },
  distance_km: { label: 'Distance', format: '5.2' },
  rpe: { label: 'RPE', format: '1–10 in halves' },
  completed: { label: 'Completed', format: 'yes or no' },
};

/** ED-7 / PD-18: exercise tutorial link (not in §14). */
export const TUTORIAL = {
  section: 'Tutorial',
  placeholder: 'Paste a YouTube or website link',
  inputLabel: 'Tutorial link',
  open: 'Watch tutorial',
  invalid: 'Enter a web link, for example a YouTube video address.',
} as const;

/** Second lines in the template + menu (design "Add to workout"). */
export const MENU_SUB = {
  addExercise: 'Pick from your exercise library',
  addSuperset: 'Exercises done back to back',
  addWod: 'A timed WOD block',
} as const;

export const MSG_EXTRA = {
  exerciseCount: (n: number) => `${n} exercise${n === 1 ? '' : 's'}`,
  setCount: (n: number) => `${n} set${n === 1 ? '' : 's'}`,
  weekStreak: (n: number) => `${n} week${n === 1 ? '' : 's'}`,
  templateCount: (n: number) => `${n} template${n === 1 ? '' : 's'}`,
  nameLength: 'Enter a name between 1 and 60 characters.',
  duplicateCategory: (name: string) => `A category called "${name}" already exists.`,
  sessionTooLong: 'A workout can last at most 24 hours.',
  backupReminder: (n: number) =>
    `You've logged ${n} workouts since your last backup. Back up now so you don't lose your history.`,
  templateMissing: 'This workout no longer exists.',
  exerciseDeleted: 'This exercise was deleted.',
  logMissing: 'This workout log no longer exists.',
  noHistory: 'No previous sessions.',
  emptySession: 'Complete at least one set to save this workout.',
  noWorkoutsMatch: (q: string) => `No workouts match "${q}".`,
  workoutInProgress: 'A workout is in progress',
  resumeOrFinish: 'Resume the current workout, or finish it before starting a new one.',
} as const;
