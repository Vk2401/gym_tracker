# Gym Tracker — Delivery Plan

Source of truth: `docs/BRD.md` (v2.0). This plan turns it into a Capacitor app built in
phases. Each phase ends with a gate: its acceptance criteria pass and the device-independence
checklist is green.

## 0. Key decisions

| Topic | Decision | Why |
| --- | --- | --- |
| App type | Capacitor 8 + Ionic React 9 (iOS mode) + React 19 + TypeScript + Vite | One codebase, native iOS look (large titles, swipe, reorder, sheets) out of the box; Android comes almost free later |
| Platform | iOS first (BRD NFR-7); Android project generated and kept building, not released in 1.0 | BRD scope |
| Storage | SQLite (`@capacitor-community/sqlite`), versioned migrations | Durable on-device data (NFR-2/3); WebView storage can be evicted by iOS |
| State | Zustand for UI/session; SQLite is the only persistent store | Simple, fast re-renders for set taps (NFR-1) |
| Business rules | Pure functions in `src/domain/`, unit-tested (≥ 80 %) | BRD §16 coverage target |
| Device settings | Controlled text scale (0.85–1.35), own theme control, no force-dark, portrait lock, fixed 24h + decimal formats | User request + NFR-5/6 |
| Charts | Chart.js, lazy-loaded | Light, works offline |
| Tests | Vitest + Playwright (iPhone viewport), one E2E spec per acceptance criterion | AC-1..AC-20 traceability |
| Build limits | iOS build needs macOS + Xcode (your Mac); container builds web + Android | Linux environment |

## 1. Project skills and guides (done in this commit)

- `CLAUDE.md` — stack, commands, folder layout, 10 non-negotiable rules.
- `.claude/skills/mobile-frontend/` — design tokens, screen anatomy, components, interaction
  and performance rules, visual checklist.
- `.claude/skills/capacitor-development/` — config, plugin map, SQLite + migrations,
  session durability, native hygiene, builds and device testing.
- `.claude/skills/device-independence/` — font scale, dark mode / force-dark, orientation,
  safe areas, keyboard, clock/locale/time zones, timers, storage, per-screen checklist.

## 2. Phases

### Phase 1 — Foundation setup (next step, waiting for your go)

1. Scaffold Vite + React + TS (strict), add Ionic React (iOS mode), router, tab shell with
   5 tabs and placeholder pages (NAV-1..3).
2. Tooling: ESLint, Prettier, Vitest, Playwright, path aliases, npm scripts, `.gitignore`.
3. Theme: `tokens.css` (light + dark), Ionic variable mapping, bundled Inter font,
   base.css from device-independence §1.
4. Capacitor: `npx cap init`, add iOS + Android platforms, `capacitor.config.ts` baseline,
   core plugins (app, preferences, keyboard, status-bar, splash-screen, haptics, text-zoom).
5. Device-independence native config: portrait lock, Android textZoom 100 + no
   algorithmic darkening, viewport meta, appearance controller, text-scale controller.
6. SQLite: connection, migration runner, `0001_init` with all tables (§4 below), web
   fallback (jeep-sqlite), seed loader for categories + equipment + exercise library.
7. `src/domain/`: formatters (BR-8/9/10), duration (BR-4), unit conversion (BR-9),
   validation (VR-1..4), Epley 1RM, totals (BR-3/12), messages (§14) — with unit tests.
8. CI script (GitHub Actions): lint, typecheck, unit tests, web build.

**Gate 1:** app runs in browser and on Android emulator with 5 tabs, theme switching,
text-scale clamp verified, DB migrates and seeds, domain tests green.

### Phase 2 — Library and templates (Exercises + Workouts)

- Exercises list: alphabetical with numbers first (EX-2), rows (EX-3), search (EX-4),
  virtualised, create custom exercise (EX-5), empty search state with Create "{query}".
- Exercise detail: categories with dots + Add Category (ED-2), Primary/Secondary focus
  pickers (ED-3), equipment (ED-4), note (ED-5), auto-save (ED-6), share (PD-13),
  unique-name validation (VR-1), delete with history kept (VR-9).
- Workouts list: groups collapsible (WO-2), template rows with Last Completed + Next
  Workout totals (WO-3, BR-2/3), search (WO-4), + menu (WO-5), Edit mode reorder / rename /
  swipe-delete (WO-6, PD-5), group delete rules (VR-11), empty state.
- Template detail: note (WT-2), group + colour (WT-3), + menu: Workout of the Day /
  SuperSet / Exercise (WT-4, PD-7/8), prescribed sets per focus (WT-5), Edit mode reorder /
  remove / group into superset (WT-7, PD-6), share text (WT-6).

**Gate 2:** AC-1..AC-5 pass (E2E), checklist green on these screens.

### Phase 3 — Logging and calendar (core value)

- Active session engine: start from template (PD-1), Quick Go! (WO-7, PD-2), Logs + picker
  (PD-3), one active session rule (VR-8), resume banner on all tabs (SS-3).
- Workout log detail: header actions (WL-1), start/end pickers + body weight +
  measurements (WL-2, PD-14), exercise blocks with ··· menu (WL-3, PD-10), focus-driven set
  table (WL-4), pre-filled editable sets + RPE (WL-5), completion toggle (WL-6, PD-15),
  + Add Warmup / + Add Set (WL-7, AC-10), + Add Exercise (WL-8), log gear menu (PD-11),
  share (WL-9).
- Rest timer bar + local notification + haptics/sound (SS-1/2), keep-awake (ST-3).
- Finish flow: unfinished sets prompt (VR-5), empty session (VR-6), summary with duration,
  sets, volume, new PRs, Update Template (SS-4, PD-4); Last Completed update (BR-2).
- Calendar: month grid, logged-day circles, category dots, selected day, Today, collapse
  handle, first-day-of-week setting (LG-1..6, ST-2), day list newest first (LG-7, VR-13),
  open log / new log (LG-8).
- Validation: VR-2/3/4/14/15; restore after force-close (VR-7).

**Gate 3:** AC-6..AC-12, AC-16..AC-18 pass, incl. airplane-mode force-close test on device.

### Phase 4 — Explore, Settings, integrations

- Explore: range selector, Consistency, Volume, Muscle Balance, Exercise Progress, Personal
  Records, Body card, tap point → log (XP-1..8); PR engine (section 7 record types).
- Settings: units with display conversion (ST-1), calendar (ST-2), session (ST-3),
  categories + equipment management (ST-4, VR-10), appearance (ST-7), about (ST-8).
- Data: CSV export via share sheet (ST-6, AC-19), delete all with typed DELETE.
- iOS-native: iCloud backup/restore plugin (ST-6, VR-17), Apple Health plugin (ST-5).
- Analytics opt-in (§15) and crash reporting without personal data (§16).

**Gate 4:** AC-13..AC-15, AC-19, AC-20 pass; backup → restore verified on device.

### Phase 5 — Hardening and release

- Full device-independence matrix on real devices (small + large iPhone, two iOS versions).
- VoiceOver + Dynamic Type audit (NFR-5), performance pass (NFR-1: < 1 s screens,
  < 200 ms set tap), migration test on copy of previous data.
- App icon, splash, store listing assets, privacy policy, TestFlight beta, phased release
  (BRD §16 release gates).

## 3. Folder structure

See `CLAUDE.md` → Folder layout.

## 4. Database schema (migration 0001)

| Table | Columns (main) |
| --- | --- |
| `workout_group` | id, name, color, sort_order, expanded, is_default |
| `workout_template` | id, group_id, name, note, last_completed_utc, sort_order |
| `template_item` | id, template_id, kind (exercise/superset/wod), exercise_id, superset_id, wod_title, wod_description, sort_order |
| `template_set` | id, template_item_id, set_number, type (warmup/working), reps, weight_kg, time_s, distance_km |
| `exercise` | id, name, primary_focus, secondary_focus, equipment_id, note, is_custom, deleted_at |
| `category` | id, name, color |
| `exercise_category` | exercise_id, category_id |
| `equipment` | id, name |
| `workout_log` | id, template_id, name, start_utc, start_offset_min, end_utc, end_offset_min, body_weight_kg, rest_time_s, created_at |
| `logged_exercise` | id, log_id, exercise_id, name_snapshot, primary_focus_snapshot, secondary_focus_snapshot, equipment_snapshot, categories_snapshot, superset_group, session_note, sort_order |
| `log_set` | id, logged_exercise_id, set_number, type, reps, weight_kg, time_s, distance_km, rpe, completed, completed_at |
| `measurement` | id, log_id, type, value, unit |
| `personal_record` | id, exercise_id, record_type, value, reps, achieved_utc, log_set_id |
| `preferences` | single row: weight_unit, distance_unit, week_start, show_dots, rest_s, sound, haptics, keep_awake, appearance, health_enabled, analytics_opt_in |
| `active_session` | single row: log_id, rest_end_utc, current_logged_exercise_id |

## 5. Requirement → phase map

| Area | IDs | Phase |
| --- | --- | --- |
| Navigation | NAV-1..4 | 1 (shell), 2–3 (FABs) |
| Workouts / templates | WO-1..7, WT-1..7, PD-5..8 | 2 (WO-7 in 3) |
| Exercises | EX-1..5, ED-1..6 | 2 |
| Logs / sessions | LG-1..8, WL-1..9, SS-1..4, PD-1..4, PD-9..15 | 3 |
| Explore | XP-1..8 | 4 |
| Settings | ST-1..8 | 4 (ST-2/3 basics in 3) |
| Business rules | BR-1..13 | 1 (domain), applied 2–4 |
| Validation | VR-1..17 | 2–4 as screens arrive |
| Non-functional | NFR-1..8 | every phase; audited in 5 |
| Acceptance | AC-1..20 | gates 2–4 |

## 6. Open points to confirm with you

1. App id `com.webronian.gymtracker` and display name `Gym Tracker` — OK?
2. Brand blue `#1e7bf2` is estimated from the description; share the screenshots or the
   exact hex if you have them.
3. Android: keep it buildable only (BRD), or also test/release it alongside iOS?
