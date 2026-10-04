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
export const MSG_EXTRA = {
  nameLength: 'Enter a name between 1 and 60 characters.',
  duplicateCategory: (name: string) => `A category called "${name}" already exists.`,
  sessionTooLong: 'A workout can last at most 24 hours.',
  backupReminder: (n: number) =>
    `You've logged ${n} workouts since your last backup. Back up now so you don't lose your history.`,
  emptySession: 'Complete at least one set to save this workout.',
  noWorkoutsMatch: (q: string) => `No workouts match "${q}".`,
  workoutInProgress: 'A workout is in progress',
  resumeOrFinish: 'Resume the current workout, or finish it before starting a new one.',
} as const;
