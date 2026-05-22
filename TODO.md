## TODO

## V2.x.x
1. Bad habit tracker - Implement an option to mark a habit as Bad habit. These habits must have an accent color of black-red diagonal gradient from top left to bottom right. These should be opposite to the normal habits.
2. Notification to remind users to input today's mood, and completed habits. The settings must have a section to let the users decide when they want to be reminded. The settings page must give an option to turn on or off the notification option and if turned on, the user can choose a time when they will be notified.

---

### Prompt for v2
<project_context>
You are working on HabitVault — an offline-first, local SQLite-backed mobile app built with React Native and Expo. Read the following architectural rules carefully before making any changes. They are non-negotiable.

ARCHITECTURE RULES:
- State mutations always follow this loop: mutate SQLite via habitService.ts → call loadHabits() → recomputeAll() fires automatically. Never update Zustand directly.
- Design tokens are mandatory. Use Colors, Spacing, Radius, Typography from src/design/tokens.ts. Never use raw hex values or numeric padding literals.
- Use primitive components from src/design/components.tsx: <Text style={T.h2}>, <View style={Cards.base}>, <TouchableOpacity style={Buttons.primary}>, etc.
- TypeScript is strict. Run `npx tsc --noEmit` before finalizing any file. All imports use tsconfig path aliases (@src/, @components/, @design/).
- SVGs cannot use percentage widths. Use onLayout to capture numeric container width and pass it as a prop.
- BottomSheet modals use react-native-reanimated (withTiming). Always call router.back() before awaiting DB mutations inside modal callbacks to avoid layout crashes.
- Layout animations use LinearTransition.springify() from react-native-reanimated, never LayoutAnimation.

CORE TYPES (from src/types.ts):
- Habit: { id, name, type ('boolean' | 'quantity' | 'composite'), frequencyRule (JSON), icon, color, categoryId }
- HabitLog: { id, habitId, dateString, completedAt, value }
- HabitWithLog: Habit & { todayLog, isCompleted: boolean, streak, strengthScore }
- Category: { id, name, icon, color }
</project_context>

<feature_request>
Implement bad habit tracking for HabitVault v2. Bad habits are the logical inverse of normal habits — their absence is good, their occurrence is bad. They must be treated as a locked system category (not user-deletable) with a black-to-red diagonal gradient accent (top-left to bottom-right).

The full list of app features that must account for bad habits is:
mood tracking, daily progress, habit types (counter, checklist, measurable, done/not done, duration), habit strength, intensity heatmap (habit-specific and overall), streak count, weekday performance, category analysis, habit ranking, consistency, completion %, insights, global strength score, mood score distribution across the week, and pattern analysis.
</feature_request>

<thinking_directives>
Before writing any code, think through the following problems deeply in order:

1. DATA MODEL
   - What is the minimal schema change needed on the Habit SQLite table? (Hint: a single boolean column)
   - How does HabitWithLog need to change? Specifically, devise a new computed field `contributesToProgress: boolean` that abstracts the inversion logic away from UI components so they remain unaware of habit polarity.
   - Should bad habits carry their own log type or reuse HabitLog as-is?

2. INVERSION LOGIC — reason through EVERY feature listed below and define what "inverted" means for each:
   - Daily progress: what is the new numerator for bad habits?
   - Streak: what breaks it vs. extends it? What should it be called in the UI?
   - Strength score: how does the formula invert? What inputs change sign?
   - Completion %: what does this metric mean for bad habits and what should it be labelled?
   - Consistency: same question.
   - Heatmap (habit-specific): should darker mean more occurrences (worse) or fewer (better)? How does the color scale change?
   - Overall heatmap: does a bad habit occurrence on a given day increase or decrease that day's score?
   - Global strength score: does bad habit occurrence drag it down? How?
   - Weekday performance: how does the framing flip ("most productive day" → "most vulnerable day")?
   - Category analysis: should bad habits be included or excluded from normal category rollups?
   - Habit ranking: does the ranking list mix good and bad habits or separate them?
   - Insights: what are 3 example insight templates specific to bad habits?
   - Mood correlation: which direction does the correlation run for bad habits vs. good habits?
   - Pattern analysis: what patterns are meaningful for bad habits that aren't for good habits?

3. ARCHITECTURAL STRATEGY
   - Where exactly in the codebase does the inversion logic live? (Hint: push it as low as possible — ideally into the analytics recomputation layer, not into UI components)
   - How do you protect existing components from needing to know about habit polarity? What is the contract?
   - The `contributesToProgress` field: write out its exact boolean expression.
   - For the locked "Bad Habits" system category: how is it seeded into SQLite on first install and protected from deletion?
   - How does the black-red diagonal gradient get implemented in React Native? (No CSS — use LinearGradient from expo-linear-gradient with specific start/end coordinates)

4. IMPLEMENTATION PLAN
   After your full reasoning, produce a step-by-step implementation plan ordered by dependency (schema first, then service layer, then store, then UI). For each step specify:
   - Which file(s) to modify or create
   - What exactly changes (function signatures, new fields, modified queries)
   - Any TypeScript type changes required
   - Risk level (Low / Medium / High) and why
</thinking_directives>

<output_format>
Structure your final output as follows:

## 1. Schema & Type Changes
(All SQLite and TypeScript type modifications)

## 2. Inversion Logic Reference Table
(A table: Feature | Normal Behavior | Bad Habit Behavior | Label Change)

## 3. Architectural Decisions
(Where inversion logic lives, the contributesToProgress contract, system category seeding, gradient implementation)

## 4. Implementation Plan
(Ordered steps with file targets, change descriptions, type impacts, and risk levels)

## 5. Code
(All modified and new files in full — no partial snippets, no placeholders. Every file must be complete and type-safe.)
</output_format>

---

## Final
1. Update the `README.md` and `AI_INFO.md` accoding to the new featuers added.
2. Verify if the follwoing has been done - Make sure the mood data, category data & the habits under the category is also backed up along the category's chosen color.
3. Change the names of app assets to have '_' and also their occurences.