# AGENTS.md — Definitive Technical Handoff Document

This document serves as the complete technical audit and architectural map of the **Habit Vault** codebase (React Native + Expo). Any AI agent or developer working on this project must consult this document before proposing changes. 

---

## 1. Project Overview & Philosophy
- **Core Mission**: An offline-first, highly analytical habit tracker with a cinematic dark mode design.
- **Offline First**: All data is stored locally via `expo-sqlite`. There are no cloud dependencies or API calls for core functionality.
- **Cinematic Dark Mode**: The UI relies on a strict, robust design token system (`@design/tokens` and `@design/components`). Ad-hoc inline styles for colors and layouts are strictly prohibited.
- **Rich Analytics**: Computes deep insights, consistency scores, failure patterns, and mood correlations purely client-side.
- **State Flow**: Unidirectional mutation loop. DB writes always precede global state updates and background analytics recalculations.

---

## 2. Tech Stack & Dependencies
- **Framework**: React Native 0.81.5 + Expo SDK 54 (`expo` ~54.0.33)
- **Language**: TypeScript (`strict: true`)
- **Routing**: Expo Router 6 (`expo-router` ~6.0.23) + React Navigation 7
- **Database**: `expo-sqlite` ~16.0.10
- **State Management**: Zustand 5 (`zustand` ^5.0.12) with `@react-native-async-storage/async-storage` for persistence.
- **UI & Styling**: 
  - Strict custom token system (`src/design/`)
  - Typography: `@expo-google-fonts/inter`
  - Icons: `@expo/vector-icons`
  - Lists: `@shopify/flash-list`
- **Native Modules**: `expo-notifications`, `expo-haptics`, `expo-file-system`, `expo-secure-store`, `expo-document-picker`, `expo-linear-gradient`.

---

## 3. Directory Structure
```text
habit_tracker/
├── app/                        # Expo Router file-based routing
│   ├── (tabs)/                 # Main bottom tab navigator
│   │   ├── _layout.tsx         # Tab configuration
│   │   ├── index.tsx           # Today tab
│   │   ├── dashboard.tsx       # Dashboard tab
│   │   ├── habits.tsx          # Habits tab
│   │   ├── insights.tsx        # Insights tab (includes Goals tab)
│   │   └── settings.tsx        # Settings tab
│   ├── habit/                  # Dynamic routes
│   │   └── [id].tsx            # Specific habit deep-dive dashboard
│   ├── _layout.tsx             # Root layout, DB initialization, Providers
│   └── modal.tsx               # General modal screen
├── src/
│   ├── components/             # UI Components (common, dashboard, habits, insights, settings)
│   ├── db/                     # SQLite schema and initialization
│   ├── design/                 # Design tokens and primitive stylesheet factories
│   ├── hooks/                  # Custom React hooks (e.g., use-accent-colors)
│   ├── services/               # DB CRUD operations & abstractions (includes streakTargetService.ts)
│   ├── store/                  # Zustand stores (Habits, Analytics, Mood, Auth, Settings, StreakTargets)
│   ├── types/                  # TypeScript interfaces and types
│   └── utils/                  # Analytics math, date manipulations, ID generation
├── package.json                # Dependencies and scripts
└── tsconfig.json               # Path aliases and compiler options
```

---

## 4. Path Aliases
Defined in `tsconfig.json`, strictly enforced:
- `@/*` → `./*`
- `@src/*` → `./src/*`
- `@design/*` → `./src/design/*`
- `@store/*` → `./src/store/*`
- `@services/*` → `./src/services/*`
- `@utils/*` → `./src/utils/*`
- `@db/*` → `./src/db/*`
- `@types/*` → `./src/types/*`

---

## 5. Database Schema
Stored in `src/db/schema.ts` and managed via `src/db/database.ts`. Database is `habitvault.db` running in WAL journal mode.

<!-- Updated: Added streak_targets, stepValue, and noted durationSeconds is legacy -->
**Tables:**
- `migrations`: (id, version, appliedAt). Tracks DB schema evolution.
- `categories`: (id, name, icon, color, sortOrder, createdAt).
  - Contains a locked system category for bad habits: `__bad_habits__`.
- `habits`: 
  - `id`, `name`, `description`, `type` (boolean|quantity|composite|counter)
  - `targetValue`, `stepValue` (REAL, DEFAULT 1), `unit`, `frequencyRules` (JSON), `color`, `icon`
  - `categoryId` (FK to categories, ON DELETE SET NULL)
  - `compositeSteps` (JSON array)
  - `createdAt`, `archivedAt` (soft delete), `sortOrder`
  - `isBadHabit` (INTEGER boolean)
- `habit_logs`: 
  - `id`, `habitId` (FK), `date` (YYYY-MM-DD), `value`, `completedAt` (ISO timestamp or null)
  - `durationSeconds` (nullable dead weight, retained for schema compatibility, NOT written to)
  - `notes`, `moodRating`, `failureReason`, `failureCustomText`
  - `compositeProgress` (JSON object map of stepId -> boolean)
- `mood_logs`: (id, date UNIQUE, score, emoji, notes, createdAt).
- `failure_reasons`: (id, habitId FK, logId FK, reason, customText, createdAt).
- `achievements`: (id, type UNIQUE, unlockedAt, metadata).
- `streak_targets`: (id, habitId FK, label, targetDays, createdAt, achievedAt).

**Indexes:** Optimized for date and habitId lookups.

---

## 6. Data Types & Interfaces
Defined in `src/types/index.ts`.

<!-- Updated: duration removed from HabitType, StreakTarget added, Habit includes stepValue -->
**Core Types:**
- `HabitType`: `'boolean' | 'quantity' | 'composite' | 'counter'`
- `FrequencyType`: `'daily' | 'weekly' | 'custom'`
- `GoodHabitFailureReason` / `BadHabitSlipReason`: Enums for why a habit failed.

**Analytics Interfaces:**
- `StreakData`: `{ current, longest, lastCompletedDate }`
- `HabitStrengthScore`: `{ habitId, score (0-100), completionRate, consistencyScore, streakBonus, streak, isBadHabit, scheduledDaysCount }`
- `DayIntensity`: Used for heatmaps. `{ date, completedCount, totalCount, intensityTier (0-4), completionRate, moodScore }`
- `HabitInsight`: Textual insights generated dynamically. `{ type, message, data }`
- `FailurePattern`: Aggregation of reasons a habit failed.
- `MoodCorrelation`: Pearson correlation data mapping mood to habit completion.

**Goals (New):**
- `StreakTarget` / `StreakTargetWithProgress`: Represents user-defined N-day custom targets.

---

## 7. Services & CRUD Operations (`src/services/`)
Services act as the sole bridge to SQLite. Stores must call services to mutate data.
- **`habitService.ts`**: `getHabits`, `getHabitById`, `createHabit`, `updateHabit`, `archiveHabit`, `deleteHabit`, `filterHabitsForDate`.
  - *Quirk*: `createHabit` forces `categoryId = '__bad_habits__'` if `isBadHabit` is true.
- **`logService.ts`**: `getLogsForDate`, `logHabit`, `toggleBooleanHabit`, `incrementCounter`, `toggleCompositeStep`, `updateQuantity`. Handles complex partial updates of `habit_logs`.
- **`streakTargetService.ts`**: New service for creating, fetching, and updating goal `streak_targets`.
- **`moodService.ts`**: `logMood`, `getMoodLogs`, `deleteMoodLog`.
- **`categoryService.ts`**: Standard CRUD for categories.
- **`exportService.ts`**: Generates full JSON dumps of the DB and restores them. Supports Plain and Encrypted backups (auto-detected on import). Auto-restores `categories` including custom colors and icons, along with AsyncStorage items.
- **`devData.ts`**: Tools to `clearAllData()` and `generateSampleData()` for testing.

---

## 8. State Management (`src/store/`)
Zustand is used for UI reactivity.

**Stores:**
- **`useHabitStore.ts`**: Manages `habits`, `categories`, `todayLogsMap` (logs for the currently selected date), and cached streaks/scores.
  - *Mutation Loop*: Action updates `todayLogsMap` (optimistic UI) → calls DB Service → DB writes → Action calls `debouncedRecomputeAll()` (1.5s delay) to compute global analytics and `loadTargets()`.
  - *Rule*: `loadHabits()` is only for structural changes or app mount. Never call on simple log interactions.
- **`useAnalyticsStore.ts`**: Calculates all insights, global heatmaps, scores, and correlations based on the last 365 days of data.
- **`useMoodStore.ts`**: Manages `moodByDate` mapping.
- **`useStreakTargetStore.ts`**: Manages custom goals and checks for achievements against current streaks.
- **`useAuthStore.ts`**: Uses `AsyncStorage` persistence. Stores `passwordHash` (a simple custom hash function, not crypto-secure) and `recoveryQuestions`.
- **`useSettingsStore.ts`**: Uses `AsyncStorage` persistence. Stores global `accentColor`, `notificationsEnabled`, and `reminderTime`.

---

## 9. Business Logic & Analytics (`src/utils/analytics.ts`)
The true brain of the app, heavily mathematical.

<!-- Updated: frequency-aware streaks, heatmap logic, Top Habits gate -->
**Key Formulas:**
- **Inversion Logic (Bad Habits)**: 
  - For good habits, `completedAt != null` is a success.
  - For bad habits, `completedAt != null` is a failure (occurrence). A "clean" day is a scheduled day with NO completed log.
- **Streak Calculation (`computeStreak`)**: Frequency-aware. Counts consecutive scheduled positive days (ignores days the habit wasn't scheduled). Bad habits track clean streaks.
- **Consistency Score (`computeConsistencyScore`)**: Calculates weekly occurrences, computes the standard deviation and coefficient of variance.
- **Habit Strength Score (`computeHabitStrengthScore`)**: 
  - Base formula: `(Completion Rate * 50) + (Consistency Score * 30) + (Streak Bonus up to 20)` = 0 to 100.
  - *Maturity Gate*: Only habits with at least 7 scheduled days are eligible for "Top Habits" list.
- **Heatmap Denominator**: Bad habits now proportionally contribute to the global completion rate if avoided successfully.
- **Checklist fractional weights**: Checklist progress maps as a decimal (e.g., 2/5 steps = 0.4 weight).
- **Mood Correlation (`computeMoodCorrelation`)**: Standard Pearson correlation (-1 to 1).

---

## 10. Custom Hooks
- **`useAccentColors()`**: Dynamically derives muted, glow, and dim variations of the user's currently selected Accent Color from `useSettingsStore`. Used extensively across the UI to allow global color theming.

---

## 11. Design System (`src/design/`)
Absolutely strict custom design system. Do NOT use standard React Native `StyleSheet.create` for colors/padding in components without referencing tokens.

- **`tokens.ts`**:
  - `Colors`: Hex codes mapped to semantic names (e.g., `surface`, `accentGlow`, `successDim`). Contains explicit maps for `intensity` (heatmaps) and `mood` colors.
- **`components.ts`**: Pre-composed, reusable StyleSheet objects.
  - `Layout`, `Cards`, `Buttons`, `Text`, `Inputs`, `Badges`, `Divider`, `Sheet`, `Progress`.

---

## 12. Component Catalog
<!-- Updated: Noted new components and updates -->
- **`HabitCard`**: Includes inline `TextInput` counter for quantity habits, decimal support, and `stepValue` increments. Bad habit occurrences use `LinearGradient` dots.
- **`HabitForm`**: Unified form for all habit types. Includes optional "Step Size" input for quantity habits. The `duration` type form has been permanently removed.
- **`MoodTrendChart` / `WeekdayBarChart`**: Unified, reusable chart components used across Dashboard and Insights.
- **`Calendar`**: Overflow logic updated (max 3 dots, opacity blend). Bad habit dots use `LinearGradient`.
- **`InsightCard`**: Unified insight card with icon type mapping.
- **`GoalsTab` / `AddStreakTargetSheet`**: New UI components for creating and tracking custom N-day streak targets.

---

## 13. Routing & Navigation Map (`app/`)
Uses Expo Router.

- **`_layout.tsx` (Root)**: Initializes DB. 4-step boot sequence with 150ms WAL delay. Patches Expo notifications warning.
- **`(tabs)/_layout.tsx`**: Bottom Tab Navigator. `unmountOnBlur` is `false` for the Habits tab to mitigate white screen flashes.
- **`(tabs)/index.tsx`**: The "Today" screen.
- **`(tabs)/dashboard.tsx`**: High-level KPIs, global heatmaps, Mood Trend chart.
- **`(tabs)/habits.tsx`**: Full catalog of all habits, category management.
- **`(tabs)/insights.tsx`**: Deep analytics. Now contains `Overview`, `Patterns`, `Mood`, and `Goals` tabs.
- **`(tabs)/settings.tsx`**: Backup, export, app lock, accent color selection.
- **`habit/[id].tsx`**: Dynamic route. Shows deep analytics, failure reason distributions, and editing modal for a specific habit.
- **`modal.tsx`**: General purpose full-screen modal route.

---

## 14. Feature Deep-Dives
<!-- New: Added custom streak targets, failure reason logging, export updates -->
- **Custom Streak Targets (Goals)**: Users can define an N-day goal for any habit. Managed via `streak_targets` table. UI lives in `Insights > Goals`. Bad habit goals correctly count clean streaks.
- **Failure Reason Logging**: Missed good habits in the past display a "?" icon. Long-pressing opens a sheet to log a predefined `GoodHabitFailureReason` or custom text. Data is persisted to `habit_logs.failureReason` and displayed in `Insights > Patterns`.
- **Data Export & Import**:
  - Export supports both Plain JSON (no encryption) and Encrypted JSON (AES-256).
  - Backups include ALL tables (including streak targets and categories) and ALL AsyncStorage configs (accent color, notifications, auth).
  - Import automatically detects whether the selected file is Plain JSON or Encrypted. Restores DB tables first, then Zustand state.

---

## 15. Coding Conventions & Hard Rules
1. **Never use `inline` static colors**. Always use `Colors.*` or `useAccentColors()`.
2. **Offline-only**. No Axios, no Fetch.
3. **Zustand Mutation Rule (Optimistic UI)**: Update UI local state (`todayLogsMap`) first → Await DB service response → Call `debouncedRecomputeAll()` to update heavy analytics without blocking the main thread.
4. **Bad Habit Logic**. When dealing with `isBadHabit = true`, remember that a "completed" log means the user FAILED (they did the bad habit).
5. **Multi-Select Filters**: Filter state for habit types and categories uses arrays. Logic is OR within groups, AND between groups.
6. **No Duration Type**: The `duration` habit type is dead. All time-based tracking is handled via `quantity` type with a time string in the `unit` field.

---

## 16. Known Issues, TODOs & Technical Debt
- **White Screen Flash**: Brief white screen flash on back navigation from `habit/[id].tsx` is mitigated via root `backgroundColor` and `unmountOnBlur: false`, but may still partially occur.
- **App Lock Cryptography**: `useAuthStore` uses a very simple bitwise hash for passwords. It is not cryptographically secure.
- **WAL Journal Mode Delay**: In `app/_layout.tsx`, there is an explicit `setTimeout(resolve, 150)` after `initDatabase()` to fix Android SQLite Write-Ahead Log flushing issues. Do not remove.
- **Expo Notifications Warning**: Monkey-patch in `app/_layout.tsx` to suppress missing push notification support warnings in Expo Go SDK 54.
- **durationSeconds dead weight**: The `durationSeconds` column in `habit_logs` remains for legacy compatibility, but is nullable and no longer written to.

---

## 17. Troubleshooting Guide
- **Foreign Key Constraint Errors**: If a habit links to a non-existent category, it fails. Handled gracefully via `ON DELETE SET NULL` constraints when categories are removed.
- **Analytics Not Updating Immediately**: Due to `debouncedRecomputeAll()`, global charts and insights take ~1.5s to update after a tap. This is intentional to prevent UI freezing.
- **Malformed UTF-8 Error on Import**: Caused by an incorrect passphrase during encrypted JSON restore (crypto-js fails to decode garbage bytes). The UI now intercepts this and displays a correct error message.
