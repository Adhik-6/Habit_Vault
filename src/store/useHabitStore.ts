// --- useHabitStore.ts ---

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getHabits } from '../services/habitService';
import { getLogsForDate, getLogsForHabit, logHabit, toggleBooleanHabit, toggleCompositeStep } from '../services/logService';
import { getCategories } from '../services/categoryService';
import type { Habit, HabitLog, Category, StreakData } from '../types';
import { computeHabitStrengthScore, computeStreak } from '../utils/analytics';
import { getLast30Days, toDateString } from '../utils/dateUtils';
import { useAnalyticsStore } from './useAnalyticsStore';

// ── State Shape ─────────────────────────────────────────────────────────────

interface HabitState {
  habits: Habit[];
  categories: Category[];
  selectedDate: string;
  todayLogsMap: Map<string, HabitLog>;
  streakCache: Map<string, StreakData>;
  scoreCache: Map<string, number>;
  isLoading: boolean;
  error: string | null;
}

interface HabitActions {
  // Loaders
  loadHabits: () => Promise<void>;
  loadLogsForDate: (date: string) => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;

  // Mutations
  toggleHabit: (habitId: string) => Promise<void>;
  logQuantityHabit: (habitId: string, value: number, notes?: string) => Promise<void>;
  logDurationHabit: (habitId: string, seconds: number) => Promise<void>;
  toggleCompositeStep: (habitId: string, stepId: string) => Promise<void>;

  // ❌ REMOVED: getHabitsForSelectedDate, getStacksWithHabits, getUnstackedHabits
}

type HabitStore = HabitState & HabitActions;

// ── Store ───────────────────────────────────────────────────────────────────

export const useHabitStore = create<HabitStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial state
    habits: [],
    categories: [],
    selectedDate: toDateString(),
    todayLogsMap: new Map(),
    streakCache: new Map(),
    scoreCache: new Map(),
    isLoading: false,
    error: null,

    // ── Loaders
    loadHabits: async () => {
      set({ isLoading: true, error: null });
      try {
        const [habits, categories] = await Promise.all([getHabits(), getCategories()]);
        set({ habits, categories });
        await get().loadLogsForDate(get().selectedDate);
        useAnalyticsStore.getState().recomputeAll();
      } catch (e) {
        set({ error: String(e) });
      } finally {
        set({ isLoading: false });
      }
    },

    loadLogsForDate: async (date: string) => {
      const logs = await getLogsForDate(date);
      const map = new Map<string, HabitLog>(logs.map((l) => [l.habitId, l]));
      set({ todayLogsMap: map });
    },

    setSelectedDate: async (date: string) => {
      set({ selectedDate: date });
      await get().loadLogsForDate(date);
    },

    // ── Mutations
    toggleHabit: async (habitId: string) => {
      const { selectedDate } = get();
      const updated = await toggleBooleanHabit(habitId, selectedDate);
      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, updated);
        return { todayLogsMap: newMap };
      });
      useAnalyticsStore.getState().recomputeAll();
    },

    logQuantityHabit: async (habitId: string, value: number, notes?: string) => {
      const { selectedDate } = get();
      const habit = get().habits.find((h) => h.id === habitId);
      const isComplete = value >= (habit?.targetValue ?? 1);
      const updated = await logHabit({
        habitId,
        date: selectedDate,
        value,
        completedAt: isComplete ? new Date().toISOString() : null,
        notes,
      });
      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, updated);
        return { todayLogsMap: newMap };
      });
      useAnalyticsStore.getState().recomputeAll();
    },

    logDurationHabit: async (habitId: string, seconds: number) => {
      const { selectedDate } = get();
      const habit = get().habits.find((h) => h.id === habitId);
      const targetSeconds = (habit?.targetValue ?? 1) * 60;
      const isComplete = seconds >= targetSeconds;
      const updated = await logHabit({
        habitId,
        date: selectedDate,
        value: seconds,
        durationSeconds: seconds,
        completedAt: isComplete ? new Date().toISOString() : null,
      });
      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, updated);
        return { todayLogsMap: newMap };
      });
      useAnalyticsStore.getState().recomputeAll();
    },

    toggleCompositeStep: async (habitId: string, stepId: string) => {
      const { selectedDate } = get();
      const updated = await toggleCompositeStep(habitId, stepId, selectedDate);
      const habit = get().habits.find((h) => h.id === habitId);
      const totalSteps = habit?.compositeSteps.length ?? 1;
      const completedSteps = Object.values(updated.compositeProgress).filter(Boolean).length;
      if (completedSteps >= totalSteps && !updated.completedAt) {
        updated.completedAt = new Date().toISOString();
      }
      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, updated);
        return { todayLogsMap: newMap };
      });
      useAnalyticsStore.getState().recomputeAll();
    },

    // ❌ REMOVED: The computed selectors from the store definition
  })),
);

// ── Background streak/score precomputer ─────────────────────────────────────

export async function precomputeAnalytics(habits: Habit[]): Promise<void> {
  const last30 = getLast30Days();
  const updates: { streakCache: Map<string, StreakData>; scoreCache: Map<string, number> } = {
    streakCache: new Map(),
    scoreCache: new Map(),
  };

  await Promise.all(
    habits.map(async (h) => {
      const logs = await getLogsForHabit(h.id);
      const streak = computeStreak(logs);
      const score = computeHabitStrengthScore(h.id, logs, last30);
      updates.streakCache.set(h.id, streak);
      updates.scoreCache.set(h.id, score.score);
    }),
  );

  useHabitStore.setState(updates);
}