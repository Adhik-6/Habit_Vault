## Commands
1. `npm start` - Start the development server
2. `npx expo start -c` - Start the development server with cache clearing
3. `npm install -g eas-cli` - Install EAS CLI for building and submitting apps
4. `eas login` - Log in to your Expo account through the CLI
5. `npx eas build:configure` - Configure EAS build for the project
6. `npx eas build -p android --profile production --clear-cache` - Build the Android app for production with cache clearing
7. `npx eas build -p ios --profile production --clear-cache` - Build the iOS app for production with cache clearing
8. `npx eas submit -p android --latest` - Take the latest build from EAS and upload it to the Google Play Store.
9. `npx expo install <package-name>` - Install a specific package using Expo's package manager (use this instead of `npm install` for Expo packages)
10. `npx expo run:android` - Run the app on an Android emulator or connected device


### Generating the APK using eas
1. `npm install -g eas-cli` - Install EAS CLI globally if you haven't already.
2. `eas login` - Log in to your Expo account through the CLI.
3. `npx eas build:configure` - Configure EAS build for the project (only needed the first time).
4. Open the generated eas.json and tell it to output an APK file instead of an AAB:
```json
{
  "cli": {
    "version": ">= 10.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```
5. `npx eas build -p android --profile production --clear-cache` - Build the Android app for production with cache clearing. This will generate an APK file due to the configuration in eas.json.
6. Once the build is complete, you can download the APK from the EAS build dashboard.

### Full Reset Script
```bash
# Run these commands at the root of the projects
rm -rf android
rm -rf ios
rm -rf node_modules
rm -rf .expo
rm -rf package-lock.json
npm install
npx expo prebuild --clean
npx eas build -p android --profile production --clear-cache
```

### Workflow
1. Make changes
2. `npx expo start`
3. Test
4. `npx expo prebuild --clean` (if config/assets changed)
5. `npx eas build -p android --profile production --clear-cache`
6. Install APK

### Workflow in local building
1. Make changes
2. `npx expo prebuild --platform android --clean` - Only needed for first time initialization.
3. `cd android`
4. `./gradlew assembleRelease`
5. The final generated apk file is available at `android/app/build/outputs/apk/release/app-release.apk`

### If Ran into errors while building the app:
1. `cd ./android/`
2. `rm -rf app/.cxx app/build`
3. `./gradlew clean`
4. Finally `./gradlew assembleRelease`

### A Note on Counter Heatmap Intensity
- Regarding your note about the "Counter" heatmap not getting brighter: GitHub's actual contribution algorithm works by finding the highest activity recorded across the entire year, and grading every other day relative to that single maximum value.
- If you only log activity on a single day (even if you click it 100 times), that day is technically the "max" value for the year, so it will correctly default to the absolute brightest tier (Tier 4). It will only start showing different colored tiers once you log activity on a second day and compare the two days against each other.

# Prompt to update the AGENTS.md

Read [AGENTS.md](./AGENTS.md) first before proceeding.

You are a senior software architect performing a full technical audit of a React Native + Expo 
codebase. Your job is to read every relevant file in this project and produce an updated, 
comprehensive AGENTS.md document that will serve as the definitive handoff document for any 
future AI coding assistant.

CRITICAL CONTEXT: This project already has an existing AGENTS.md. You are NOT writing from 
scratch. You are performing a diff-aware update — read the existing AGENTS.md first, then 
read the source files, and produce a new AGENTS.md that:
- Preserves all still-accurate information from the existing AGENTS.md
- Corrects any outdated information (schema changes, removed types, renamed functions)
- Adds all newly implemented features, components, stores, and conventions
- Removes all references to deprecated features (e.g. duration habit type, CSV export)

Do NOT rely on assumptions or prior knowledge. Read the actual source files. If something 
conflicts between the existing AGENTS.md and the source files, the SOURCE FILE wins.

---

## KNOWN CHANGES SINCE LAST AGENTS.md
The following features and fixes have been implemented since the last audit. 
Pay special attention to these areas during your read passes:

### v2.x.x Changes
- Streak calculation overhauled: now frequency-aware (counts consecutive SCHEDULED days, 
  not calendar days). Bad habit clean streaks also follow this rule.
- Dashboard "Today's Completion %" now correctly applies bad habit inversion 
  (`contributesToProgress` logic unified across Dashboard and Today tab).
- Global heatmap bad habit contribution logic updated: proportional contribution 
  based on number of bad habits NOT completed that day.
- Habit creation timezone fix: `createdAt` is now anchored to local date, not UTC.
- Weekday performance bar chart: now uses full current month data (not last 7 days), 
  bad habit inversion applied.
- Checklist habits: now contribute fractionally to completion (e.g. 2/5 items = 0.4 weight).
- Bad habit heatmap polarity fixed in habit-specific dashboard: marked = clean day, 
  unmarked = occurrence day.
- Top Habits list: now requires minimum 7 scheduled days before a habit is eligible 
  (maturity gate). Falls back to all habits if none qualify.
- Category creation modal: bad habit system category displays black-to-red diagonal 
  LinearGradient instead of flat red.
- Calendar dot indicators: bad habit occurrence dots use LinearGradient. Overflow 
  behavior replaced — max 3 dots with opacity blend on 3rd instead of "+N" label. 
  Spacing between date and dots increased.
- Mood Trend chart unified: single `MoodTrendChart` component used in both Dashboard 
  and Insights > Mood tab. Shows full current month, has X/Y axis labels, rotated 
  date labels to prevent collision.
- Weekday bar chart unified: single `WeekdayBarChart` component used across Dashboard 
  and Insights > Patterns tab.
- Heatmap cell modal in habit-specific dashboard optimized: no DB reads on tap, 
  no recomputeAll() on tap, uses pre-fetched store data only.
- Insights page "Key Insights" section: collapsed by default (6 visible), "Show all N" 
  expand toggle with Reanimated layout animation.
- Key Insights component unified: single component with type-based icon color map used 
  in both Dashboard and Insights pages.
- Failure reason logging added: long-press or "?" icon on missed habit cards (past 
  dates only, good habits only) opens BottomSheet with GoodHabitFailureReason chips 
  + free text input. Persisted to habit_logs.failureReason and failureCustomText.
- Weekday bar chart aggregation fixed: completionRate = completions / scheduled 
  occurrences per weekday, capped at 1.0. Bad habit inversion applied.
- JSON export now includes settings: accentColor, notificationsEnabled, reminderTime, 
  passwordHash, recoveryQuestions.
- Export/import now includes all categories with their colors and icons.
- Import now restores AsyncStorage-persisted Zustand stores after DB restore.
- Import now calls useStreakTargetStore.getState().loadTargets() explicitly after restore.
- CSV export and CSV import permanently removed.
- Export now offers two modes: Encrypted (AES-256, existing) and Plain (raw JSON, 
  no password). Filename differentiated: habitvault-backup-plain-[date].json vs 
  habitvault-backup-[date].json. Import auto-detects plain vs encrypted.
- Global UI performance: optimistic UI updates on all habit interactions 
  (boolean toggle, counter increment, checklist item check). recomputeAll() debounced 
  at 1.5s after last interaction. loadHabits() no longer called on every tap.
- Habits filter: now supports multi-select for both habit type and category filters. 
  OR logic within groups, AND logic between groups.
- White screen flash on back navigation from habit dashboard: mitigated via 
  backgroundColor: Colors.background on root containers and screen options. 
  unmountOnBlur set to false for Habits tab. Documented as partially unresolvable 
  in code comments if flash persists.
- Edit button pen icon in habit-specific dashboard now uses category color 
  (Colors.danger for bad habits, Colors.textSecondary as fallback).
- "Clean Strength" KPI label in bad habit dashboard: renamed to "Strength" or 
  uses adjustsFontSizeToFit to prevent line wrapping.
- Uncategorized habits group now shows congratulatory state when all habits complete.
- Habit creation/edit form: added optional Step Size input for quantity habits.
- Custom streak targets feature (Goals): new tab in Insights page. Users can create 
  N-day streak goals for any habit. Bad habit goals count clean days. Goals auto-mark 
  as achieved. streak_targets table added. useStreakTargetStore added. 
  loadTargets() called inside debouncedRecomputeAll in useHabitStore.
- Quantity habit counter: now an inline tappable TextInput supporting decimal values. 
  − and + buttons use stepValue. Invalid input flashes Colors.danger border via 
  Reanimated withTiming then reverts. Buttons disabled while input focused.

### v3.x.x Changes
- duration habit type permanently removed from HabitType union.
- All existing duration habits migrated to quantity type (DB migration v9).
- durationSeconds values converted to value in minutes for all affected logs.
- durationSeconds column left nullable in schema, no longer written to.
- stepValue REAL DEFAULT 1 column added to habits table (DB migration v8).
- Habit form unified: no more separate duration form fields. Quantity form now 
  handles all numeric tracking including time-based habits via unit field.
- All duration-specific branches removed from: logService.ts, habitService.ts, 
  useHabitStore.ts, analytics.ts, HabitCard.tsx, HabitForm.tsx, habit/[id].tsx.

---

## EXTRACTION PROTOCOL

Work through the project in this strict order. Do not skip any pass.

### PASS 0 — Read Existing AGENTS.md
- Read the current AGENTS.md in full
- Make a mental note of every section and its contents
- Flag any section that you suspect may be outdated based on the KNOWN CHANGES above
- You will update flagged sections during the relevant pass below

### PASS 1 — Project Skeleton
- Read package.json → extract all dependencies, devDependencies, and scripts. 
  Note any new packages added (e.g. expo-linear-gradient if newly added).
- Read tsconfig.json → extract all path aliases
- Read app.json / app.config.ts → extract Expo config, plugins, permissions
- Read the full directory tree → map every folder and file. 
  Note any new files or folders not present in the old AGENTS.md.

### PASS 2 — Data Layer
- Read src/types/index.ts → document EVERY type/interface/enum in full.
  Confirm duration is removed from HabitType.
  Confirm StreakTarget and StreakTargetWithProgress are present.
  Confirm Habit has stepValue.
- Read src/db/schema.ts → document the full SQLite schema including all migrations.
  Confirm streak_targets table is present.
  Confirm stepValue column is in habits table.
  Confirm durationSeconds is nullable and no longer written to.
  Document migration history: what each version changed.
- Read src/services/ → document every exported function including new ones:
  streakTargetService.ts (new), updated exportService.ts, updated logService.ts.

### PASS 3 — State Management
- Read every Zustand store including useStreakTargetStore.ts (new).
- Document the FULL updated mutation loop:
  User action → optimistic todayLogsMap update → async DB write → 
  debouncedRecomputeAll (1.5s) → loadTargets() inside recomputeAll → UI update
- Document the loadHabits() vs debouncedRecomputeAll() distinction explicitly:
  loadHabits() = mount + structural changes only
  debouncedRecomputeAll() = every log interaction

### PASS 4 — Business Logic & Utilities
- Read src/utils/analytics.ts → document ALL formulas including:
  - Updated streak calculation (frequency-aware, scheduled days only)
  - Updated buildDayIntensities (bad habit proportional contribution)
  - Updated weekday performance (full month window, bad habit inversion, capped at 1.0)
  - Updated checklist contribution (fractional weight)
  - Updated Top Habits eligibility gate (7-day minimum)
  - Mood correlation (unchanged, confirm)
  - Insights generator (unchanged, confirm)
- Read src/hooks/ → document all hooks including useAccentColors (confirm unchanged)

### PASS 5 — UI Architecture
- Read src/design/tokens.ts → extract every token. Note any new tokens added.
- Read src/design/components.ts → document every primitive. Note any new ones.
- Read src/components/ recursively → for each component document:
  - Props interface
  - Internal state
  - Design tokens used
  - Animation logic
  - Special constraints or quirks
  Pay special attention to NEW or MODIFIED components:
  - MoodTrendChart (new unified component)
  - WeekdayBarChart (confirmed single component)
  - GoalsTab (new)
  - AddStreakTargetSheet (new)
  - InsightCard (unified, confirm single component)
  - HabitCard (updated: inline TextInput counter, stepValue, LinearGradient dots)
  - HabitForm (updated: stepValue input, duration removed)
  - Calendar component (updated: dot overflow behavior, LinearGradient bad habit dots)

### PASS 6 — Routing & Navigation
- Read app/_layout.tsx → document boot sequence (confirm still 4-step + 150ms delay).
  Note the console.error monkey-patch for Expo notifications warning.
- Read app/(tabs)/_layout.tsx → confirm unmountOnBlur settings per tab.
- Read all tab screens and dynamic routes.
- Document the new Goals tab in app/(tabs)/insights.tsx.
- Document navigation conventions: confirm router.back() safety rules unchanged.

### PASS 7 — Features Deep Dive
Trace each feature end-to-end (UI → hook/store → service → DB):

Existing features (confirm still accurate, update where changed):
- Habit creation and editing (now includes stepValue, no duration type)
- Habit completion — boolean (optimistic update flow)
- Habit completion — quantity (inline TextInput, decimal, stepValue, optimistic)
- Habit completion — checklist/composite (fractional contribution, optimistic)
- Bad habit tracking (all inversion logic, gradient visuals, clean streak)
- Streaks (frequency-aware calculation, bad habit clean streak)
- Strength scoring (maturity gate for Top Habits)
- Category management (LinearGradient for bad habit category)
- Dashboard (updated completion %, updated heatmap, updated weekday chart)
- Insights — Overview tab (collapsed Key Insights, unified InsightCard)
- Insights — Patterns tab (fixed weekday bar, failure reasons display)
- Insights — Mood tab (unified MoodTrendChart)
- Data export (plain vs encrypted, full payload, auto-detect on import)
- Notifications (unchanged, confirm)
- Archiving and deletion (unchanged, confirm)
- Habits filter (multi-select)

New features (document fully):
- Custom Streak Targets / Goals tab (full end-to-end trace)
- Failure reason logging (trigger, UI, persistence, display in Patterns tab)
- Plain JSON export / auto-detect import

### PASS 8 — Conventions & Rules
- Carry forward all existing conventions
- Add any new conventions introduced:
  - Optimistic UI update pattern (todayLogsMap first, async DB write, rollback on fail)
  - Debounced recomputeAll pattern (1.5s, useRef timer)
  - loadHabits() call discipline (mount + structural changes only, never on tap)
  - LinearGradient usage rule (bad habit category and calendar dots only)
  - Maturity gate rule (7 scheduled days before Top Habits eligibility)
  - Multi-select filter state shape (arrays, not single values)
- Update Known Issues:
  - Remove any issues that have been resolved
  - Add: white screen flash on back navigation (partially mitigated, documented)
  - Add: durationSeconds column is nullable dead weight, cleanup deferred to future migration
  - Confirm: WAL delay workaround still present
  - Confirm: App lock cryptography weakness still present
  - Confirm: Expo notifications warning monkey-patch still present

---

## OUTPUT FORMAT

Produce a single Markdown document titled AGENTS.md. 
Structure it with ALL of these sections:

1. Project Overview & Philosophy
2. Tech Stack & Dependencies (full list with versions)
3. Directory Structure (annotated tree — include every new file)
4. Path Aliases
5. Database Schema (all tables, all columns, full migration history)
6. Data Types & Interfaces (every type, confirm duration removed, StreakTarget added)
7. Services & CRUD Operations (include streakTargetService, updated exportService)
8. State Management (all stores including useStreakTargetStore, full updated mutation loop)
9. Business Logic & Analytics (all formulas, all updated rules)
10. Custom Hooks
11. Design System (all tokens, all primitives)
12. Component Catalog (every component — new and updated ones clearly marked)
13. Routing & Navigation Map (include Goals tab)
14. Feature Deep-Dives (one section per feature, new features fully documented)
15. Coding Conventions & Hard Rules (updated with new patterns)
16. Known Issues, TODOs & Technical Debt (updated — resolved issues removed)
17. Troubleshooting Guide (update if new failure modes exist)

Formatting rules:
- Mark any section that changed significantly from the previous AGENTS.md with 
  a comment: <!-- Updated: [reason] -->
- Mark any fully new section or subsection with <!-- New -->
- Be exhaustive. Prefer specificity over brevity.
- A future AI agent reading this document must be able to work on any part 
  of this codebase without looking at a single source file.
- Do not include any content that you cannot verify from the source files.
  If something is in the old AGENTS.md but not found in the source, 
  mark it as <!-- Unverified: could not locate in source --> rather than 
  silently dropping or silently keeping it.