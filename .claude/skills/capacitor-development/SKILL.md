---
name: capacitor-development
description: How to build, configure and extend the Gym Tracker Capacitor 8 app — project setup, capacitor.config.ts, native iOS/Android projects, plugin choices and wrappers, SQLite storage and migrations, app lifecycle and session restore, local notifications, share/export, builds and device testing. Load before touching native code, plugins, storage, builds or release tasks.
---

# Capacitor Development — Gym Tracker

## 1. Versions and setup

- Capacitor **8.x**, Ionic React **9.x**, React 19, Vite. Check `npm view <pkg> version`
  before adding a package and keep all `@capacitor/*` packages on the same major.
- Node 22+. iOS: Xcode (latest stable) on macOS, iOS deployment target = previous major
  iOS (NFR-7). Android: Android Studio, minSdk per Capacitor 8 default.
- App id: `com.webronian.gymtracker`, app name: `Gym Tracker` (confirm with product owner
  before first store upload — app id cannot change after release).

## 2. capacitor.config.ts (baseline)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.webronian.gymtracker',
  appName: 'Gym Tracker',
  webDir: 'dist',
  ios: {
    contentInset: 'never',          // we handle safe areas in CSS
    scrollEnabled: true,
    allowsLinkPreview: false,
    backgroundColor: '#f2f2f7',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true only in debug builds via env
    backgroundColor: '#f2f2f7',
  },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#1e7bf2', showSpinner: false },
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
    StatusBar: { overlaysWebView: true, style: 'LIGHT' },
    LocalNotifications: { iconColor: '#1e7bf2' },
    CapacitorSQLite: { iosIsEncryption: false, androidIsEncryption: false },
  },
};
export default config;
```

No `server.url` in committed config. For live reload use
`npx cap run ios --live-reload --host <lan-ip>` locally only.

## 3. Plugins (one wrapper each in `src/native/`)

| Need (BRD) | Plugin | Wrapper |
| --- | --- | --- |
| Persistent data (NFR-2/3) | `@capacitor-community/sqlite` (+ `jeep-sqlite` web) | `native/sqlite.ts` |
| Small prefs bootstrap (theme before DB opens) | `@capacitor/preferences` | `native/prefs.ts` |
| Rest timer alerts (SS-2, AC-16) | `@capacitor/local-notifications` | `native/notifications.ts` |
| Haptics (ST-3) | `@capacitor/haptics` | `native/haptics.ts` |
| Keep screen awake (ST-3) | `@capacitor-community/keep-awake` | `native/keepAwake.ts` |
| Share text / files (WT-6, WL-9, PD-13, ST-6) | `@capacitor/share` + `@capacitor/filesystem` | `native/share.ts` |
| Lifecycle / back button / resume (VR-7) | `@capacitor/app` | `native/lifecycle.ts` |
| Status bar colour per theme | `@capacitor/status-bar` | `native/statusBar.ts` |
| Keyboard behaviour | `@capacitor/keyboard` | `native/keyboard.ts` |
| Splash | `@capacitor/splash-screen` | `native/splash.ts` |
| Controlled text scale (device-independence) | `@capacitor/text-zoom` | `native/textZoom.ts` |
| Device/app info for About (ST-8) | `@capacitor/device`, `@capacitor/app` | `native/device.ts` |
| Rate app (ST-8) | `@capacitor-community/in-app-review` (evaluate) | `native/review.ts` |
| Apple Health (ST-5) — phase 4 | evaluate maintained HealthKit plugin for Cap 8, else custom Swift plugin | `native/health.ts` |
| iCloud backup/restore (ST-6) — phase 4 | custom Swift plugin writing to the app's iCloud ubiquity container | `native/backup.ts` |

Wrapper rules:
- Export plain async functions with typed results; check `Capacitor.isNativePlatform()` and
  provide a web fallback (e.g. `navigator.share` / download, `setTimeout` for notifications).
- Request permissions **only when first needed** (BRD §16 permission prompts): notification
  permission on the first rest timer, Health on enabling ST-5.
- Never import `@capacitor/*` outside `src/native/`.

## 4. Data layer (SQLite)

- One connection, opened at boot in `db/connection.ts`; `PRAGMA foreign_keys = ON`,
  `PRAGMA journal_mode = WAL` on native.
- Migrations: `db/migrations/0001_init.ts`, `0002_…` each `{ version, up: string[] }`; run in
  a transaction, track `PRAGMA user_version`. Additive only (BRD §16 rollback). Snapshot the
  DB file before running migrations on upgrade (risk table, BRD §17).
- Repositories (`db/repos/*.ts`) are the only code that writes SQL; they return domain types.
- Ids: UUID v4 strings. Timestamps: `*_utc TEXT` (ISO) + `*_offset_min INTEGER` (VR-15).
- Weights in kg, distance in km, time in seconds (BR-9).
- Logged exercises store a **snapshot** of exercise name, focus and equipment so deleting or
  editing an exercise never changes history (BR-13, VR-9, AC-20).
- On web dev: `jeep-sqlite` custom element + `saveToStore` after writes; this path is for
  development/E2E only.

Tables (initial migration): `workout_group`, `workout_template`, `template_item`
(exercise | superset | wod, order), `template_set`, `exercise`, `category`,
`exercise_category`, `equipment`, `workout_log`, `logged_exercise`, `log_set`,
`measurement`, `personal_record`, `preferences` (single row), `active_session` (≤ 1 row).

## 5. Session durability (NFR-3, VR-7, AC-12)

- Every set edit / completion is written immediately (await the write after the optimistic
  UI update; on failure revert and toast).
- `active_session` holds log id, rest timer **end timestamp** (not remaining seconds) and
  current exercise. On `App.addListener('resume')` and cold start, restore the session and
  recompute the timer from the timestamp.
- Rest timer: schedule a local notification at `endAt` when a working set completes; cancel
  / reschedule on +15 / −15 / Skip; foreground uses the in-app bar and haptic instead.

## 6. Native project hygiene

- `ios/` and `android/` are committed (they hold our native config); ignore Pods, build
  folders, `.gradle`, `local.properties`, signing assets.
- After changing plugins or web build: `npm run build && npx cap sync`.
- iOS `Info.plist`: portrait only, usage strings for Health (phase 4), no unused
  permission strings (App Review rejects them). `ITSAppUsesNonExemptEncryption = NO`.
- Android `AndroidManifest.xml`: `screenOrientation="portrait"`, POST_NOTIFICATIONS,
  SCHEDULE_EXACT_ALARM only if needed for the rest timer accuracy.
- Device-independence native settings live in the skill of that name — apply them in the
  same PR that generates the native projects.

## 7. Builds and testing

- Web: `npm run build` must pass with zero TS errors.
- Device test matrix: smallest supported iPhone (SE-size, 320–375 pt width) and a Pro Max
  (430 pt), current + previous iOS; one mid-range Android when Android is in scope.
- Before each TestFlight build: run AC-1..AC-20 checklist, airplane-mode force-close test
  (AC-12), background rest-timer notification test (AC-16).
- Versioning: semver in `package.json`; `CFBundleShortVersionString` = version,
  build number incremented every upload (BRD §16).
- Debugging: Safari Web Inspector (iOS), `chrome://inspect` (Android).
