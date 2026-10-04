import type { Migration } from './index';

// Initial schema (PLAN §4). Values are metric (kg, km, seconds); timestamps are UTC ISO
// strings plus the original offset in minutes (BR-9, VR-15). Shipped migrations are never
// edited — add a new numbered file instead (CLAUDE.md rule 9).
export const m0001: Migration = {
  version: 1,
  up: [
    `CREATE TABLE workout_group (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      expanded INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE workout_template (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES workout_group(id),
      name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      last_completed_utc TEXT,
      last_completed_offset_min INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX category_name_uq ON category(name COLLATE NOCASE)`,
    `CREATE TABLE equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX equipment_name_uq ON equipment(name COLLATE NOCASE)`,
    `CREATE TABLE exercise (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_focus TEXT NOT NULL CHECK (primary_focus IN ('reps','weight','time','distance')),
      secondary_focus TEXT CHECK (secondary_focus IN ('reps','weight','time','distance')),
      equipment_id TEXT REFERENCES equipment(id),
      note TEXT NOT NULL DEFAULT '',
      is_custom INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    )`,
    `CREATE INDEX exercise_name_idx ON exercise(name COLLATE NOCASE)`,
    `CREATE TABLE exercise_category (
      exercise_id TEXT NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      PRIMARY KEY (exercise_id, category_id)
    )`,
    `CREATE TABLE template_item (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_template(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('exercise','wod')),
      exercise_id TEXT REFERENCES exercise(id),
      superset_group TEXT,
      wod_title TEXT,
      wod_description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX template_item_template_idx ON template_item(template_id, sort_order)`,
    `CREATE TABLE template_set (
      id TEXT PRIMARY KEY,
      template_item_id TEXT NOT NULL REFERENCES template_item(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('warmup','working')),
      reps INTEGER,
      weight_kg REAL,
      time_s INTEGER,
      distance_km REAL
    )`,
    `CREATE INDEX template_set_item_idx ON template_set(template_item_id, set_number)`,
    `CREATE TABLE workout_log (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      name TEXT NOT NULL,
      start_utc TEXT NOT NULL,
      start_offset_min INTEGER NOT NULL,
      start_date_local TEXT NOT NULL,
      end_utc TEXT,
      end_offset_min INTEGER,
      body_weight_kg REAL,
      rest_time_s INTEGER,
      wod_result_s INTEGER,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX workout_log_date_idx ON workout_log(start_date_local)`,
    `CREATE INDEX workout_log_template_idx ON workout_log(template_id, start_utc)`,
    `CREATE TABLE logged_exercise (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES workout_log(id) ON DELETE CASCADE,
      exercise_id TEXT,
      name_snapshot TEXT NOT NULL,
      primary_focus_snapshot TEXT NOT NULL,
      secondary_focus_snapshot TEXT,
      equipment_snapshot TEXT,
      categories_snapshot TEXT NOT NULL DEFAULT '[]',
      superset_group TEXT,
      session_note TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX logged_exercise_log_idx ON logged_exercise(log_id, sort_order)`,
    `CREATE TABLE log_set (
      id TEXT PRIMARY KEY,
      logged_exercise_id TEXT NOT NULL REFERENCES logged_exercise(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('warmup','working')),
      reps INTEGER,
      weight_kg REAL,
      time_s INTEGER,
      distance_km REAL,
      rpe REAL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    )`,
    `CREATE INDEX log_set_ex_idx ON log_set(logged_exercise_id, set_number)`,
    `CREATE TABLE measurement (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES workout_log(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL
    )`,
    `CREATE TABLE personal_record (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      record_type TEXT NOT NULL,
      value REAL NOT NULL,
      reps INTEGER,
      achieved_utc TEXT NOT NULL,
      log_set_id TEXT
    )`,
    `CREATE INDEX personal_record_ex_idx ON personal_record(exercise_id, record_type)`,
    `CREATE TABLE preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_unit TEXT NOT NULL DEFAULT 'kg',
      distance_unit TEXT NOT NULL DEFAULT 'km',
      week_start TEXT NOT NULL DEFAULT 'sun',
      show_dots INTEGER NOT NULL DEFAULT 1,
      rest_s INTEGER NOT NULL DEFAULT 90,
      sound INTEGER NOT NULL DEFAULT 1,
      haptics INTEGER NOT NULL DEFAULT 1,
      keep_awake INTEGER NOT NULL DEFAULT 1,
      appearance TEXT NOT NULL DEFAULT 'system',
      health_enabled INTEGER NOT NULL DEFAULT 0,
      analytics_opt_in INTEGER
    )`,
    `INSERT INTO preferences (id) VALUES (1)`,
    `CREATE TABLE active_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      log_id TEXT NOT NULL REFERENCES workout_log(id) ON DELETE CASCADE,
      rest_end_utc TEXT,
      current_logged_exercise_id TEXT
    )`,
  ],
};
