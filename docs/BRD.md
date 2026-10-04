# Business Requirements Document – Workout Tracker App

Oct 2, 2026 · @WEBRONIAN

## 1. Document control and purpose

This BRD defines the business requirements for a mobile strength-training tracker that lets a user build workout templates, maintain an exercise library and log completed sessions on a calendar. Requirements for the captured screens trace to the nine reference screenshots; every other behaviour is fixed by the product decisions in section 12, so the document contains no open items.

| Item | Value |
| --- | --- |
| Document type | Business Requirements Document (BRD) |
| Product | Workout Tracker mobile app (iOS) |
| Version | 2.0 (release-ready, for app release 1.0) |
| Source material | 9 app screenshots (Workouts, Workout Template, Exercises, Exercise Detail, Logs, Workout Log) |
| Audience | Product owner, design, engineering, QA |

All requirements in this document are mandatory for release 1.0 unless marked otherwise.

## 2. Executive summary and business objectives

The app gives gym users one place to plan a weekly split, record every set and see their training history at a glance. It targets users who follow a structured programme (for example a six-day split such as Chest, Back Width, Quad, Shoulder, Thickness/Rear Delt and Posterior Chain) and want consistent, fast logging.

| ID | Objective | Measure of success |
| --- | --- | --- |
| BO-1 | Let users plan training as reusable workout templates | User can create, group and edit templates containing exercises, supersets and sets |
| BO-2 | Make set-by-set logging fast during a session | Each set is recorded with prescribed values pre-filled and completed with one tap |
| BO-3 | Give a clear history of training consistency | Calendar shows every logged day and the muscle categories trained that day |
| BO-4 | Provide a structured, searchable exercise library | Each exercise carries focus metrics, equipment, categories and instructions |
| BO-5 | Track session context alongside performance | Each log stores start/end time, duration, body weight and measurements |

## 3. Scope

Release 1.0 covers the five-tab app shell and the full Workouts, Exercises and Logs modules. Explore (progress analytics) and Settings are fully specified in section 6.7.

**In scope**

- Bottom tab navigation: Workouts, Exercises, Logs, Explore, Settings
- Workout groups and workout templates (create, view, edit, search, share)
- Template content: exercises, supersets and Workout of the Day blocks, plus a template note and a colour setting
- Quick Go! entry point to start a session
- Exercise library: list, search, create, view and edit exercises with categories, focus metrics, equipment and notes
- Logs: monthly calendar, per-day session list, session detail with set-level recording
- Session data: start/end date and time, duration, body weight, measurements, sets, warm-up sets, RPE
- Share action on templates, exercises and session logs

**Out of scope for 1.0**

- Android and web versions (planned for a later release)
- Social features, coaching and payments
- Cloud accounts, multi-device sync beyond iCloud backup, and wearable apps

## 4. Stakeholders and user personas

The primary user is a single gym-goer managing their own programme on their own phone.

| Stakeholder | Role | Interest |
| --- | --- | --- |
| Product owner | Owns scope and priorities | Feature fit to business objectives |
| Design | Owns screens and interaction | Consistency with the reference screens |
| Engineering | Builds and maintains the app | Clear, testable requirements |
| QA | Verifies release | Acceptance criteria per requirement |
| End user | Plans and logs training | Fast logging and clear history |

**Persona: Structured lifter.** Trains six days a week on a named split, runs sessions of up to three hours, records reps, load and timed cardio, and tracks body weight alongside training.

## 5. Information architecture and navigation

The app uses a persistent five-tab bottom bar; each tab opens a root screen that drills down into detail screens with a back control labelled with the parent screen name.

| Tab | Root screen | Drill-down screens | Root header controls |
| --- | --- | --- | --- |
| Workouts | Workouts list | Workout template detail | Quick Go! (left), Edit (right), search bar |
| Exercises | Exercises list | Exercise detail | Search bar |
| Logs | Calendar and day list | Workout log detail | Today (left), Settings gear (right) |
| Explore | Explore | To be specified | To be specified |
| Settings | Settings | To be specified | To be specified |

- **NAV-1** The bottom bar is visible on all root and detail screens, with icon and label for each tab.
- **NAV-2** The active tab icon and label are shown in the brand blue; inactive tabs are grey.
- **NAV-3** Detail screens show a back chevron; on Workouts and Exercises detail screens the chevron is followed by the parent screen name.
- **NAV-4** The Workouts, Exercises and Logs root screens and the workout template detail screen offer a floating + button at the bottom right that opens a context menu of create actions.

## 6. Functional requirements

Requirements are grouped by screen; each ID is referenced by the acceptance criteria in section 10.

### 6.1 Workouts list

| ID | Requirement |
| --- | --- |
| WO-1 | The screen shows the title Workouts, a Quick Go! control (top left), an Edit control (top right) and a Search Workouts bar. |
| WO-2 | Templates are displayed inside collapsible workout groups; each group header shows the group name and a chevron that expands or collapses it. |
| WO-3 | Each template row shows the template name, Last Completed date (DD/MM/YY) and a Next Workout summary of exercise, set and rep totals (e.g. 9 Exercises, 30 Sets, 356 Reps), with a chevron to open it. |
| WO-4 | Search filters the visible templates by name as the user types. |
| WO-5 | The + button opens a menu with Add Workout Group and Add Workout Template. |
| WO-6 | Edit puts the list in edit mode to reorder, rename and delete groups and templates. |
| WO-7 | Quick Go! starts a new workout log immediately, without selecting a template. |

### 6.2 Workout template detail

| ID | Requirement |
| --- | --- |
| WT-1 | The screen shows a back control labelled Workouts, a share icon, an Edit control and the template name as the large title. |
| WT-2 | A NOTE section provides a free-text field for template notes. |
| WT-3 | A SETTINGS section shows the template group (e.g. Default) with its colour swatch and a chevron to change it. |
| WT-4 | The + button opens a menu with Add Workout of the Day, Add SuperSet and Add Exercise. |
| WT-5 | Added exercises list their prescribed sets; each set holds the values of the exercise's focus metrics. |
| WT-6 | Share exports the template so it can be sent outside the app. |
| WT-7 | Edit allows the user to rename the template and reorder or remove its exercises and supersets. |

### 6.3 Exercises list

| ID | Requirement |
| --- | --- |
| EX-1 | The screen shows the title Exercises and a Search Exercises bar. |
| EX-2 | Exercises are listed alphabetically; rows starting with a number sort before letters (e.g. 3/4 Sit-Up, 90/90 Hamstring, Ab Crunch Machine). |
| EX-3 | Each row shows the name, Focus (one or two metrics), Equipment and Categories, with a chevron to open it. |
| EX-4 | Search filters exercises by name as the user types. |
| EX-5 | The + button creates a new custom exercise. |

### 6.4 Exercise detail

| ID | Requirement |
| --- | --- |
| ED-1 | The screen shows a back control labelled Exercises, a share icon and the exercise name as the large title. |
| ED-2 | CATEGORIES lists each assigned muscle category with its colour dot; + Add Category assigns another. |
| ED-3 | FOCUS shows Primary Focus and Secondary Focus, each a picker of metrics (Reps, Weight, Time, Distance). |
| ED-4 | SETTINGS shows Equipment (e.g. None, Machine, Barbell, Foam Roll) with a chevron to change it. |
| ED-5 | NOTE shows editable step-by-step exercise instructions. |
| ED-6 | Changes save automatically and are reflected in the Exercises list and in every template and log that uses the exercise. |
| ED-7 | TUTORIAL holds an optional web link (a YouTube video or any website) that teaches the exercise; when set, Watch tutorial opens it outside the app. |

### 6.5 Logs (calendar)

| ID | Requirement |
| --- | --- |
| LG-1 | The screen shows a Today control (top left), the title Logs and a settings gear (top right). |
| LG-2 | A monthly calendar shows the month and year, weekday headers Sun to Sat and every date of the month. |
| LG-3 | Dates with at least one logged workout are shown as filled blue circles; dates without a log are plain numbers. |
| LG-4 | Under each logged date, coloured dots show the muscle categories trained that day, one dot per category in the category colour. |
| LG-5 | The selected date is shown in a darker blue circle; Today selects the current date. |
| LG-6 | A handle under the calendar collapses and expands the month view. |
| LG-7 | Below the calendar, the selected date (DD MMM YYYY) heads a list of that day's logs; each shows the workout name, Completed in X hours Y minutes and Exercises performed N. |
| LG-8 | Tapping a log opens the workout log detail; the + button creates a new log for the selected date. |

### 6.6 Workout log detail

| ID | Requirement |
| --- | --- |
| WL-1 | The header shows a back control, the workout name, a share icon, a settings gear and an Edit control. |
| WL-2 | The summary block shows Start Time and End Time (each a date and a time picker), Weight (body weight) and a Measurements row that opens body measurements. |
| WL-3 | Each exercise block shows the exercise name in capitals, its Equipment, a truncated Note with a More link and a ··· options button. |
| WL-4 | The set table columns follow the exercise focus: SET #, REPS, WEIGHT, RPE for rep-and-load exercises; SET #, TIME (HH:MM:SS), DISTANCE, RPE for timed exercises. |
| WL-5 | Set values are pre-filled from the template and are editable; RPE is optional and shows the placeholder RPE until entered. |
| WL-6 | Each set row has a completion control: an empty circle when not completed and a filled blue icon when completed; tapping toggles the state. |
| WL-7 | Each exercise block offers + Add Warmup and + Add Set. |
| WL-8 | + Add Exercise at the end of the log adds another exercise to the session. |
| WL-9 | Share exports the session log so it can be sent outside the app. |

### 6.7 Explore and Settings

Explore turns logged data into progress views; Settings controls units, session behaviour and data ownership. These screens were not in the reference captures, so they follow the decisions in section 12.

**Explore**

| ID | Requirement |
| --- | --- |
| XP-1 | The Explore tab opens a progress dashboard with a time-range selector: 4 weeks, 3 months, 6 months, 1 year, All. |
| XP-2 | A Consistency card shows workouts per week as a bar chart and the current streak in consecutive weeks with at least one log. |
| XP-3 | A Volume card shows total weekly volume (sum of reps × weight for completed working sets) as a line chart. |
| XP-4 | A Muscle Balance card shows completed working sets per category for the selected range, coloured by category colour. |
| XP-5 | An Exercise Progress view lets the user pick any exercise and see a chart of best set and estimated one-rep max per session, plus a dated history list. |
| XP-6 | A Personal Records list shows, per exercise, the heaviest weight, most reps at a weight, best estimated one-rep max and longest time or distance, with the date achieved. |
| XP-7 | A Body card charts body weight and each tracked measurement over the selected range. |
| XP-8 | Tapping any chart point opens the log it came from. |

**Settings**

| ID | Requirement |
| --- | --- |
| ST-1 | Units: weight in kg or lb, distance in km or mi; switching converts display values without altering stored values. |
| ST-2 | Calendar: first day of the week (Sunday or Monday) and show or hide category dots. |
| ST-3 | Session: default rest time (0 to 10 minutes in 15-second steps), rest-timer sound and haptics on or off, keep screen awake during a session. |
| ST-4 | Library: manage categories (add, rename, recolour, delete) and equipment types (add, rename, delete). |
| ST-5 | Apple Health: optional permission to write completed workouts and read and write body weight. |
| ST-6 | Data: export all data to CSV, back up to and restore from iCloud, and delete all data after a typed confirmation. |
| ST-7 | Appearance: System, Light or Dark. |
| ST-8 | About: app version and build, privacy policy, terms of use, contact support and rate the app. |

**Session tools**

| ID | Requirement |
| --- | --- |
| SS-1 | Completing a working set starts a rest timer with the default rest time; the timer shows as a bar above the tab bar with +15 s, −15 s and Skip. |
| SS-2 | When the timer ends, the app plays the chosen sound and haptic, and sends a local notification if the app is in the background. |
| SS-3 | A session in progress shows a resume banner on every tab until it is finished or discarded. |
| SS-4 | Finishing a session sets End Time to now, saves the log, updates Last Completed and shows a summary with duration, sets, volume and any new personal records. |

## 7. Data model

Seven core entities hold all app data; a workout log is a dated instance of a template's exercises and sets.

| Entity | Key attributes | Relationships |
| --- | --- | --- |
| Workout Group | Name, colour, display order, expanded/collapsed state | Contains many Workout Templates |
| Workout Template | Name, note, group, last completed date, display order | Belongs to one group; contains ordered exercise entries, supersets and Workout of the Day blocks |
| Exercise | Name, primary focus, secondary focus, equipment, note (instructions) | Has many Categories; used by templates and logs |
| Category | Name (e.g. Abdominals (Lower), Hamstrings, Calves, Adductors, Trapezius), colour | Assigned to many Exercises |
| Workout Log | Workout name, start date-time, end date-time, duration, body weight, measurements, source template | Contains ordered logged exercises |
| Logged Exercise | Exercise reference, order, superset link | Belongs to one Workout Log; contains Sets |
| Set | Set number, type (warm-up or working), reps, weight, time (HH:MM:SS), distance, RPE, completed flag | Belongs to one Logged Exercise or template exercise entry |

Focus metric values are: Reps, Weight, Time, Distance. Equipment values include: None, Machine, Barbell, Foam Roll.

**Additional entities for the full release**

| Entity | Key attributes | Relationships |
| --- | --- | --- |
| Measurement | Type (chest, waist, hips, arm, thigh, calf, neck, body fat %), value, unit | Belongs to one Workout Log |
| Personal Record | Exercise, record type (max weight, max reps at weight, estimated 1RM, max time, max distance), value, date achieved | Points to the Set that set it |
| Preferences | Weight unit, distance unit, first day of week, show category dots, default rest time, sound, haptics, keep awake, appearance, Health permissions | One per installation |
| Active Session | Workout Log reference, rest timer end time, current exercise | At most one at a time |

Estimated one-rep max uses the Epley formula, applied only to sets of 1 to 12 reps:

```latex
1RM = w \times \left(1 + \frac{r}{30}\right)
```

where w is weight and r is reps; a 1-rep set returns w.

## 8. Business rules

These rules govern calculations, formats and data consistency across all screens.

| ID | Rule |
| --- | --- |
| BR-1 | Template names are free text chosen by the user; a weekday in a name (e.g. Thursday - Shoulder Lead) is a label only and does not restrict the date a session is logged. |
| BR-2 | Last Completed on a template equals the date of the most recent workout log created from it. |
| BR-3 | Next Workout totals are the counts of exercises, sets and reps currently prescribed in the template. |
| BR-4 | Session duration = End Time minus Start Time, calculated on full timestamps including seconds and displayed in whole hours and minutes, with remaining seconds dropped. |
| BR-5 | Exercises performed on a log card equals the number of exercises in that log. |
| BR-6 | Calendar category dots for a date are the distinct categories of all exercises logged on that date. |
| BR-7 | Set table columns are determined by the exercise's primary and secondary focus. |
| BR-8 | Weight and distance values display with one decimal place (e.g. 5.0, 65.0, 79.0); time displays as HH:MM:SS. |
| BR-9 | Values are stored in metric (kg, km); display defaults to metric and follows the unit setting (ST-1). 1 kg = 2.20462 lb; 1 km = 0.621371 mi. |
| BR-10 | Date formats: DD/MM/YY on template rows, DD MMM YYYY on log pickers and day headers, 24-hour HH:MM for times. |
| BR-11 | RPE is optional for every set. |
| BR-12 | Warm-up sets are recorded separately from working sets and are excluded from set and rep totals. |
| BR-13 | Editing an exercise's definition updates it everywhere; values already recorded in past logs are not changed. |

## 9. Non-functional requirements

The app must stay fast and fully usable mid-session, including with no signal in the gym.

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-1 | Performance | Every screen opens in under 1 second; a set completion tap registers in under 200 ms. |
| NFR-2 | Offline | All features work without a network connection; data is stored on the device. |
| NFR-3 | Data integrity | Every entry and change is saved immediately so no logged set is lost if the app closes. |
| NFR-4 | Usability | Primary tap targets are at least 44 × 44 pt; set rows are operable with one hand. |
| NFR-5 | Accessibility | Supports iOS Dynamic Type and VoiceOver labels on all controls. |
| NFR-6 | Visual design | Brand blue header bar and accents, light grey section backgrounds, white content rows, consistent with the reference screens. |
| NFR-7 | Platform | iOS, portrait orientation, current and previous major iOS version. |
| NFR-8 | Privacy | Body weight and measurements stay on the device and leave it only through user-enabled actions: share, CSV export, iCloud backup or Apple Health. |

## 10. Acceptance criteria

Release 1.0 is accepted when every scenario below passes on a device.

| ID | Covers | Given / When / Then |
| --- | --- | --- |
| AC-1 | WO-3, BR-3 | Given a template with 9 exercises, 30 sets and 356 reps, when the Workouts list loads, then its row shows Next Workout: 9 Exercises, 30 Sets, 356 Reps. |
| AC-2 | WO-5 | Given the Workouts list, when the user taps +, then a menu shows Add Workout Group and Add Workout Template. |
| AC-3 | WT-4 | Given a template detail, when the user taps +, then a menu shows Add Workout of the Day, Add SuperSet and Add Exercise. |
| AC-4 | EX-2, EX-3 | Given the Exercises list, when it loads, then 3/4 Sit-Up appears before 90/90 Hamstring and Ab Crunch Machine, each showing focus, equipment and categories. |
| AC-5 | ED-2, ED-3 | Given 3/4 Sit-Up, when opened, then it shows category Abdominals (Lower) with its colour, Primary Focus Reps and Secondary Focus Weight. |
| AC-6 | LG-3, LG-4 | Given logs on 1, 2, 5 to 11 and 13 to 17 and 19 September 2026, when September is shown, then those dates are blue circles with category dots and 3, 4, 12 and 18 are plain. |
| AC-7 | LG-7, BR-4, BR-5 | Given a log from 10:30 to 13:35 lasting 3 hours 4 minutes and some seconds with 8 exercises, when its date is selected, then the card shows Completed in 3 hours 4 minutes and Exercises performed 8. |
| AC-8 | WL-4 | Given Rope Jumping (time focus) and Cable Crunch (reps and weight focus), when the log opens, then their tables show TIME/DISTANCE and REPS/WEIGHT columns respectively. |
| AC-9 | WL-6 | Given an uncompleted set, when the user taps its circle, then it turns filled blue; tapping again returns it to an empty circle. |
| AC-10 | WL-7 | Given an exercise block, when the user taps + Add Set, then a new set row appears numbered next in sequence with the previous set's values. |
| AC-11 | BR-2 | Given a log of Thursday - Shoulder Lead on 13 September 2026, when it is the latest log for that template, then the template shows Last Completed: 13/09/26. |
| AC-12 | NFR-2, NFR-3 | Given airplane mode, when the user completes sets and force-closes the app, then on reopening all sets are still recorded. |

**Acceptance criteria for Explore, Settings, session tools and validation**

| ID | Covers | Given / When / Then |
| --- | --- | --- |
| AC-13 | XP-3 | Given a week with completed working sets of 3 × 15 at 65 kg and 3 × 10 at 40 kg, when Explore loads, then that week's volume is 4,125 kg. |
| AC-14 | XP-6, SS-4 | Given a previous best of 100 kg × 5, when the user completes 102.5 kg × 5 and finishes the session, then the summary and Personal Records show the new record with today's date. |
| AC-15 | ST-1 | Given a logged set of 65.0 kg, when the user switches to lb, then it displays as 143.3 lb and switching back shows 65.0 kg. |
| AC-16 | SS-1, SS-2 | Given a default rest of 90 s, when a working set is completed with the app in the background, then a notification fires 90 s later. |
| AC-17 | SS-3 | Given a session in progress, when the user switches to the Exercises tab, then a resume banner is visible and returns to the session when tapped. |
| AC-18 | VR-3 | Given a log, when the user sets End Time earlier than Start Time, then the save is blocked and the message in section 14 is shown. |
| AC-19 | ST-6 | Given 200 logs, when the user exports CSV, then the share sheet opens with a file containing every set of every log. |
| AC-20 | VR-9 | Given an exercise used in past logs, when the user deletes it, then it disappears from the library while past logs still show its name and sets. |

## 11. Assumptions, dependencies and glossary

**Assumptions**

- The app is single-user and stores data on the device.
- The exercise library ships pre-loaded with exercises, categories and instructions, and users can add their own.
- Body weight is entered per session in the workout log.

**Dependencies**

- iOS share sheet for the share actions.
- iOS date and time pickers for Start Time and End Time.

**Glossary**

| Term | Meaning |
| --- | --- |
| Workout Template | A reusable plan of exercises and prescribed sets |
| Workout Group | A named, coloured container for templates |
| Workout Log | A record of one completed session on a date |
| Superset | Two or more exercises performed back to back without rest |
| Workout of the Day | A block added to a template as the day's set workout |
| Warm-up set | A lighter preparatory set, recorded apart from working sets |
| RPE | Rate of Perceived Exertion, the user's effort rating for a set |
| Focus | The metric or metrics an exercise is measured by |
| Quick Go! | Starts a session immediately without picking a template |

## 12. Product decisions

Every behaviour that the reference screens did not show directly is fixed here, so engineering has one answer for each.

| ID | Topic | Decision |
| --- | --- | --- |
| PD-1 | Starting a template | Template detail has a Start Workout button pinned above the tab bar; it creates a log with Start Time = now and the template's exercises and sets. |
| PD-2 | Quick Go! | Creates an empty log named Quick Workout with Start Time = now; the user adds exercises with + Add Exercise. |
| PD-3 | Logs + button | Opens a picker of templates plus Empty Workout; the new log takes the selected calendar date and the current time. |
| PD-4 | Pre-filled values | Sets pre-fill from the template; on finishing, the summary offers Update Template, which copies performed reps, weights and set counts into the template. |
| PD-5 | Workouts Edit mode | Drag handles reorder groups and templates; swipe left deletes after confirmation; tapping a name renames it. |
| PD-6 | Template Edit mode | Drag handles reorder exercises; swipe left removes an exercise; select two or more and tap Group to form a superset. |
| PD-7 | Superset | Two or more exercises performed in rounds; the rest timer starts after the last exercise of each round. |
| PD-8 | Workout of the Day | A free-form block with a title, description and a single TIME result, for conditioning work that is not set-based. |
| PD-9 | Warm-up sets | Labelled W instead of a set number, listed above working sets, never counted in volume, totals or records. |
| PD-10 | Exercise ··· menu | View History, Replace Exercise, Reorder, Add Note for this session, Remove. |
| PD-11 | Log settings gear | Rename session, rest time for this session, Save as Template, Delete Log. |
| PD-12 | Logs settings gear | Opens calendar options (ST-2). |
| PD-13 | Share output | Templates and logs share as a formatted plain-text summary via the iOS share sheet; exercises share name, focus, equipment, categories and note. |
| PD-14 | Measurements | Opens a list of the measurement types in section 7; each is optional per log. |
| PD-15 | Completion icon | Matches the reference screens: empty blue-outlined circle when open, filled blue circle with white mark when completed. |
| PD-16 | Monetisation | Release 1.0 is a free app with no ads, accounts or in-app purchases. |
| PD-17 | Tab bar taps | Tapping a tab always opens that tab's root screen, never the detail screen last viewed in it; tapping the active tab returns it to its root. Only the back chevron steps back through detail screens. |
| PD-18 | Exercise tutorial link | Any http(s) address is accepted; a missing https:// is added and anything else is rejected with a message. The link opens in the phone's browser (YouTube links in the YouTube app), from the exercise detail screen and from the exercise's card in a workout log. Shared exercises include the link; backups keep it. |

## 13. Validation rules and edge cases

Inputs are checked as the user types; invalid values are never saved, and destructive actions always ask first.

| ID | Case | Rule |
| --- | --- | --- |
| VR-1 | Names (template, group, exercise, category) | 1 to 60 characters after trimming spaces; exercise and category names are unique, case-insensitive. |
| VR-2 | Numeric ranges | Reps 0 to 999; weight 0 to 999.9; distance 0 to 999.9; time 00:00:00 to 23:59:59; RPE 1 to 10 in 0.5 steps; body weight 20.0 to 400.0 kg. |
| VR-3 | Start and end time | End Time must be later than Start Time; a session may last at most 24 hours. |
| VR-4 | Future dates | A log cannot start after the current date and time. |
| VR-5 | Unfinished sets | Finishing a session with open sets asks: Mark all complete, Finish anyway (open sets are discarded) or Cancel. |
| VR-6 | Empty session | A session with no completed set cannot be saved; the user can discard it. |
| VR-7 | App closed mid-session | The active session is restored exactly on reopen, including the rest timer's remaining time. |
| VR-8 | Second session | Starting a session while one is active asks to resume the current one or finish it first. |
| VR-9 | Deleting an exercise in use | Removed from the library and future templates; past logs keep a stored copy of its name and sets. |
| VR-10 | Deleting a category | Removed from all exercises after confirmation; calendar dots for past dates update. |
| VR-11 | Deleting a group | Allowed only when empty, or the user chooses to move its templates to Default first. Default cannot be deleted. |
| VR-12 | Deleting a template | Past logs created from it remain unchanged. |
| VR-13 | Several logs on one date | All are listed under the date, newest first; dots combine their categories. |
| VR-14 | Session across midnight | The log belongs to its start date. |
| VR-15 | Time zone change | Times are stored in UTC with the original offset and displayed in local time of the session. |
| VR-16 | Long text | Names truncate with an ellipsis in headers and lists; notes truncate to 3 lines with More. |
| VR-17 | Restore from backup | Replaces all current data after a confirmation that states the backup date. |

## 14. Empty states and messages

Every empty screen tells the user what to do next, and every error says what went wrong and how to fix it.

**Empty states**

| Screen | Message | Action |
| --- | --- | --- |
| Workouts | No workouts yet. Build your first template to plan your week. | Add Workout Template |
| Template detail | This workout has no exercises. | Add Exercise |
| Exercises search | No exercises match "{query}". | Create "{query}" |
| Logs, selected date | No workouts on this day. | Log a Workout |
| Explore | Log your first workout to see your progress here. | Go to Workouts |
| Personal Records | Complete a set to set your first record. | None |

**Messages**

| Trigger | Message |
| --- | --- |
| End before start (VR-3) | End time must be after start time. |
| Future start (VR-4) | A workout can't start in the future. |
| Out of range (VR-2) | Enter a value between {min} and {max}. |
| Duplicate name (VR-1) | An exercise called "{name}" already exists. |
| Open sets on finish (VR-5) | You have {n} unfinished sets. Mark them complete? |
| Delete confirmation | Delete "{name}"? This can't be undone. |
| Delete all data (ST-6) | Type DELETE to erase all workouts, exercises and settings. |
| iCloud unavailable | Sign in to iCloud in iOS Settings to back up your data. |
| Backup failed | Backup didn't finish. Check your iCloud storage and try again. |
| Health permission denied | Apple Health access is off. Turn it on in iOS Settings > Health. |

## 15. Analytics and success KPIs

Success is measured by whether users keep logging; analytics are anonymous, opt-in at first launch, and never include body weight, measurements, notes or names.

**KPIs (first 90 days after launch)**

| KPI | Definition | Target |
| --- | --- | --- |
| Activation | New users who complete one session within 7 days of install | 60% |
| Week-4 retention | Users logging at least one session in week 4 | 40% |
| Sessions per active user | Average logged sessions per weekly active user | 3 per week |
| Logging speed | Median time from opening a set row to marking it complete | Under 5 seconds |
| Stability | Crash-free sessions | 99.5% or higher |
| Store rating | Average App Store rating | 4.5 or higher |

**Tracked events**

| Event | Properties |
| --- | --- |
| app\_opened | App version |
| template\_created | Exercise count |
| session\_started | Source: template, Quick Go! or Logs |
| set\_completed | Set type: warm-up or working |
| session\_finished | Duration band, exercise count, set count, template updated yes/no |
| personal\_record\_set | Record type |
| explore\_viewed | Card viewed, time range |
| setting\_changed | Setting name |
| data\_exported | Export type: CSV or backup |

## 16. Release and deployment

The app ships through TestFlight beta, then a 7-day phased App Store release, and only after every release gate below is met.

**App Store submission**

| Item | Requirement |
| --- | --- |
| Developer account | Apple Developer Program membership under the company name |
| Listing | App name, subtitle, description, keywords, support URL, marketing URL, 6.9-inch and 6.5-inch screenshots, app preview video optional |
| Age rating | 4+ |
| Privacy policy | Public URL stating data stays on device, optional iCloud backup, optional Apple Health access and anonymous opt-in analytics |
| Privacy nutrition label | Health and Fitness data: not collected. Usage and diagnostics data: collected, not linked to identity, not used for tracking |
| Apple Health | HealthKit entitlement plus usage descriptions for reading and writing workouts and body weight |
| Permission prompts | Notifications (rest timer) and Health are requested only when the user first needs them |
| Tracking | No App Tracking Transparency prompt, because no cross-app tracking occurs |

**Engineering and operations**

| Area | Requirement |
| --- | --- |
| Source control | Git with protected main branch and mandatory code review |
| CI/CD | Every merge runs unit and UI tests; tagged builds upload to TestFlight automatically |
| Test coverage | 80% or higher on business rules (BR, VR, calculations) |
| Crash reporting | Crash and error reporting SDK with symbolicated stack traces and no personal data |
| Versioning | Semantic versioning (major.minor.patch); build number increments on every upload |
| Data migrations | Versioned schema; every release migrates existing data automatically and is tested on a copy of the previous version's data |
| Rollback | Pause the phased release, fix forward with a patch build; schema changes are additive so older data stays readable |

**Release gates**

- [ ] All acceptance criteria AC-1 to AC-20 pass on the two supported iOS versions
- [ ] Zero open critical or high-severity defects
- [ ] Crash-free sessions at 99.5% or higher across 2 weeks of TestFlight with at least 50 testers
- [ ] VoiceOver and Dynamic Type audit passed on every screen
- [ ] Privacy policy, support page and App Store listing published
- [ ] Backup and restore verified from the beta build to the release build

## 17. Risks and mitigations

The largest risk is losing a user's training history; every mitigation below exists to prevent it or recover from it.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Data loss from device loss or reinstall | Users lose all history | iCloud backup (ST-6) with a reminder after every 10 sessions if backup is off |
| Data corruption during migration | App fails to open after update | Tested, versioned, additive migrations; automatic pre-migration snapshot |
| Slow logging mid-set | Users abandon the app | Sub-200 ms tap response (NFR-1), pre-filled values, one-tap completion |
| Rest timer missed in background | Poor session flow | Local notifications plus time-based timer that survives app suspension |
| App Store rejection over HealthKit or privacy | Launch delay | Health is optional, usage strings and privacy policy reviewed before submission |
| Statistics disagree with user expectation | Loss of trust | Formulas fixed in BR rules and section 7; warm-ups always excluded |

## 18. Delivery roadmap

Release 1.0 is planned as 16 weeks of work for one iOS team, with a gate between each phase that must pass before the next begins.

&#91;embedded content: delivery roadmap · 5 phases, 4 gates\]

Each gate is a go/no-go review with the product owner; a failed gate holds the next phase rather than moving the launch work forward with open defects.
