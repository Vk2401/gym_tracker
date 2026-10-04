# Gym Tracker — Project Guide for Claude

A mobile strength-training tracker (workout templates, exercise library, calendar logs,
progress analytics) built as a **Capacitor** app. The source of truth for every behaviour is
`docs/BRD.md`; the delivery plan is `docs/PLAN.md`.

## Read before working

| When you are… | Load |
| --- | --- |
| Building or changing any screen, component, style or interaction | `.claude/skills/mobile-frontend/SKILL.md` |
| Touching `capacitor.config.ts`, `ios/`, `android/`, a native plugin, storage, notifications, builds | `.claude/skills/capacitor-development/SKILL.md` |
| Anything involving fonts, sizing, theme, viewport, orientation, keyboard, locale, time or OS settings | `.claude/skills/device-independence/SKILL.md` |

The device-independence rules are **mandatory for every UI change** — a screen is not done
until it passes that skill's checklist.

## Stack

| Layer | Choice |
| --- | --- |
| Native shell | Capacitor 8 (iOS primary per BRD NFR-7; Android project kept buildable) |
| UI framework | React 19 + TypeScript (strict) + Ionic React (iOS mode forced) |
| Build | Vite |
| Routing | Ionic React Router (tabs + stacked detail pages) |
| State | Zustand (UI/session state) — persistent data lives only in SQLite |
| Storage | SQLite via `@capacitor-community/sqlite` (jeep-sqlite on web dev) |
| Dates | date-fns (+ date-fns-tz for VR-15) |
| Charts | Chart.js (via react-chartjs-2) |
| Tests | Vitest (domain + repositories), Playwright (web E2E for acceptance criteria) |
| Lint/format | ESLint + Prettier |

## Commands

```bash
npm run dev            # Vite dev server (web, uses jeep-sqlite)
npm run build          # type-check + production web build into dist/
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright acceptance tests (web, iPhone viewport)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npx cap sync           # copy dist/ + plugins into ios/ and android/
npx cap open ios       # open Xcode (macOS only)
npx cap run android    # build + run on Android device/emulator
```

Always run `npm run lint && npm run typecheck && npm run test` before committing.
iOS native builds need macOS + Xcode; this Linux container can only build web + Android.

## Folder layout

```
src/
  app/            App shell, tab bar, router, providers, rest-timer bar, resume banner
  features/
    workouts/     Workouts list, template detail (WO-*, WT-*)
    exercises/    Exercise list + detail (EX-*, ED-*)
    logs/         Calendar + workout log detail (LG-*, WL-*)
    session/      Active session, rest timer, finish summary (SS-*, PD-1..4)
    explore/      Progress dashboard (XP-*)
    settings/     Settings screens (ST-*)
  components/     Shared presentational components (no data access)
  domain/         Pure TypeScript business rules: calculations, validation, formatting
  db/             SQLite connection, versioned migrations, repositories
  native/         The ONLY place that imports @capacitor/* plugins (thin typed wrappers)
  store/          Zustand stores
  theme/          tokens.css, ionic overrides, fonts
  seed/           Pre-loaded exercise library + categories
tests/e2e/        Playwright specs named after acceptance criteria (ac-01.spec.ts …)
docs/             BRD.md, PLAN.md
```

## Non-negotiable rules

1. **BRD traceability.** Reference requirement IDs (WO-3, BR-4, VR-2, AC-7 …) in commit
   messages, test names and short code comments where a rule is implemented. Never invent
   behaviour the BRD does not specify — check section 12 (Product decisions) first.
2. **Business rules live in `src/domain/`** as pure functions with unit tests. Components
   never compute durations, totals, volume, 1RM, unit conversions or formats inline.
   Target ≥ 80 % coverage on `src/domain/` (BRD §16).
3. **Storage is metric + UTC** (BR-9, VR-15). Convert only at display time via domain
   formatters. Store timestamps as UTC ISO strings plus the original offset in minutes.
4. **Save immediately** (NFR-3). Every edit writes to SQLite at once (debounce text fields
   ≤ 300 ms); there is no "Save" button for data. Active session state is persisted so it
   survives a force-close (VR-7, AC-12).
5. **Offline only** (NFR-2). No runtime network calls; fonts, icons and seed data are bundled.
6. **Native access only through `src/native/`.** Components and stores call wrappers that
   also provide a web fallback, so the app runs in the browser for development and E2E.
7. **Device settings must not break the app** — follow the device-independence skill
   (controlled text scaling, own theme control, no WebView force-dark, portrait lock,
   safe areas, fixed 24-hour and decimal formats, locale-tolerant number input).
8. **Exact copy.** Empty states and messages use the wording in BRD §14 verbatim; keep all
   user-facing strings in `src/domain/messages.ts`.
9. **Schema changes are additive** and go through a new numbered migration in
   `src/db/migrations/`; never edit a shipped migration.
10. **Accessibility.** Tap targets ≥ 44 × 44 pt, every icon button has an `aria-label`.

## Git

- Work on the assigned feature branch; small commits, message format:
  `feat(logs): calendar category dots (LG-4, BR-6)`.
- Never commit `dist/`, `node_modules/`, `ios/App/Pods`, `android/.gradle`, signing files
  or `.env*`.
