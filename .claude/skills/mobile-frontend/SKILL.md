---
name: mobile-frontend
description: Design system and UI rules for the Gym Tracker Capacitor app (Ionic React, iOS look). Load before building or changing any screen, component, style, list, form, sheet, chart or interaction, so every screen is visually consistent, fast to use one-handed mid-workout and matches BRD NFR-4..6.
---

# Mobile Frontend — Gym Tracker

The app must feel like a native iOS app, be usable with one sweaty hand between sets, and
match the BRD reference screens (brand-blue header, light grey grouped backgrounds, white
rows). Read `.claude/skills/device-independence/SKILL.md` alongside this skill.

## 1. Foundations

**Ionic in iOS mode everywhere** — set once in `src/app/setupIonic.ts`:

```ts
setupIonicReact({ mode: 'ios', swipeBackEnabled: true, animated: true });
```

Never mix `md` mode components. Use Ionic primitives (`IonPage`, `IonHeader`, `IonToolbar`,
`IonContent`, `IonList`, `IonItem`, `IonItemSliding`, `IonReorderGroup`, `IonFab`,
`IonActionSheet`, `IonModal` sheets, `IonAlert`, `IonDatetime`) before writing custom ones.

**Design tokens** live in `src/theme/tokens.css`. Components use tokens only — no raw hex,
no raw px font sizes.

```css
:root {
  /* brand */
  --gt-blue: #1e7bf2;           /* header bar, active tab, completed set, accents */
  --gt-blue-strong: #0b5ed7;    /* selected calendar date (LG-5) */
  --gt-blue-tint: #e6f0fe;
  /* surfaces (light) */
  --gt-bg-grouped: #f2f2f7;     /* section background */
  --gt-surface: #ffffff;        /* content rows */
  --gt-separator: #c6c6c8;
  --gt-text: #111111;
  --gt-text-secondary: #6b6b70;
  --gt-danger: #e5383b;
  --gt-success: #22a06b;
  /* spacing scale (4-pt grid) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;
  /* radius */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-pill: 999px;
  /* type scale — rem based, so the controlled text scale applies (device-independence §2) */
  --fs-caption: 0.75rem;   /* 12 */
  --fs-footnote: 0.8125rem;/* 13 – section headers (NOTE, SETTINGS…) */
  --fs-body: 1.0625rem;    /* 17 – rows, inputs */
  --fs-headline: 1.0625rem;/* 17 semibold */
  --fs-title: 1.375rem;    /* 22 */
  --fs-large-title: 2.125rem; /* 34 – collapsing large titles */
  --tap-min: 44px;
}
```

Dark palette is defined under `[data-theme='dark']` (set by our appearance controller, never
by the OS directly — see device-independence §3). Map tokens onto Ionic variables
(`--ion-color-primary`, `--ion-background-color`, `--ion-item-background` …) in
`src/theme/ionic.css`.

**Typography:** bundled Inter (variable, woff2, in `src/theme/fonts/`) with
`font-variant-numeric: tabular-nums` on every numeric cell so set tables don't jitter.

**Icons:** `ionicons` (bundled, iOS outline variants). Icon-only buttons always get
`aria-label`.

## 2. Screen anatomy (matches BRD §5)

- **Header:** brand-blue `IonToolbar` with white text/icons, collapsible large title
  (`<IonHeader collapse="condense">`) on root screens. Root controls exactly as BRD:
  Workouts = Quick Go! (left) + Edit (right) + search; Logs = Today (left) + gear (right).
- **Detail screens:** back button text = parent name (`defaultHref` + `text="Workouts"`),
  share icon + Edit on the right (WT-1, ED-1, WL-1).
- **Content:** `IonList inset` groups on `--gt-bg-grouped`, uppercase footnote section
  headers (NOTE, SETTINGS, CATEGORIES, FOCUS).
- **Tab bar:** 5 tabs (Workouts, Exercises, Logs, Explore, Settings), icon + label, active =
  `--gt-blue`, inactive = grey, visible on root AND detail screens (NAV-1/2).
- **FAB:** `IonFab vertical="bottom" horizontal="end"` + button opens an `IonActionSheet`
  with the BRD menu items (WO-5, WT-4, EX-5, LG-8). Content gets bottom padding so the FAB
  never hides the last row.
- **Global bars above the tab bar** (order bottom→top): tab bar, rest-timer bar (SS-1),
  resume banner (SS-3), Start Workout button on template detail (PD-1). Build them once in
  `src/app/` and reserve their height with a CSS variable `--gt-bottom-stack`.

## 3. Key components (build once in `src/components/`)

| Component | Notes |
| --- | --- |
| `ListRow` | Title, up to 2 secondary lines, trailing chevron; min-height 44px; truncates with ellipsis (VR-16) |
| `GroupHeader` | Collapsible workout group (WO-2): name + rotating chevron, state persisted |
| `SearchBar` | `IonSearchbar` iOS style, filters as you type, debounced 100 ms (WO-4, EX-4) |
| `SetTable` | Columns derived from focus via `domain/setColumns.ts` (WL-4, BR-7). Row = set # (or **W** for warm-up, PD-9), value inputs, RPE placeholder, completion control |
| `SetCompleteButton` | 44×44 target; empty blue-outlined circle / filled blue circle with white check (PD-15); fires light haptic; state change must render < 200 ms (NFR-1) — optimistic UI, write to DB after |
| `NumberField` | `inputmode="decimal"`, select-all on focus, locale-tolerant parsing (device-independence §7), inline range error from `domain/validation.ts` (VR-2) |
| `TimeField` | HH:MM:SS segmented input (BR-8) |
| `CategoryDot` | 8px dot in category colour; used in lists, detail, calendar (ED-2, LG-4) |
| `MonthCalendar` | Custom (not IonDatetime): Sun–Sat or Mon–Sun per ST-2, filled blue circles for logged days, darker selected day, dots row, collapse handle (LG-2..6) |
| `EmptyState` | Icon, BRD §14 message, single primary action |
| `ConfirmDelete` | `IonAlert` with `Delete "{name}"? This can't be undone.` |
| `RestTimerBar` | Countdown from stored end-timestamp, +15 s / −15 s / Skip (SS-1) |
| `NoteField` | Auto-growing textarea; collapsed view truncates to 3 lines + More (VR-16) |

## 4. Interaction rules

- **One-tap logging:** values pre-filled (BO-2); completing a set is a single tap on the
  circle; never require opening a modal to log a normal set.
- **Inputs mid-session:** numeric keyboard, select-all on focus, Enter/Next moves to the
  next field in the row, then the next row.
- **Feedback:** light haptic on set completion, success haptic on finishing a session,
  warning haptic on validation error (respect the ST-3 haptics toggle via `native/haptics`).
- **Destructive actions** always confirm (BRD §13); swipe-left to delete in edit modes
  (PD-5, PD-6).
- **Edit modes:** `IonReorderGroup` drag handles; tapping a name renames inline.
- **Sheets over pages** for pickers (equipment, group, focus, template picker PD-3): use
  `IonModal` with `breakpoints={[0, 0.5, 1]}`.
- **Auto-save** everywhere (ED-6, NFR-3) — no Save buttons on data screens; show nothing or
  a subtle "Saved" only if the user would otherwise be unsure.
- **Validation inline** as the user types; invalid values are never written (BRD §13).
- **Motion:** keep Ionic's native transitions; custom animations ≤ 250 ms, use
  `transform`/`opacity` only, disable under `prefers-reduced-motion`.

## 5. Visual quality checklist (every screen)

- [ ] Uses tokens only; looks right in light and dark.
- [ ] Every tappable element ≥ 44×44 px; spacing on the 4-pt grid.
- [ ] Long names truncate with ellipsis; notes clamp at 3 lines with More.
- [ ] Empty state present with exact BRD §14 copy.
- [ ] Numbers use tabular figures and BR-8 formatting (via `domain/format.ts`).
- [ ] Last row is not hidden behind FAB / bottom stack / home indicator.
- [ ] Icon buttons have `aria-label`; headings use real heading elements.
- [ ] Verified at 320 px, 390 px and 430 px widths and at text scale 0.85× and 1.35×
      (device-independence checklist).
- [ ] No layout shift when the keyboard opens on a set row.

## 6. Performance rules (NFR-1)

- Screens open < 1 s: load list data with one query per screen, no N+1.
- Virtualise lists over ~100 rows (exercise library) — `react-virtuoso`.
- Memoise `SetTable` rows; completing one set must re-render only that row.
- Charts load lazily (`React.lazy`) on the Explore tab only.
- No images at runtime other than bundled SVG/icons.
