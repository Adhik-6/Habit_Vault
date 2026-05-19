# HabitVault - AI Agent Hand-off Document

Welcome! If you are an AI coding assistant working on this project, please read this document carefully before making any architectural or design changes. This document acts as the definitive source of truth for the codebase's conventions, architecture, and historical quirks.

## 1. Overview & Core Philosophy

HabitVault is an offline-first, local SQLite-backed mobile application built with React Native and Expo. 
- **Offline First:** There are no cloud dependencies. The app must work perfectly offline.
- **Cinematic Dark Mode:** The app relies on a strict design token system. We do not use Tailwind CSS, NativeWind, or ad-hoc inline styles for colors and padding.
- **Type Safety:** The project strictly adheres to TypeScript. Before finalizing any changes, always run `npx tsc --noEmit` to verify type safety.

## 2. Directory Structure

```text
habit_tracker/
├── app/                       # Expo Router file-based routing
│   ├── (tabs)/                # Main bottom tab navigator (Index, Habits, Dashboard, Insights, Settings)
│   ├── habit/                 # Dynamic routes (e.g., [id].tsx for Habit Dashboard)
│   └── _layout.tsx            # Root layout and global providers
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── charts/            # SVG-based charts (LineChart, WeekdayBarChart)
│   │   ├── common/            # Shared primitives (BottomSheet, MonthCalendar)
│   │   ├── dashboard/         # Dashboard widgets (CategoryAnalysis, etc.)
│   │   ├── habits/            # Habit forms and logic
│   │   └── insights/          # Detailed analytical views
│   ├── db/                    # SQLite initialization and schema
│   ├── design/                # Design tokens and base component styles
│   ├── hooks/                 # Custom React hooks for data aggregation
│   ├── services/              # SQLite CRUD operations and business logic
│   ├── store/                 # Zustand global state slices
│   └── utils/                 # Pure helper functions (Dates, IDs)
```

## 3. Data Model & Types

The core entities defined in `src/types.ts` are:

- **`Habit`**: The foundational object. Contains an `id`, `name`, `type` (`boolean`, `quantity`, `composite`), `frequencyRule` (JSON encoded rules like `["mon", "wed", "fri"]`), `icon`, `color`, and a `categoryId`. 
- **`HabitLog`**: A record of a habit on a specific date. Maps 1:1 with a habit and a `dateString`. Tracks `completedAt` and a `value` (for quantitative habits).
- **`Category`**: A grouping mechanism for habits. Formerly called "Stacks" in older DB migrations.

*Crucial Note:* When passing habits to UI components, we often use `HabitWithLog`, which is an intersection type that includes the raw `Habit` plus its `todayLog`, `isCompleted` boolean, `streak` data, and `strengthScore`.

## 4. State Management & Reactivity Loop

We use **Zustand** combined with SQLite. The state management loop is strict:

1. **Mutation:** A user performs an action (e.g., `archiveHabit()`). This writes directly to the SQLite DB via `src/services/habitService.ts`.
2. **Reload Store:** Immediately after the mutation, you MUST call `useHabitStore.getState().loadHabits()`. This fetches the latest active habits from the DB and stores them in memory.
3. **Recompute Analytics:** Inside `loadHabits()`, there is a chained call to `useAnalyticsStore.getState().recomputeAll()`. This forces the analytics store to recalculate heatmaps, streaks, and strength scores based on the new data.
4. **UI Reactivity:** Because the components subscribe to Zustand, the UI instantly updates without needing a hard reload.

*Rule of thumb:* Never update the Zustand store manually. Always mutate the DB first, then call `loadHabits()`.

## 5. Design System Constraints

**CRITICAL: Do NOT use generic React Native styles blindly.**

- **Tokens (`src/design/tokens.ts`):** You MUST use the `Colors`, `Spacing`, `Radius`, and `Typography` objects exported here.
  - Correct: `backgroundColor: Colors.surfaceElevated`, `padding: Spacing[4]`.
  - Incorrect: `backgroundColor: '#1E1E1E'`, `padding: 16`.
- **Primitives (`src/design/components.tsx`):** You MUST use the base styles provided here for layouts and text.
  - Correct: `<Text style={T.h2}>`, `<View style={Cards.base}>`, `<TouchableOpacity style={Buttons.primary}>`.

## 6. Navigation & Modal Layouts

- **BottomSheet Modals:** We use a custom `BottomSheet.tsx` component powered by `react-native-reanimated` (`withTiming` animations). 
- **Routing Safety:** When triggering a navigation event (like `router.back()`) from inside a modal callback, ensure you pop the router stack *before* awaiting any DB mutations. If a mutation drops the current item context from the store before the screen unmounts, you'll encounter a React layout crash (e.g., "Attempted to navigate before mounting...").

## 7. SVG Charts and Responsiveness

The application utilizes `react-native-svg` for robust data visualization (`LineChart`, `WeekdayBarChart`).
- **Responsive Widths:** SVGs in React Native cannot accept string percentages (e.g., `width="100%"`). Instead, wrap the SVG in a `<View>` and use the `onLayout` prop to capture the dynamic container width. Store this numeric width in local state and pass it into the chart component.

## 8. Exporting Data & Notifications

**Exports:** The app features a robust `exportService.ts`. It can generate both encrypted (AES-256) and unencrypted JSON and CSV backups. It uses `crypto-js` for encryption, writes to `expo-file-system`, and triggers the native OS Share Sheet via `expo-sharing`. Note that CSV backups now include category and habit fields to ensure comprehensive restoration.

**Notifications:** We use `expo-notifications` for daily reminders. The settings state (enabled toggle and reminder time) is persisted via `@react-native-async-storage/async-storage`. Notifications are scheduled as local, repeating daily calendar triggers.

## 9. Common Troubleshooting

1. **"App doesn't update after I add a habit"**: You forgot to call `await loadHabits();` after your DB mutation.
2. **"TypeScript error: Cannot find name X"**: Run `npx tsc --noEmit` frequently. Ensure all imports are absolute paths alias-mapped via `tsconfig.json` (e.g., `@src/`, `@components/`, `@design/`).
3. **"UI Flicker on Dashboard"**: Ensure you are using `LinearTransition.springify()` from `react-native-reanimated` for layout animations, not React Native's legacy `LayoutAnimation`.
