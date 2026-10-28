# Level Up Tracker — Spec

Living spec. Source of truth for rebuilding the app. Keep terse; update with every feature change.

## Stack
- Angular 22 (standalone components, signals), Angular CLI 22
- Angular Material 22 (M3), dark theme only
- SCSS, no SSR, Vitest (`ng test`)
- Node 24 LTS

## Setup
```
ng new level-up-tracker --directory . --style scss --ssr false --defaults
ng add @angular/material
```

## Theme & global styles (`src/styles.scss`)
- `mat.theme` primary `$azure-palette`, tertiary `$blue-palette`, Roboto, density 0.
- `body { color-scheme: dark; }`, bg `--mat-sys-surface`, text `--mat-sys-on-surface`.
- `.page-title` (headline-medium) + `.page-subtitle` (title-medium, muted); phones: headline-small / title-small, mb 16px.
- `.choices`: button-toggle group, flex-wrap, toggles `flex: 1 0 40px` (used with `hideSingleSelectionIndicator`).
- `.details-card` (mb 24px); `.details`: wrapping flex row of fields (gap 16px, pt 16px) with `.date-field` (0 1 180px), `.grow` (1 1 220px), `.small-field` (0 1 120px).
- `.field-label`: label-medium, muted, mb 4px.
- `.mat-mdc-menu-panel`: 1px `--mat-sys-outline` border on all pop-up menus (tag picker, New entry) so they stand out.
- `.visually-hidden`: screen-reader-only text.
- `.pixel`: "Press Start 2P" (Google Fonts link in `index.html`) — only for game bits (Lv, pops, stat badges), sized ~8–13px.
- **Font styles** (trial; trim once one is picked): `FONT_STYLES` in `core/font-style.service.ts` ↔ Sass map `$font-styles` in `styles.scss` ↔ Google Fonts link in `index.html` (keep all three in sync). Each style = `html.font-<id>` re-running `mat.theme` with typography only (`brand-family` = display/headline/title, `plain-family` = body/label; families passed quoted with `sans-serif` fallback), so all `--mat-sys-*` fonts and Material components switch. Styles in picker order (heading / body): `exo` (Exo 2; **default**), `orbitron` (Orbitron / Roboto), `pixel-chakra` (Pixelify Sans / Chakra Petch), `pixel` (Pixelify Sans). No plain-Roboto option (base theme Roboto shows only before the class applies). `html.game-font` is always added: plain `input/textarea/select/button` inherit font; toolbar `.title-word` uses Press Start 2P 32px, line-height 1, `position: relative; top: 0.0625em` to center its caps on the mushroom (phones 20px — crisp at 2–3× phone pixel density; otherwise keep multiples of 8 so its pixels stay crisp; caps sized to match the mushroom's height).
- `FontStyleService` (root, created by `App`): `styles`, `current` signal (key `levelUpTracker.settings.fontStyle`, default `exo`; unknown/removed id such as `classic`/`chakra` → default), `set(id)` saves; effect sets the classes on `<html>`. Removes the old `levelUpTracker.settings.gameFont` key.

## Assets
- Static files in `public/` (copied as-is, served from root). Images in `public/images/`, referenced as `images/<file>`.
- `mushroom-green.png`: 128×128 green mushroom with white spots — "Mushrooms Set 01" (`Mushrooms_01_128x128_Alt_00_005.png`) by GameArtForge, opengameart.org, **CC BY 3.0 → attribution required** (Settings → Credits). Original kept for Credits.
- `mushroom-pixel.png`: 16×16 pixel version of it (bicubic downscale, hard alpha edges) used in the toolbar (32px; phones 24px), level-up pop (32px) and Player card (64px). Class `.pixel-art` (`image-rendering: pixelated`); show at multiples of 16px.
- App colors: XP green `#21aa52`, yellow `#f8da92` (originally sampled from an earlier mushroom image).

## Shell (`App`)
- **Phone-first.** Breakpoint phone = `max-width: 599.98px` (CSS media queries; `.desktop-only` / `.phone-only` in `app.scss`). `index.html` viewport has `viewport-fit=cover`; safe-area insets padded.
- `mat-toolbar` bg `--mat-sys-surface-container` (min-height 64px, 56px phone; padding includes safe-area insets): `a.app-title` (`routerLink="/"` → app entry point, aria "Level Up home"; inherits color, no underline, focus outline primary) = mushroom-pixel.png `.pixel-art` (left; 32px, phones 24px; decorative `alt=""`) + `.title-word` "Level Up" (no "Tracker"), flex gap 12px, all screen sizes; phones: title-medium, nowrap, gap 10px. Spacer; `PlayerStatus`; desktop-only settings gear `matIconButton` → `/settings` (aria "Settings"; primary when active).
- **Names:** features are shown as **Training Ground** (code: `training/`, `Training`, `EntryStore`) and **Quest Log** (code: `quests/`, `Quests`, `Quest`/`QuestStore`). Code names describe what things are, so display names can change without renames.
- Desktop nav: `mat-tab-nav-bar` under toolbar, tabs "Training Ground", "Quest Log".
- Phone nav: fixed `nav.bottom-nav` (aria "Main"), height 64px + bottom safe-area, bg surface-container, top border outline-variant; items Training Ground (`fitness_center`), Quest Log (`menu_book`), Settings (`settings`): icon inside `.indicator` pill (56×30px, radius 15px) + label-medium at 13px/18px, muted. Active (`aria-current=page`): pill bg secondary-container / icon on-secondary-container, label on-surface bold.
- `main`: max-width 960px, centered, padding 24px 16px (phone: 16px, bottom padding clears the bottom nav); contains `router-outlet`.
- Number inputs use `inputmode` (`decimal` for weight/distance, `numeric` for hours/minutes) for phone keypads.
- Icons: `mat-icon fontSet="material-symbols-outlined"` (font linked in `index.html`).
- Confirmations: never `window.confirm`; use `ConfirmService.confirm({title, message, confirmLabel?})` → `Promise<boolean>`. `MatDialog` (width 360px, max `100vw - 32px`): title, message, actions end: "Cancel" text button (initial focus), confirm filled button in error colors (`--mat-button-filled-container-color: --mat-sys-error`, label `--mat-sys-on-error`), default label "Delete".
- Tests using dialogs provide `MATERIAL_ANIMATIONS` `{animationsDisabled: true}` (jsdom has no animation events). Route-level page specs (`RouterTestingHarness`) use `describe(..., { timeout: 15_000 })` (lazy first loads are slow when all files run in parallel).
- Unsaved guard: pages implement `HasUnsavedChanges { hasUnsavedChanges() }`; `unsavedChangesGuard` (`CanDeactivateFn`) asks `ConfirmService` "Discard unsaved exercises?" / "Exercises you haven't saved will be lost." / "Discard". Dynamically imports `confirm-dialog` (keeps dialog code out of the initial bundle). Browser close not covered.

## Structure
```
src/app/
  app.config.ts                    provideRouter(routes, withComponentInputBinding())
  core/storage.service.ts          StorageService
  core/confirm-dialog.ts           ConfirmDialog + ConfirmService
  core/back-rail.ts                BackRail (full-height back link)
  core/unsaved-changes.guard.ts    HasUnsavedChanges + unsavedChangesGuard
  core/xp.ts                       XP rules + computeProgress (pure)
  core/xp.service.ts               XpService (live progress signals)
  core/player-status.ts            PlayerStatus (Lv, streak, XP bar)
  core/xp-feedback.ts              XpFeedback (pops)
  core/feature-info.ts             FEATURES definitions + FeatureInfo card
  training/entry.ts                 types, constants, helpers
  training/entry.store.ts           EntryStore
  training/training.ts               shell: header + router-outlet
  training/entry-list/              EntryList (log)
  training/entry-detail/            EntryDetail (frame; picks body by type)
  training/workout-detail/          WorkoutDetail
  training/move-detail/             MoveDetail (Get Moving)
  training/weigh-in-detail/         WeighInDetail
  training/sport-detail/            SportDetail (golf)
  training/entry-type-menu/         EntryTypeMenu (shared New entry / Change type menu)
  training/exercise-form/           ExerciseForm
  training/exercise-card/           ExerciseCard (read-only exercise summary)
  quests/quests.ts         shell: header + router-outlet
  quests/quest.ts               types, constants, helpers
  quests/quest.store.ts         QuestStore
  quests/quest-list/            QuestList
  quests/quest-detail/          QuestDetail
  quests/tag-picker/           TagPicker
  quests/manage-tags/          ManageTags (dialog)
  quests/when-choices/         WhenChoices (shared When toggles)
  quests/notes-editor/         NotesEditor (Tiptap)
  player/                          Player (level breakdown page)
  settings/settings.ts             shell: header + router-outlet
  settings/settings-home.ts        SettingsHome (section list)
  settings/about.ts                About (both feature definitions)
  settings/save-load.ts            SaveLoad (Save game / Load game)
  core/save-game.ts                save-file helpers (pure)
  settings/data-viewer.ts          DataViewer
  settings/credits.ts              Credits (asset attributions)
```

## Routes
All pages lazy-loaded (`loadComponent`) to stay under the 500 kB initial budget.
- `''` → redirect `training`
- `training` → `Training`, tab title "Training Ground | Level Up Tracker"; children: `''` → `EntryList`; `:entryId` → `EntryDetail` (param → `entryId` input; `canDeactivate: [unsavedChangesGuard]`)
- `quests` → `Quests`, tab title "Quest Log | Level Up Tracker"; children: `''` → `QuestList`; `:questId` → `QuestDetail`
- `player` → `Player`, tab title "Player | Level Up Tracker"
- `settings` → `Settings`, tab title "Settings | Level Up Tracker"; children: `''` → `SettingsHome`; `about` → `About` (title "About | Level Up Tracker"); `data` → `DataViewer` (title "View data | Level Up Tracker"); `credits` → `Credits`
- Old addresses redirect: `body-xp[/:entryId]` → `training[/:entryId]`, `open-loops[/:questId]` → `quests[/:questId]`.
- `**` → redirect `training`

## Persistence
- `StorageService` (root): `load<T>(key, fallback)`, `save(key, value)`, `keys()` (app keys, sorted), `raw(key)` (stored text or null); JSON in `localStorage`; errors logged, load falls back.
- All keys start with `APP_KEY_PREFIX = 'levelUpTracker.'`.
- Features use only `StorageService`, never `localStorage`, so a backend can replace it later.
- Keys: `levelUpTracker.training.entries`, `levelUpTracker.quests.items`, `levelUpTracker.quests.tags`, `levelUpTracker.settings.fontStyle` (style id).
- Key rename (temporary): `StorageService.loadRenamed(oldKey, key, fallback)` moves data from `levelUpTracker.bodyXp.entries` / `.openLoops.loops` / `.openLoops.tags` to the new keys once (never overwrites an existing new key; old key removed). Remove (back to `load`) once every browser in use has opened the app since the rename.
- Optional fields omitted from saved data when empty. IDs: `crypto.randomUUID()`.

## Features

### 1. Training Ground
Tracks physical improvement. A **log** of **entries**; types: **Workout**, **Get Moving** (Walk/Run/Bike), **Sport** (Golf), **Weigh-in**. One type per entry.
- Header (in `Training` shell, all pages): row = h1 "Training Ground — Raise your stats" + `<sup class="xp-pops">` (inline-flex, wrap, gap 4px, ml 6px) of pills "+50 VIT", "+5 AGI", "+5 STR" (`.xp-pop.pixel`: bg `#21aa52` XP green, text `#04210f`, 8px pixel font, padding 3px 6px; decorative, fixed values) + ⓘ icon button (aria "What is the Training Ground?", `aria-expanded`) toggling `FeatureInfo feature="training"` (closable) below the header.

#### Data (`entry.ts`)
- `MAX_REPS = 15`; `REST_MINUTES = [1,2,3,4,5,10,15,20,25,30]`; `MAX_MACHINE_SETTING = 10`.
- Workout pieces: `ExerciseSet` (`type:'set'`, `reps`, `weight?` lb, `failure`, `easy`); `Rest` (`type:'rest'`, `minutes`); `Step` = union. `Exercise`: `id`, `name`, `machineSetting?` (0..10), `steps` (ordered; trailing rest = rest before next exercise), `notes?`, `loggedAt?` (ISO, set when added; kept on update; missing on older data). `ExerciseInput` = minus `id`, `loggedAt`.
- `EntryBase` (exported; kept on type change): `id`, `date` (`YYYY-MM-DD`), `createdAt` (ISO, set on create; for time-of-day analysis later), `notes?` (plain text, trimmed; whole-entry notes, separate from exercise notes).
  - `WorkoutEntry`: `type:'workout'`, `name?`, `exercises` (performed order).
  - `MoveEntry`: `type:'move'`, `activity` (`ACTIVITIES = walk|run|bike`, labels Walk/Run/Bike), `location?`, `durationMinutes?`, `distance?` (mi).
  - `WeighInEntry`: `type:'weigh-in'`, `weight?` (lb; missing until entered).
  - `SportEntry`: `type:'sport'`, `sport` (`SPORTS = golf`; labels Golf; icons `golf_course`), `format?` (`GOLF_FORMATS = practice|9-holes|18-holes`, labels Practice / 9 holes / 18 holes; missing until picked), `score?` (whole ≥1; only kept for 9/18 holes).
  - `Entry` = discriminated union on `type`; `NewEntry` = Entry minus `id`, `createdAt` (distributive); `EntryTypeInit` = Entry minus `EntryBase` keys (a type's blank fields, e.g. `{type:'sport', sport:'golf'}`).
  - `ENTRY_TYPE_OPTIONS`: `{label, icon, group?, init}` in menu order Workout | Get Moving: Walk, Run, Bike | Sport: Golf | Weigh-in. `isSameKind(entry|init, init)` (same type and activity/sport), `typeLabel(init)`.
  - Type change helpers: `droppedFields(entry)` (workout: "name", "N exercise(s)"; move: distance/time/location; weigh-in: weight; golf: type/score; only those set), `describeFields` ("a, b and c"), `describeDropped(entry)` → note "Changed from <label>: …" (workout: "Name. Exercise (setting S): 10 × 135 lb, 8 reps (Failure)."; move: "3.1 mi · 28 min · Place"; weigh-in: "181 lb"; golf: "9 holes · Score 45") or null.
- `matchNames(names, query, limit = 8)` (exercise and workout names): words = lowercase split on non-alphanumerics; keep names where every typed word is a prefix of some name word ("be pr" → "Bench Press"); skip exact (case-insensitive) match; keep input order; empty query → first `limit`.
- `groupByDay(items, todayDate)` → `{key, label, items}[]` (future → Upcoming, = today → Today, day before → Yesterday, older → Earlier; keeps input order; empty groups left out).
- Helpers: `stepLabels` ("Set 1", "Rest 1", "Set 2"…), `countSets`, `totalRest`, `formatDuration` ("45 min", "1 h", "1 h 5 min"), `formatDistance` ("3.1 mi", ≤2 decimals), `entryLabel` (Workout / Walk|Run|Bike / Weigh-in / Golf), `entryIcon` (`fitness_center`, `directions_<activity>`, `monitor_weight`, `golf_course`), `today()`.

#### `EntryStore` (root)
- Private signal `Entry[]`; `entries` computed sorted date desc, then `createdAt` desc. `byId(id)`.
- `rankNames(namesOldestFirst)`: dedupe case-insensitively (latest spelling wins), sort by use count desc then alphabetical. Derived, not stored separately (deleted ones drop out).
- `exerciseNames` computed: `rankNames` of all exercise names.
- `workoutNamesExcept(id)`: `rankNames` of workout names, leaving out workout `id` (its name autosaves while typing).
- `lastWorkoutNamed(name, excludeId)`: most recent other workout with that name (trimmed, case-insensitive); none for blank.
- `latestExercise(name)` → `PreviousExercise {exercise, date}` (workout date): most recent exercise with that name (trimmed, case-insensitive), scanning entries newest first; within a workout, the later exercise wins.
- `create(NewEntry)` → adds `id`, `createdAt`; `replace(entry)`; `remove(id)`.
- `changeType(id, next: EntryTypeInit, extraNote?)`: keeps id/date/createdAt (so log position and XP timing stay), notes + extraNote joined by a blank line; old type's fields dropped.
- Workout exercises: `addExercise(id, input)` (appends, stamps `loggedAt`), `updateExercise(id, exerciseId, input)` (keeps `loggedAt`), `removeExercise(id, exerciseId)`.
- Each change saves. Loads from entries key (empty if missing).

#### `EntryList` (log)
- "New entry" (filled, add icon) opens the shared `EntryTypeMenu` (`[matMenuTriggerFor]="menu.menu()"`; groups get a divider + muted heading; current type marked with check + primary when given): Workout (fitness_center) | divider, muted heading "Get Moving", Walk / Run / Bike (directions_*) | divider, muted heading "Sport", Golf (golf_course) | divider, Weigh-in (monitor_weight). Each creates entry dated today (Get Moving with chosen activity; Sport with chosen sport) and navigates to it.
- `nav.log` (gap 20px) of `section.day-group`s from `groupByDay(entries, today())`: `h3.group-title` (title-small, muted, uppercase, letter-spacing .8px) Upcoming / Today / Yesterday / Earlier (by entry `date`; empty groups omitted), then that group's `a.entry` rows, sorted as store: type icon (primary color), title, meta, chevron_right. Hover bg `surface-container`.
  - Title: workout name, else `entryLabel`.
  - Meta (" · "-joined): date `EEE, MMM d, y`, then — Workout: "N exercise(s) · M set(s)"; Get Moving: distance, duration, location (each if set); Weigh-in: "W lb" or "No weight yet"; Golf: format label or "Not set up yet", then "Score S" if set.
  - Workout: comma-separated exercise names (single line, ellipsis).
  - `notes` icon (16px, muted, aria "Has notes") after the title when the entry has notes.
- Empty: "Nothing logged yet. Press Start: tap "New entry"."

#### `EntryDetail` (frame)
- Layout: grid `56px | 1fr`, gap 16px (phone `40px | 1fr`, gap 12px). Left: `<app-back-rail link="/training" label="All entries">`.
- `BackRail` (`core/back-rail.ts`, inputs `link`, `label`): full-height link (`matRipple`, aria-label = label; border outline-variant, radius 12px, bg surface-container-low, muted text; hover bg surface-container-high + primary text; focus outline primary; `overflow: clip`, not `hidden`, which would break sticky). Inside (column, centered, gap 4px, padding 12px 2px): arrow_back icon + label with one word per line (label-medium, centered, aria-hidden; hidden on phones); `position: sticky; top: 16px` so it follows the page while scrolling.
- Right: heading row = h2 containing `.type-button` (icon + `entryLabel` + CSS ▾; `matRipple`; aria "<label>. Change type") opening `EntryTypeMenu [current]=entry` + delete icon button (right); then body.
- Change type: same kind → nothing; Walk↔Run↔Bike → only `activity` changes (details kept, `MoveDetail` follows the activity via an effect); otherwise unsaved exercise forms → "Discard unsaved exercises?"; if `droppedFields` non-empty → confirm "Change to <Type>?" / "This <label>'s <fields> will be removed. They'll be copied into its notes." / "Change"; then `store.changeType(id, next, describeDropped(entry))` and the notes box is refreshed.
- Body by type: `WorkoutDetail` / `MoveDetail` / `WeighInDetail` / `SportDetail` (`[entry]` input).
- Below the body (every type): `.entry-notes` "Notes" textarea (`cdkTextareaAutosize`, rows 3; loaded once per id; saves on each change: trimmed, blank → omitted), then `.footer` (right-aligned): muted "Saves automatically" (`cloud_done`) + filled "Done" (`check`) → `/training` (unsaved-exercise guard still applies).
- Type detail forms that rebuild the entry (Move, Weigh-in, Sport) carry `notes` from the current entry so they never drop it.
- Implements `HasUnsavedChanges` → `viewChild(WorkoutDetail)?.hasUnsavedChanges()`; false after a confirmed delete (no second prompt).
- Delete: `ConfirmService` dialog, title "Delete <label lowercase>?" (e.g. "Delete run?"); message "Its N exercise(s) will be deleted too. This can't be undone." (workout with exercises) else "This can't be undone." → remove, navigate to log.
- Unknown id: "Entry not found."

#### Detail forms (all)
- In `.details-card`; autosave on each change; form loaded once per entry id (`emitEvent:false`) so saves don't overwrite typing. Date required: a blank/invalid date keeps the saved date and doesn't block other fields (other invalid fields aren't saved).

#### `ExerciseCard` (`exercise-card/`)
- Input `exercise`. Host: flex row, padding 12px 8px 12px 16px, border outline-variant, radius 12px, bg surface-container-low. Name (title-medium); meta "[Setting S · ]N set(s) [· M min rest]"; unbulleted steps "Set N: R reps [@ W lb]" + tags Failure (error-container) / Easy (tertiary-container), or "Rest M min" (muted italic); notes (pre-wrap). Right: projected `[actions]`.

#### `WorkoutDetail`
- Details: Date + "Workout name" (placeholder "e.g. Push day"; trimmed, blank → omitted) with `mat-autocomplete` (`.workout-suggestions`) = `matchNames(store.workoutNamesExcept(id), typed)`.
- **Last time panel** (`mat-expansion-panel.last-time`, expanded, mb 24px) when `lastWorkoutNamed(entry.name, id)` exists (typed or picked): title "Last <name>", description "<`EEE, MMM d`> · N exercise(s)"; `ExerciseCard` per exercise in original order. Action: if a same-name (case-insensitive) exercise is in this workout → `.logged` check_circle "Logged" (primary); else `+` (`add_circle`, aria "Start <name>"), disabled while a new form for that name is open → opens a draft started with that name.
- "Exercises" (h3) list, performed order: each `ExerciseCard` with edit/delete icon buttons, or — if in `editingIds` — an in-place `ExerciseForm [exercise]` (saved → `updateExercise`, close; cancelled → close). Delete exercise: immediate (closes its form).
- **Drafts** (new exercise forms, `.draft`) after the list: `{key, name|null}`; `ExerciseForm [startWith]=name` (saved → `addExercise`, remove; cancelled → remove). Outlined "Add exercise" (add icon) → blank draft. Any number of forms open at once.
- All forms get `[knownNames]` = `store.exerciseNames()`, `[previous]` = `name => store.latestExercise(name)`.
- Empty (no exercises, no drafts): "No exercises yet. Press Start: pick one from last time, or add your own." (without panel: "…add your first one.").
- `hasUnsavedChanges()` = any `viewChildren(ExerciseForm)` `.hasChanges()`.

#### `MoveDetail` (Get Moving)
- Activity: `.choices` toggle group Walk/Run/Bike (label "Activity").
- Row: Date + Location (trimmed, optional).
- Row: Hours (whole ≥0), Minutes (whole 0–59), Distance (mi, ≥0, step 0.01). Duration saved as `hours*60+minutes` if either set, else omitted.

#### `SportDetail` (golf)
- "Type" `.choices` Practice / 9 holes / 18 holes. Row: Date + "Score (optional)" (shown only for 9/18 holes; whole number ≥1; `inputmode=numeric`).
- Autosave (loaded once per id with `emitEvent:false`): rebuilds entry; invalid score not saved; blank date keeps saved date; score dropped when Practice/unset.

#### `WeighInDetail`
- Row: Date + Weight (lb, ≥0, step 0.1, optional until entered).
- "Entered `MMM d, y, h:mm a`" from `createdAt` (muted).

#### `ExerciseForm`
- Inputs `exercise: Exercise | null`, `startWith: string | null` (new only: set name once + auto-fill), `knownNames: string[]`, `previous: (name) => PreviousExercise | undefined`; outputs `saved: ExerciseInput`, `cancelled`.
- Edit form reloads only when a different exercise id is passed. Scrolls itself into view after first render (forms only appear on user action).
- `hasChanges()`: editing → `form.dirty`; new → dirty or name non-blank.
- Outlined `mat-card` "New exercise"/"Edit exercise". Reactive form:
  - Exercise (name): required, not blank, trimmed. `mat-autocomplete` options = `matchNames(knownNames, typed text)` (signal from `valueChanges`); picking fills the field. Free text still allowed.
    - Auto-fill on picking a suggestion (`optionSelected`), add mode only (editing = rename only): first undo any previous fill; from `previous(name)`, set machine setting if form's is blank; take its last set's reps + weight into every set whose reps and weight are both blank. Never overwrites entered values; failure/easy not copied.
    - Making it obvious (only if something was filled):
      - Color: `--autofill: #f8da92` (app yellow) on `:host`; tints via `color-mix` with transparent: `--autofill-tint` 12%, `--autofill-tint-strong` 20%, `--autofill-border` 35%.
      - Note under name (`role="status"`, bg tint, 1px border, radius 8px, text on-surface): auto_awesome icon (yellow) + "Filled from your last <name> (<date `EEE, MMM d`>): <summary>" (summary: "setting S" and/or "R reps[ @ W lb]", comma-joined) + "Undo" text button (yellow label).
      - Filled controls tracked in a signal set; each drops out on its first `valueChanges` (user edit, undo, reset). While tracked: toggle group `.auto-filled` (selected bg tint-strong, text yellow via `--mat-button-toggle-selected-state-*`), weight field `.auto-filled` (`--mat-form-field-filled-container-color` tint, input text yellow), auto_awesome icon (18px, yellow, aria-label "Auto-filled") after the set's title.
      - Undo: set still-tracked controls to null, hide note. Note also cleared on add/reset and when loading an exercise to edit; stays after the user edits values.
  - "Machine setting (optional)": `.choices` 0..`MAX_MACHINE_SETTING`; "Clear" text button beside label when set (toggles can't be un-selected); label row min-height 36px so it doesn't jump. Omitted when not set; 0 is a valid setting.
  - Steps (`FormArray` of set/rest groups; starts with 1 set). Each step in bordered box with remove (×); last remaining set can't be removed.
    - Set ("Set N"): Reps `.choices` 0..`MAX_REPS`, required, error "Pick the number of reps." after submit. Row: Weight (lb, optional, ≥0) + slide toggles "Failure?", "Easy?" (mutually exclusive).
    - Rest ("Rest", dashed border, `surface-container-lowest` bg): Minutes `.choices` of `REST_MINUTES`, required, error "Pick the rest length." after submit.
  - Outlined buttons: "Add set" (add icon; copies most recent set's weight), "Add rest" (timer icon).
  - Notes: textarea, optional, trimmed.
  - Submit "Add"/"Save"; "Cancel" (`button.cancel`) always. After add, resets (1 empty set). Switching edit → null resets via `FormGroupDirective.resetForm` (clears submitted state); no reset on first run.

### 2. Quest Log
Goals, to-dos, lists and anything else to keep track of: helps get things done and unburdens the mind. Quick capture, organize later: new quests land in the **Inbox**. 
- Shell `Quests` header row: h1 "Quest Log — Free your mind" + ⓘ (aria "What is the Quest Log?") toggling `FeatureInfo feature="quests"` (closable); then router-outlet.

#### Data (`quest.ts`)
- `HORIZONS = inbox|now|soon|someday` (labels Inbox/Today/Soon/Someday; `now` is shown as "Today"). `IMPORTANCES = normal|important|urgent` (labels Normal/Important/Urgent; icons none / `star` / `local_fire_department`).
- `Quest`: `id`, `title` (plain), `horizon`, `importance`, `tagIds`, `notes?` (HTML; omitted when blank), `createdAt`, `closedAt?`, `pinned?: true` (omitted when not pinned), `order?` (number from drag ordering; lower = higher up). `byOrder`: both have `order` → ascending; one has → it first; neither → `byImportanceThenNewest`. Closing keeps everything; only hides it from open lists.
- `Tag`: `id`, `name`.
- Helpers: `nextImportance` (cycle), `byImportanceThenNewest` (urgent → important → normal, then `createdAt` desc), `isBlankHtml` (no text and no li/a/img).
- Colors: important `#f8da92` (app yellow), urgent `#ff8a65` (urgent row tint 12%, border 45%).

#### `QuestStore` (root; keys `levelUpTracker.quests.items`, `…tags`)
- `quests`, `tags` (alphabetical, case-insensitive), `open` (pinned included, sorted `byOrder`), `closed` (closedAt desc), `horizonCounts` (open), `byId`, `tagById`.
- `add(title, {tagIds?, importance?, horizon?, pinned?})` → trimmed, horizon defaults to inbox; once any quest has an `order`, new ones get min − 1 (top). `update(quest)`, `setPinned(id, bool)`, `reorder(ids)` (ids = a possibly filtered visible list in its new order: they swap among the slots they hold in `open`, others stay put; then every open quest gets `order` = index), `close(id)` (sets `closedAt`), `reopen(id)` (removes it), `remove(id)`.
- `createTag(name)` (trim; existing returned if same name ignoring case), `renameTag(id, name)` (ignores blank), `deleteTag(id)` (also strips from quests).

#### `QuestList` (`quest-list/`)
- Page = flex column. **Capture** card (`form.capture`): input "What's on your mind?" (aria "New quest", `enterkeyhint="done"`); `WhenChoices.capture-when` (compact: `--mat-button-toggle-height` 32px, label 13px, margin-bottom 6px; Today · Soon · Someday, `clearable`, aria "When (optional)"; none picked → horizon inbox; `linkedSignal` defaulting to the viewed filter tab, All → none, so new quests stay in view; reset to that default after each capture); row: `TagPicker [(selected)]`, importance outlined button cycling Normal → ⭐ → 🔥 (icon `label_important` when normal; label colored), pin toggle `matIconButton.capture-pin` (`push_pin`, aria "Pin to the top", `aria-pressed`; on = secondary-container bg + filled icon) → new quest `pinned`, spacer, "Add" (filled; disabled when blank). Enter/Add captures, resets tags + importance + pin, refocuses input. Phones: capture moves below the list (`order: 99`), `position: sticky; bottom: 64px + safe-area + 8px`, shadow.
- Filters: `WhenChoices.horizons` with first choice **All** + counts: **All** · Today · Soon · Someday (All first and default; it includes unsorted Inbox quests — no Inbox tab; counts within tag filter). Quests still start with horizon `inbox`, and the quest page keeps Inbox as a "When" choice. Tag chips row (`.tag-chip`, pill, active = secondary-container; count within horizon; tap again clears) + "⋯" (`more_horiz`, aria "Manage tags") → `ManageTags` dialog. Row hidden when no tags.
- Horizon counts leave out pinned quests (they show on every tab); tag counts include them.
- **Pinned** section (only if any match the tag filter; ignores the When tab): `h3.group-title` with `push_pin` icon "Pinned", then `ul.pinned-list` (labelled by it) of pinned open quests. Same row as below, but a `push_pin` icon (primary, aria "Pinned") instead of the complete button.
- Open quests list (aria "Open quests"): open, unpinned quests in `byOrder`. Row (`.quest`, shared `ng-template`) = drag handle (`drag_indicator`, `cdkDragHandle`, muted, title "Drag to reorder"), complete button (`radio_button_unchecked`, aria "Complete <title>"), link to `:id` with title + mini tag pills + `notes` icon if notes, importance icon (colored).
- **Drag ordering** (CDK `cdkDropList` per list, `cdkDrag` rows, `cdkDragLockAxis="y"`, handle only so touch scrolling still works): drop → `store.reorder(visible ids)`. Dashed `.quest-placeholder`; preview shadow. No keyboard reordering yet.
- **Urgent** rows: rotating border — `--quest-glow-angle` (`@property <angle>` in `styles.scss`) animated 0 → 360deg over 3.5s linear (clockwise); 1.5px transparent border painted with a `conic-gradient` "comet" (dim red 30% → `#ff3b30` → `#ff6a3d` → `#ff8a65` → dim) under padding-box layers (urgent tint over surface-container-low); `::before` (inset −2px, z-index −1, blur 7px, opacity .55) repeats it as an outer glow (`.quests` has `isolation: isolate`). Reduced motion: no animation.
- Empty: All "No open quests. Mind clear!"; else "Nothing in <Horizon> yet."; with tag "No open quests tagged <name>."
- "Completed (N)" `mat-expansion-panel` (group aria "Completed quests"; collapsed; only if any match filters). Inside, `section.day-group`s from `groupByDay` keyed by the local day of `closedAt` (Today / Yesterday / Earlier; same `h3.group-title` style and 20px gap as the Training Ground log), each a `ul.closed-list` (labelled by its heading). Row: reopen (`check_circle`, aria "Reopen <title>"), faded "disabled" row (transparent bg, border outline-variant 50%, title on-surface 50%, icons on-surface 40%; hover/focus brightens to on-surface-variant; no strikethrough) with title link, delete (confirm "Delete quest?" / `"<title>" will be gone for good. This can't be undone.`).

#### `WhenChoices` (`when-choices/`)
- The one "When" toggle row (tabs, Capture, quest page): `.choices` group of `SORTED_HORIZONS` (Today · Soon · Someday; `quest.ts`) with optional `first` choice `{value, label}` before them and optional `counts` (`.count` after each label). `value = model<string | null>`; `clearable` (boolean attr): tapping the picked choice again sets null. Selection via group `change` (so arrow keys work); clear via click, ignoring the click that just picked. Full-width equal buttons styled in the component.

#### `TagPicker` (`tag-picker/`)
- `selected = model<string[]>`. Outlined "Tags" / "Tags (N)" button (`sell` icon) → `mat-menu`: checkbox per tag, "No tags yet.", new-tag input + add (creates or reuses, then selects). Menu body stops click/keydown propagation so it stays open while typing.

#### `ManageTags` (`manage-tags/`, `MatDialog` 400px)
- "Manage tags": per tag a text field (rename on blur/Enter; blank restores), use count, delete (confirm `Delete tag "<name>"?` / "It will be removed from N quest(s). The quests stay."). "Done".

#### `QuestDetail` (`quest-detail/`, route `:questId`)
- Grid like `EntryDetail`: `BackRail` "All quests" → `/quests`.
- Heading "Quest" (`radio_button_unchecked`) / "Completed quest" (`check_circle`) + `.heading-actions`: pin toggle `matIconButton` (`push_pin` / `keep_off` when pinned, primary when pinned; aria "Pin quest" / "Unpin quest", `aria-pressed`) → `setPinned`, tonal "Complete quest" (check) / "Reopen" (undo) (`.toggle-closed`; stays on the page) + delete (aria "Delete quest"; confirm "Delete quest?", then back to list). Unknown id: "Quest not found."
- Autosave, loaded once per id; **each field saves on its own** (blank title isn't saved but doesn't block others): title ("Quest", required), "When" `WhenChoices` with first choice Inbox (saves on pick; not in the form group), "Importance" `.choices` with colored icons, "Tags" removable pills + `TagPicker`, "Notes" `NotesEditor` (keyed by id).
- Footer: "Captured <date> [· Completed <date>]" (`MMM d, y, h:mm a`) + filled "Done" (check; `.done`) → `/quests`, like `EntryDetail`.

#### `NotesEditor` (`notes-editor/`, Tiptap 3, lazy with QuestDetail)
- Packages: `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit` (heading, codeBlock, code, blockquote, horizontalRule off; link `openOnClick:false, autolink, defaultProtocol https`), `@tiptap/extension-list` (`TaskList`, `TaskItem` nested).
- Input `html` (read once at creation); output `changed` (HTML, 300ms debounce, '' when blank; flushes on destroy).
- Toolbar (aria "Formatting"; buttons keep editor focus via mousedown preventDefault; active = secondary-container): Bold, Italic, Bulleted list, Numbered list, Checklist, Link (inline row: URL input, Apply / Remove / Cancel). Markdown shortcuts from StarterKit.
- `ViewEncapsulation.None`, styles under `.notes-editor` (min-height 160px; checklist items flex with checkbox, checked = muted + strikethrough).

### Settings
Not a tab: opened from the toolbar gear.
- Header: "Settings — Options menu"
- `SettingsHome`: first a "Font style" card (`section.font-style`, card look of the rows; icon `text_fields`, h2 "Font style", "Changes the whole app right away. Pick what reads best."): `mat-radio-group` (labelled by the h2; grid `auto-fill minmax(240px, 1fr)`, gap 8px) of `.font-option`s, each showing its label in its heading font (18px) over its description in its body font (14px, muted); selected = primary border + surface-container → `FontStyleService.set`; then `nav.sections`: list of section links (same row style as the Training Ground log: icon in primary, title, description, chevron_right). Sections: "About" (icon `info`, "What the Training Ground and Quest Log are for.") → `about`; "View data" (icon `database`, "See everything saved in this browser.") → `data`; "Credits" (icon `favorite`, "Artwork and libraries used in the app.") → `credits`.
- `SaveLoad` (`settings/save-load.ts`, route `save-load`, title "Save & Load | Level Up Tracker"; home section "Save & load game", icon `save`, "Back up your progress to a file, or restore it."): "← Settings"; h2 "Save & load game"; intro (progress lives in this browser; save to back up or move devices).
  - Card "Save game" (`save` avatar; "Download everything (training, quests, tags) as a save file."): filled "Save game" (download) → Blob download `level-up-save-YYYY-MM-DD.json` = `SaveFile {app:'level-up', version:1, savedAt, data: {key → parsed value}}` of every app key (pretty JSON).
  - Card "Load game" (`sports_esports`; "Restore from a save file."): filled "Load game" (upload) opens hidden file input (`.json`). Invalid → `role=alert` error ("That file isn't a Level Up save." / "…(it's not valid JSON)."). Valid → summary "Save from <`MMM d, y, h:mm a`>" + "N training entries · N quests · N tags" + hint; actions Cancel / Replace (outlined) / **Merge** (filled).
  - Merge (`mergeData`): keeps everything on this device; adds items (by `id`) and keys only in the save. Replace: confirm "Replace your progress?" / "Everything on this device will be replaced by the save file. This can't be undone." / "Replace"; removes all app keys, writes the save's.
  - After writing: `PAGE_RELOAD` (injection token, default `location.reload()`; mocked in tests) so stores and XP re-read storage.
  - Pure helpers in `core/save-game.ts`: `makeSaveFile`, `saveFileName`, `parseSaveFile` (checks app/version/savedAt/data and that every key has the app prefix), `describeSave`, `mergeData`. `StorageService` adds `saveRaw(key, raw)`, `remove(key)`.
- `About` (`settings/about.ts`): "← Settings"; h2 "About Level Up"; intro "Level Up turns looking after yourself into a game. Train your body, clear your mind, and earn XP for showing up every day."; `FeatureInfo` training + quests (not closable); link to Player page.
- `FeatureInfo` (`core/feature-info.ts`): single source `FEATURES[training|quests]` = `{name, tagline, icon, intro[], points[], outro}`; card (border, radius 12px, surface-container-low): icon + "<name> — <tagline>" (+ close button when `closable`), intro paragraphs, bullet points, outro. Quest Log text covers goals/to-dos/lists, getting things done, unburdening the mind; Training Ground covers workouts, Get Moving, weigh-ins, suggestions/auto-fill, XP. Edit wording there only.
- `Credits` (`settings/credits.ts`, route `credits`, title "Credits | Level Up Tracker"): "← Settings"; h2 "Credits"; cards: mushroom thumb + "Mushroom artwork" — "Mushrooms Set 01" (link to opengameart page) by GameArtForge (link to profile), licensed CC BY 3.0 (link), "Scaled, and pixelated to 16×16 for the app's game look; the app icons place it on a dark background."; code icon + "Built with" — Angular, Angular Material, Material Symbols, Tiptap, fonts Press Start 2P, Pixelify Sans, Chakra Petch, Exo 2, Orbitron (SIL OFL) and Roboto (Apache 2.0). Keep fonts listed here. Keep any new CC-BY asset credited here.
- `DataViewer` (read-only, snapshot on open):
  - "← Settings" text button; h2 "View data"; muted intro: saved in this browser's local storage, read-only, other browsers/devices separate.
  - One outlined `mat-card` per app key: title = key without prefix (e.g. `training.entries`); subtitle "N item(s) · size" (count only for arrays; size B or KB to 1 decimal; "Not valid JSON · size" if unparsable); `pre.json` pretty-printed (2 spaces; raw text if invalid), monospace 13px, max-height 480px scroll, bg surface-container-lowest, focusable.
  - "Copy" button (content_copy) → clipboard; shows "Copied" (check) for 2s.
  - Empty: "No save data yet."

### Gaming (always on)
Game layer on top; core labels stay plain. Everything is **derived from saved data** (no stored XP): deleting a session or reopening a quest takes its XP back; no farming.

#### Rules (`core/xp.ts`, pure)
- XP: capture quest 2, complete quest 10, session (workout / Get Moving / sport) 10 once it has anything entered (workout: name or ≥1 exercise; Get Moving: location/duration/distance; sport: format picked), weigh-in 5 (once weight entered), personal record 5. No per-exercise or per-mile XP.
- Activity day = local date of the action time (quest `createdAt`/`closedAt`, entry `createdAt`, exercise `loggedAt`). Any action makes that day active, even logging an old entry.
- Backfill: never blocked. An entry earns XP only if its `date` ≥ (day logged − 1). A yesterday-dated entry with content also makes yesterday active (repairs streak). Older → saved, no XP, no effect on past streaks.
- `streakBonus(n) = min(50, n(n+1)/2)` per active day (1, 3, 6, 10, 15, 21, 28, 36, 45, 50…). `DAILY_CAP = 50`.
- Missed days: `missedLoss(m) = m ≤ 2 ? 0 : min(50, k(k+1)/2)`, `k = m − 2` (2 free days, then 1, 3, 6…). A day is missed only once it's over (today never costs). Missing resets the streak.
- Walk days from first activity to today; running total floored at 0 each day. Levels can drop.
- Levels: XP from level L to L+1 = `50 + 25(L−1)` (50, 75, 100…); `levelFor(xp) → {level, intoLevel, toNext}`.
- PRs: exercise records by name (case-insensitive) in `loggedAt` order (fallback entry `createdAt`); top set = max weight (missing = 0, so bodyweight compares reps) and max reps at it. PR if heavier, or same weight with more reps; first record is the baseline. XP only if the entry is backfill-eligible.
- `computeProgress(entries, quests, today) → Progress {totalXp, streak, bestStreak, prCount, sources: {captureQuest|completeQuest|session|weighIn|personalRecord: {count, xp}}, streakBonusXp, missedLossXp, floorXp, days: DayLog[]}`. `streak` = current run (yesterday's run while today is still empty). Invariant: Σ sources.xp + streakBonusXp − missedLossXp + floorXp = totalXp. `DayLog {day, active, earned, bonus, loss, streak, total}` for every day first activity → today.

#### `XpService` (root)
- Injects `EntryStore`, `QuestStore`; `today` signal refreshed every 60s; computeds `progress`, `totalXp`, `streak`, `prCount`, `levelInfo`, `level`.

#### `PlayerStatus` (toolbar)
- Link `a.status` → `/player` (aria-label "Level N, X of Y XP to level N+1[, S-day streak]. View breakdown."; hover bg surface-container-high, radius 8px): 2-row grid — `.lv.pixel` "Lv N" (11px, `#21aa52`) + "🔥S" if streak (`#ffb74d`); filling `mat-progress-bar` determinate below (green on surface-container-highest), 120×6px (phone 88×5px).

#### `Player` page (`player/`, route `player`, title "Player | Level Up Tracker")
- Header "Player — Your stats".
- Card: mushroom-pixel.png `.pixel-art` (64px) + "Lv N" (pixel 20px green) + 10px XP bar + "X / Y XP to Lv N+1 · T XP total"; 3 stats: 🔥 current streak, best streak, personal records.
- "Where your XP came from" table: one row per source with activity ("Quests captured", "Quests completed", "Sessions (workouts, Get Moving)", "Weigh-ins", "Personal records": "count × each", "+xp" green), "Streak bonuses" (+), "Missed days" (− orange `#ff8a65`), "Kept from going below 0" (+, if any); footer "Total". Empty: "No XP yet. Press Start: log something!"
- "Last N days" (max 14, newest first): date `EEE, MMM d` | active: "🔥 S[ · +E actions] · +B streak"; missed: "Missed · −L" or "Missed · free day"; today with nothing: "Nothing yet today" | running total.
- Collapsed "How XP works" panel: plain-language rules (values from constants).

#### `XpFeedback` (in app root)
- Effect compares previous `{xp, level, pr}`; skips first load. Pops (`.pop.pixel`, fixed top-right under banner, `aria-live` polite, pointer-events none): "New PR!" (yellow `#f8da92`, 2.2s), "+N XP" on increases only (green pill, 1.6s float-up/fade), "LEVEL UP! Lv N" with mushroom-pixel.png `.pixel-art` (32px, scale-in, 3.2s), "Level down: Lv N" (muted, 2.6s). Reduced motion: no animation.

#### Themed text
- Empty states: "Nothing logged yet. Press Start: tap "New entry"."; "No exercises yet. Press Start: …"; "Inbox empty. Mind clear!"; "No save data yet."

## Installable app (PWA) & hosting
- `ng add @angular/pwa`: `provideServiceWorker('ngsw-worker.js', {enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000'})`; works offline after first visit.
- `ngsw-config.json`: default app (prefetch) + assets (lazy) groups, plus `fonts` group caching `https://fonts.googleapis.com/**` and `https://fonts.gstatic.com/**` (lazy) so icons/fonts work offline.
- `public/manifest.webmanifest`: name/short_name "Level Up", description, `theme_color`/`background_color` `#121318`, portrait, standalone, `scope`/`start_url` `./`. Icons `public/icons/icon-{72…512}.png` (purpose `maskable any`): 512px mushroom at 66% centered on `#121318` (inside the maskable safe zone).
- `index.html`: title "Level Up", `theme-color` `#121318`, description, favicon `icons/icon-96x96.png`.
- `App` constructor calls `navigator.storage.persist()` (best effort) so the browser doesn't evict data under storage pressure.
- Hosting: public GitHub repo `parse-this/level-up`; GitHub Pages at `https://parse-this.github.io/level-up/`. `.github/workflows/deploy.yml` on push to `main`: `npm ci` → `ng test --watch=false` → `ng build --base-href /level-up/` → copy `index.html` to `404.html` (deep links) → `actions/upload-pages-artifact` + `actions/deploy-pages`. Pages source = GitHub Actions.
- Data never leaves the device; move it with Save / Load game.

## Bundle
- Initial bundle ≈ 480 kB (budget warning at 500 kB). Keep heavy things lazy (Tiptap loads with `QuestDetail`; confirm dialog loads on demand in the guard).

## TODO
- Settings section: configure max reps (replaces `MAX_REPS` constant; persist via `StorageService`). Later: km option for distance.
- Settings: streak cap (`DAILY_CAP`) as a setting.
- Weigh-in trend chart (weight over time; consider time of day from `createdAt`).
- Get Moving totals (distance, duration).
- Cloud sync between phone and PC (discussed: Firebase Firestore + Google sign-in recommended; deferred). For now: Save / Load game.
- Maybe: Gym/Home tag on Workout.

## Wish list
- Reminders: in-app (tabled) and outside the app (phone notifications; needs a server/push).
- Achievements (trophy room), 8-bit sound effects (mute in Settings), real VIT/AGI/STR stats.
- Auto-saving unsaved exercise drafts; warning on browser close.
