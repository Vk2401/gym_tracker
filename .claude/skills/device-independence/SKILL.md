---
name: device-independence
description: Rules that stop phone/OS settings from breaking the Gym Tracker app — system font size / Dynamic Type, display zoom, dark mode and Android force-dark, bold text, orientation, notch and safe areas, keyboard, 12/24-hour clock, locale decimal separators, time zones, low-power mode, WebView quirks. Load for any UI, styling, input, date/time or native config work; every screen must pass the checklist at the end.
---

# Device Independence — Gym Tracker

Goal: the app looks and behaves the same on every phone regardless of the user's device
settings, **while still honouring accessibility** (BRD NFR-5 requires Dynamic Type). We do
that by taking control: the OS setting is *read*, then applied by us within limits we have
designed and tested — never applied blindly by the WebView.

## 1. Viewport and WebView baseline

`index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
```

Global CSS (`src/theme/base.css`):

```css
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
.ui, ion-item, ion-button, ion-tab-button { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
input, textarea { -webkit-user-select: text; user-select: text; font-size: max(16px, var(--fs-body)); } /* ≥16px stops iOS focus-zoom */
```

## 2. Text size (system font size / Dynamic Type / display zoom)

Problem: Android WebView applies system font scale automatically (can reach 2×) and breaks
set tables; iOS WKWebView ignores Dynamic Type unless we apply it.

Rule: **neutralise the automatic scaling, then apply our own clamped scale.**

1. Android: in `MainActivity.java` set `webView.getSettings().setTextZoom(100)` after bridge
   load so the system font scale is not applied by the WebView.
2. `native/textZoom.ts`: read `TextZoom.getPreferred()` (iOS Dynamic Type / Android font
   scale), clamp to **0.85 – 1.35**, then set
   `document.documentElement.style.setProperty('--gt-text-scale', value)` and
   `html { font-size: calc(16px * var(--gt-text-scale, 1)); }`. Do **not** call
   `TextZoom.set()` (it zooms the whole WebView, including layout).
3. Re-read on `App` `resume` (user may change the setting while app is backgrounded).
4. All font sizes are `rem` via tokens; spacing that must grow with text (row min-height)
   uses `rem`; fixed chrome (tab bar height, icons, FAB) uses `px` so it never overflows.
5. Layouts must survive the max clamp: set tables use `minmax()` grid columns, labels
   truncate with ellipsis, numeric cells never wrap.
6. iOS *Display Zoom* ("Larger Text" screen mode) only changes the CSS viewport width
   (e.g. 320 pt) — handled by testing at 320 px width.

## 3. Dark mode / force-dark / appearance

- The app owns the theme (ST-7: System / Light / Dark). `appearance.ts` resolves the
  setting (System → `matchMedia('(prefers-color-scheme: dark)')` with change listener) and
  sets `data-theme="light|dark"` on `<html>` plus the matching status-bar style.
- Theme preference is read from `@capacitor/preferences` **before first paint** to avoid a
  flash; native splash/background colour matches.
- Android: disable algorithmic darkening — in `styles.xml` app theme add
  `<item name="android:forceDarkAllowed">false</item>`, and in `MainActivity`
  `WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false)` (androidx.webkit).
  Otherwise Samsung/MIUI "dark mode for apps" inverts our colours.
- Every colour comes from tokens with explicit light and dark values; no reliance on
  browser default colours (inputs, scrollbars → set `color-scheme` per theme).
- iOS *Increase Contrast* / *Bold Text*: tokens must keep ≥ 4.5:1 contrast; layouts must
  tolerate bold glyph widths (truncate, don't overflow).

## 4. Orientation and screen geometry

- Portrait only (NFR-7): iOS `UISupportedInterfaceOrientations` = Portrait (iPhone);
  Android `android:screenOrientation="portrait"` on MainActivity.
- Safe areas: header padding `env(safe-area-inset-top)`, tab bar / bottom stack padding
  `env(safe-area-inset-bottom)`; Ionic handles its own components — custom fixed bars must
  add insets themselves. Test with notch, Dynamic Island and home-indicator devices.
- Supported widths 320–440 px; no horizontal scroll at any width.

## 5. Keyboard

- `Keyboard.resize = native`; scroll the focused set input into view
  (`el.scrollIntoView({ block: 'center' })` on `keyboardDidShow`).
- Hide the FAB, rest-timer bar and Start Workout button while the keyboard is open.
- Numeric inputs: `inputmode="decimal"` (weight, distance), `inputmode="numeric"`
  (reps), `enterkeyhint="next"`, `autocomplete="off" autocorrect="off" spellcheck="false"`.

## 6. Clock, dates and time zones

- Times always 24-hour HH:MM regardless of the device's 12/24-hour setting (BR-10).
  Format with date-fns patterns (`HH:mm`, `dd/MM/yy`, `dd MMM yyyy`) using a fixed `enGB`
  locale — never `toLocaleString()` without explicit options.
- First day of week comes from **our** setting ST-2, not the device locale.
- Store UTC + original offset; display in the session's original local time (VR-15).
  A session belongs to its start date (VR-14).
- Durations computed from timestamps (BR-4), never from running counters.
- `IonDatetime` must be given `hourCycle="h23"` and `locale="en-GB"`.

## 7. Numbers and units

- Display: one decimal for weight/distance (BR-8) with `.` as the decimal separator — via
  `domain/format.ts`, never `toLocaleString()`.
- Parsing input: accept both `.` and `,` as decimal separator (EU keyboards show `,`), strip
  spaces, then validate ranges (VR-2).
- Units come from ST-1 only, never from device region.

## 8. Timers, background and power saving

- Rest timer uses an absolute end timestamp; the UI recomputes from `Date.now()` every
  animation frame / 250 ms — Low Power Mode or throttled JS never makes it drift.
- Background alerts rely on scheduled local notifications, not JS timers (SS-2).
- Keep-awake (ST-3) only while a session is active; release on finish/background.
- Respect *Reduce Motion* via `prefers-reduced-motion`; respect our own haptics/sound
  toggles (ST-3), not just the system silent switch.

## 9. Storage and OS cleanup

- Data lives in SQLite in the app's private storage, never only in WebView
  `localStorage`/IndexedDB (iOS may evict WebView storage under pressure).
- Exclude nothing required from iOS device backup; iCloud backup is explicit (ST-6).

## 10. Checklist — every screen / PR

- [ ] Looks correct at text scale **0.85×, 1.0×, 1.35×** (set `--gt-text-scale` in devtools).
- [ ] Android with system font size max + display size max: layout unchanged (textZoom 100).
- [ ] Correct in app Light, Dark and System; Android force-dark does not alter colours.
- [ ] Device in 12-hour mode still shows 24-hour times.
- [ ] Device region with comma decimals: input `62,5` saves as 62.5, displays `62.5`.
- [ ] Widths 320 / 390 / 430 px, no horizontal scroll, safe areas respected.
- [ ] Keyboard open on the last set row: row visible, nothing overlaps it.
- [ ] Rotating the phone does nothing; pinch does not zoom; long-press shows no callout.
- [ ] Rest timer correct after 2 min in background with Low Power Mode on.
