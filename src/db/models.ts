import type { FocusMetric, SetType } from '@/domain/types';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Equipment {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  primary: FocusMetric;
  secondary: FocusMetric | null;
  equipmentId: string | null;
  equipmentName: string | null;
  note: string;
  /** ED-7: tutorial web link (YouTube or any site); '' when none. */
  tutorialUrl: string;
  isCustom: boolean;
  /** VR-9: soft-deleted exercises stay readable for history. */
  deleted: boolean;
  categories: Category[];
}

export interface WorkoutGroup {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  expanded: boolean;
  isDefault: boolean;
}

export interface TemplateSummary {
  id: string;
  groupId: string;
  name: string;
  sortOrder: number;
  /** BR-2: start of the most recent finished log created from it. */
  lastCompletedUtc: string | null;
  lastCompletedOffsetMin: number | null;
  exercises: number;
  sets: number;
  reps: number;
}

export interface SetRow {
  id: string;
  setNumber: number;
  type: SetType;
  reps: number | null;
  weightKg: number | null;
  timeS: number | null;
  distanceKm: number | null;
}

export interface LogSetRow extends SetRow {
  rpe: number | null;
  completed: boolean;
}

export interface TemplateExerciseItem {
  id: string;
  kind: 'exercise';
  sortOrder: number;
  supersetGroup: string | null;
  exercise: Exercise;
  sets: SetRow[];
}

export interface TemplateWodItem {
  id: string;
  kind: 'wod';
  sortOrder: number;
  supersetGroup: null;
  title: string;
  description: string;
}

export type TemplateItem = TemplateExerciseItem | TemplateWodItem;

export interface TemplateDetail {
  id: string;
  name: string;
  note: string;
  group: WorkoutGroup;
  items: TemplateItem[];
}

export interface LoggedExercise {
  id: string;
  kind: 'exercise' | 'wod';
  exerciseId: string | null;
  name: string;
  primary: FocusMetric;
  secondary: FocusMetric | null;
  equipment: string | null;
  /** Current instructions of the library exercise (ED-5); null when deleted. */
  exerciseNote: string | null;
  /** ED-7: tutorial link of the library exercise; null when none or deleted. */
  exerciseTutorialUrl: string | null;
  sessionNote: string;
  categories: Category[];
  supersetGroup: string | null;
  sortOrder: number;
  wodTitle: string | null;
  wodDescription: string | null;
  wodResultS: number | null;
  sets: LogSetRow[];
}

export interface WorkoutLog {
  id: string;
  templateId: string | null;
  name: string;
  startUtc: string;
  startOffsetMin: number;
  startDateKey: string;
  endUtc: string | null;
  endOffsetMin: number | null;
  bodyWeightKg: number | null;
  restTimeS: number | null;
  measurements: Record<string, number>;
  exercises: LoggedExercise[];
}

export interface LogCard {
  id: string;
  name: string;
  startUtc: string;
  startOffsetMin: number;
  endUtc: string | null;
  exercises: number;
}

export interface ActiveSession {
  logId: string;
  restEndUtc: string | null;
}
