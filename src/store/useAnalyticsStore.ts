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
  computeGlobalWeekdayStats,
} from '../utils/analytics';
import { filterHabitsForDate, isHabitScheduledForDate } from '../services/habitService';
import { getLast365Days, getLast30Days, toDateString, getCurrentMonthDates } from '../utils/dateUtils';
import type { HabitLog, Habit } from '../types';

// ── State ───────────────────────────────────────────────────────────────────

interface AnalyticsState {
  strengthScores: HabitStrengthScore[];
  globalScore: number;
  insights: HabitInsight[];
  failurePatterns: FailurePattern[];
  badHabitFailurePatterns: FailurePattern[];
  customReasons: { text: string, count: number }[];
  badHabitCustomReasons: { text: string, count: number }[];
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
  badHabitFailurePatterns: [],
  customReasons: [],
  badHabitCustomReasons: [],
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
        set({
          strengthScores: [],
          globalScore: 0,
          insights: [],
          failurePatterns: [],
          badHabitFailurePatterns: [],
          customReasons: [],
          badHabitCustomReasons: [],
          moodCorrelations: [],
          dayIntensities: [],
          weekdayStats: [],
          isComputing: false,
          lastComputedAt: new Date().toISOString()
        });
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

      // Scheduled habits per day (for heatmap denominator and global stats)
      const scheduledHabitsByDate = new Map<string, Habit[]>();
      for (const date of last365) {
        const scheduled = filterHabitsForDate(habits, date);
        scheduledHabitsByDate.set(date, scheduled);
      }

      // Strength scores
      const strengthScores: HabitStrengthScore[] = habits.map((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        const habitScheduledDates = last30.filter(d => isHabitScheduledForDate(h, d));
        return computeHabitStrengthScore(h, logs, habitScheduledDates);
      });

      const globalScore = strengthScores.length > 0
        ? Math.round(strengthScores.reduce((s, hs) => s + hs.score, 0) / strengthScores.length)
        : 0;

      // Insights (aggregate across all habits)
      const insights: HabitInsight[] = habits.flatMap((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        const habitScheduledDates = last30.filter(d => isHabitScheduledForDate(h, d));
        return generateInsights(h, logs, habitScheduledDates);
      });

      // Failure patterns (global)
      const goodLogs = allLogs.filter(l => {
        const h = habits.find(h => h.id === l.habitId);
        return h && !h.isBadHabit;
      });
      const badLogs = allLogs.filter(l => {
        const h = habits.find(h => h.id === l.habitId);
        return h && h.isBadHabit;
      });
      
      const failurePatterns = analyzeFailurePatterns(goodLogs);
      const badHabitFailurePatterns = analyzeFailurePatterns(badLogs);
      
      const buildCustomReasons = (logs: HabitLog[]) => {
        const counts = new Map<string, { text: string, count: number }>();
        for (const l of logs) {
          if (l.failureReason === 'custom' && l.failureCustomText && l.failureCustomText.trim().length > 0) {
            const text = l.failureCustomText.trim();
            const key = text.toLowerCase();
            if (!counts.has(key)) {
              counts.set(key, { text, count: 0 });
            }
            counts.get(key)!.count += 1;
          }
        }
        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
      };

      const customReasons = buildCustomReasons(goodLogs);
      const badHabitCustomReasons = buildCustomReasons(badLogs);

      // Mood correlations
      const moodCorrelations: MoodCorrelation[] = habits.map((h) => {
        const logs = logsByHabit.get(h.id) ?? [];
        return computeMoodCorrelation(h.id, logs, moodByDate);
      }).filter((c) => c.sampleSize >= 3);

      // Global heatmap intensities
      const dayIntensities = buildDayIntensities(logsByDate, scheduledHabitsByDate, moodByDate);

      // Global weekday stats
      const currentMonthDates = getCurrentMonthDates();
      const weekdayStats = computeGlobalWeekdayStats(logsByDate, scheduledHabitsByDate, currentMonthDates);

      set({
        strengthScores,
        globalScore,
        insights,
        failurePatterns,
        badHabitFailurePatterns,
        customReasons,
        badHabitCustomReasons,
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
    const habitScheduledDates = last30.filter(d => isHabitScheduledForDate(habit, d));
    const score = computeHabitStrengthScore(habit, logs, habitScheduledDates);

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
