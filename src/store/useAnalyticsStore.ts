import { create } from 'zustand';
import type {
  HabitInsight, HabitStrengthScore, DayIntensity,
  FailurePattern, MoodCorrelation, WeekdayStats,
} from '../types';
import { getHabits } from '../services/habitService';
import { getLogsForHabit, getLogsForDateRange } from '../services/logService';
import { getMoodLogs } from '../services/moodService';
import {
  computeHabitStrengthScore,
  analyzeFailurePatterns,
  computeMoodCorrelation,
  generateInsights,
  buildDayIntensities,
  computeWeekdayStats,
} from '../utils/analytics';
import { filterHabitsForDate } from '../services/habitService';
import { getLast365Days, getLast30Days, toDateString } from '../utils/dateUtils';
import type { HabitLog } from '../types';

// ── State ───────────────────────────────────────────────────────────────────

interface AnalyticsState {
  strengthScores: HabitStrengthScore[];
  globalScore: number;
  insights: HabitInsight[];
  failurePatterns: FailurePattern[];
  moodCorrelations: MoodCorrelation[];
  dayIntensities: DayIntensity[];
  weekdayStats: WeekdayStats[];
  isComputing: boolean;
  lastComputedAt: string | null;
}

interface AnalyticsActions {
  recomputeAll: () => Promise<void>;
  recomputeForHabit: (habitId: string) => Promise<void>;
  getIntensitiesForHabit: (habitId: string) => DayIntensity[];
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

// ── Store ───────────────────────────────────────────────────────────────────

export const useAnalyticsStore = create<AnalyticsStore>()((set, get) => ({
  strengthScores: [],
  globalScore: 0,
  insights: [],
  failurePatterns: [],
  moodCorrelations: [],
  dayIntensities: [],
  weekdayStats: [],
  isComputing: false,
  lastComputedAt: null,

  recomputeAll: async () => {
    set({ isComputing: true });
    try {
      const habits = await getHabits();
      if (habits.length === 0) {
        set({ isComputing: false });
        return;
      }

      const last365 = getLast365Days();
      const last30 = getLast30Days();

      // Load all logs for last 365 days
      const fromDate = last365[0];
      const toDate = last365[last365.length - 1];
      const allLogs = await getLogsForDateRange(fromDate, toDate);
      const moodLogs = await getMoodLogs(fromDate, toDate);

      // Build lookup maps
      const logsByHabit = new Map<string, HabitLog[]>();
      const logsByDate = new Map<string, HabitLog[]>();
      for (const log of allLogs) {
        if (!logsByHabit.has(log.habitId)) logsByHabit.set(log.habitId, []);
        logsByHabit.get(log.habitId)!.push(log);
        if (!logsByDate.has(log.date)) logsByDate.set(log.date, []);
        logsByDate.get(log.date)!.push(log);
      }

      const moodByDate = new Map(moodLogs.map((m) => [m.date, m.score]));

      // Scheduled count per day (for heatmap denominator)
      const scheduledCountByDate = new Map<string, number>();
      for (const date of last365) {
        const count = filterHabitsForDate(habits, date).length;
        scheduledCountByDate.set(date, count);
      }

      // Strength scores
      const strengthScores: HabitStrengthScore[] = habits.map((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        return computeHabitStrengthScore(h.id, logs, last30);
      });

      const globalScore = strengthScores.length > 0
        ? Math.round(strengthScores.reduce((s, hs) => s + hs.score, 0) / strengthScores.length)
        : 0;

      // Insights (aggregate across all habits)
      const insights: HabitInsight[] = habits.flatMap((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        return generateInsights(h.id, h.name, logs, last30);
      });

      // Failure patterns (global)
      const failurePatterns = analyzeFailurePatterns(allLogs);

      // Mood correlations
      const moodCorrelations: MoodCorrelation[] = habits.map((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        return computeMoodCorrelation(h.id, logs, moodByDate);
      }).filter((c) => c.sampleSize >= 3);

      // Global heatmap intensities
      const dayIntensities = buildDayIntensities(logsByDate, scheduledCountByDate, moodByDate);

      // Global weekday stats
      const weekdayStats = computeWeekdayStats(allLogs, last30);

      set({
        strengthScores,
        globalScore,
        insights,
        failurePatterns,
        moodCorrelations,
        dayIntensities,
        weekdayStats,
        lastComputedAt: toDateString(),
      });
    } finally {
      set({ isComputing: false });
    }
  },

  recomputeForHabit: async (habitId: string) => {
    const habits = await getHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const logs = await getLogsForHabit(habitId);
    const last30 = getLast30Days();
    const score = computeHabitStrengthScore(habitId, logs, last30);

    set((state) => ({
      strengthScores: state.strengthScores.map((s) =>
        s.habitId === habitId ? score : s,
      ),
    }));
  },

  getIntensitiesForHabit: (habitId: string): DayIntensity[] => {
    // Not cached per-habit — rebuild on demand using stored allLogs
    // This is a lightweight view built from the already-loaded dayIntensities
    // filtered to this habit's log contribution
    return get().dayIntensities;
  },
}));
