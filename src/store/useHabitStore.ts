// --- useHabitStore.ts ---

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getHabits } from '../services/habitService';
import { getLogsForDate, getLogsForHabit, logHabit, toggleBooleanHabit, toggleCompositeStep, incrementCounter } from '../services/logService';
import { getCategories } from '../services/categoryService';
import type { Habit, HabitLog, Category, StreakData, FailureReasonType } from '../types';
import { computeHabitStrengthScore, computeStreak } from '../utils/analytics';
import { getLast30Days, toDateString } from '../utils/dateUtils';
import { useAnalyticsStore } from './useAnalyticsStore';
import { useStreakTargetStore } from './useStreakTargetStore';

// ── Debounced Recompute ─────────────────────────────────────────────────────
let recomputeTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedRecomputeAll() {
  if (recomputeTimeout) clearTimeout(recomputeTimeout);
  recomputeTimeout = setTimeout(() => {
    useAnalyticsStore.getState().recomputeAll();
    useStreakTargetStore.getState().loadTargets();
  }, 1500);
}

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
  toggleCompositeStep: (habitId: string, stepId: string) => Promise<void>;
  logCounterHabit: (habitId: string, delta: number) => Promise<void>;
  logHabitReason: (habitId: string, reason: FailureReasonType, customText?: string) => Promise<void>;

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
      if (get().habits.length === 0) {
        set({ isLoading: true, error: null });
      } else {
        set({ error: null });
      }
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
      const { selectedDate, todayLogsMap, habits } = get();
      const previousLog = todayLogsMap.get(habitId);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      
      const isComplete = !previousLog?.completedAt;
      const shouldClearFailure = habit.isBadHabit ? !isComplete : isComplete;
      
      const optimisticLog: HabitLog = previousLog ? {
        ...previousLog,
        value: isComplete ? 1 : 0,
        completedAt: isComplete ? new Date().toISOString() : null,
        failureReason: shouldClearFailure ? null : previousLog.failureReason,
        failureCustomText: shouldClearFailure ? '' : previousLog.failureCustomText
      } : {
        id: 'optimistic',
        habitId,
        date: selectedDate,
        value: 1,
        completedAt: new Date().toISOString(),
        durationSeconds: 0,
        notes: '',
        moodRating: null,
        failureReason: null,
        failureCustomText: '',
        compositeProgress: {}
      };
      
      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, optimisticLog);
        return { todayLogsMap: newMap };
      });
      debouncedRecomputeAll();

      try {
        const updated = await logHabit({
          habitId, date: selectedDate, value: isComplete ? 1 : 0,
          completedAt: isComplete ? new Date().toISOString() : null,
          failureReason: shouldClearFailure ? null : (previousLog?.failureReason ?? null),
          failureCustomText: shouldClearFailure ? '' : (previousLog?.failureCustomText ?? ''),
        });
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          newMap.set(habitId, updated);
          return { todayLogsMap: newMap };
        });
      } catch (e) {
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          if (previousLog) newMap.set(habitId, previousLog);
          else newMap.delete(habitId);
          return { todayLogsMap: newMap };
        });
        debouncedRecomputeAll();
      }
    },

    logQuantityHabit: async (habitId: string, value: number, notes?: string) => {
      const { selectedDate, todayLogsMap, habits } = get();
      const previousLog = todayLogsMap.get(habitId);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      
      const isComplete = value >= (habit?.targetValue ?? 1);
      const shouldClearFailure = habit.isBadHabit ? !isComplete : isComplete;
      
      const optimisticLog: HabitLog = previousLog ? {
        ...previousLog,
        value,
        notes: notes ?? previousLog.notes,
        completedAt: isComplete ? new Date().toISOString() : null,
        failureReason: shouldClearFailure ? null : previousLog.failureReason,
        failureCustomText: shouldClearFailure ? '' : previousLog.failureCustomText
      } : {
        id: 'optimistic', habitId, date: selectedDate, value, notes: notes ?? '',
        completedAt: isComplete ? new Date().toISOString() : null,
        durationSeconds: 0, moodRating: null, failureReason: null, failureCustomText: '', compositeProgress: {}
      };

      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, optimisticLog);
        return { todayLogsMap: newMap };
      });
      debouncedRecomputeAll();

      try {
        const updated = await logHabit({
          habitId, date: selectedDate, value, notes: notes ?? previousLog?.notes ?? '',
          completedAt: isComplete ? new Date().toISOString() : null,
          failureReason: shouldClearFailure ? null : (previousLog?.failureReason ?? null),
          failureCustomText: shouldClearFailure ? '' : (previousLog?.failureCustomText ?? ''),
        });
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          newMap.set(habitId, updated);
          return { todayLogsMap: newMap };
        });
      } catch (e) {
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          if (previousLog) newMap.set(habitId, previousLog);
          else newMap.delete(habitId);
          return { todayLogsMap: newMap };
        });
        debouncedRecomputeAll();
      }
    },


    toggleCompositeStep: async (habitId: string, stepId: string) => {
      const { selectedDate, todayLogsMap, habits } = get();
      const previousLog = todayLogsMap.get(habitId);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      
      const newCompositeProgress = { ...(previousLog?.compositeProgress ?? {}) };
      newCompositeProgress[stepId] = !newCompositeProgress[stepId];
      
      const totalSteps = habit?.compositeSteps.length ?? 1;
      const completedSteps = Object.values(newCompositeProgress).filter(Boolean).length;
      const isComplete = completedSteps >= totalSteps;
      const shouldClearFailure = habit.isBadHabit ? !isComplete : isComplete;
      
      const optimisticLog: HabitLog = previousLog ? {
        ...previousLog,
        value: completedSteps,
        compositeProgress: newCompositeProgress,
        completedAt: isComplete ? (previousLog.completedAt ?? new Date().toISOString()) : null,
        failureReason: shouldClearFailure ? null : previousLog.failureReason,
        failureCustomText: shouldClearFailure ? '' : previousLog.failureCustomText
      } : {
        id: 'optimistic', habitId, date: selectedDate, value: completedSteps, compositeProgress: newCompositeProgress,
        completedAt: isComplete ? new Date().toISOString() : null,
        durationSeconds: 0, notes: '', moodRating: null, failureReason: null, failureCustomText: ''
      };

      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, optimisticLog);
        return { todayLogsMap: newMap };
      });
      debouncedRecomputeAll();

      try {
        const updated = await logHabit({
          habitId, date: selectedDate, value: completedSteps,
          compositeProgress: newCompositeProgress,
          completedAt: isComplete ? (previousLog?.completedAt ?? new Date().toISOString()) : null,
          failureReason: shouldClearFailure ? null : (previousLog?.failureReason ?? null),
          failureCustomText: shouldClearFailure ? '' : (previousLog?.failureCustomText ?? ''),
        });
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          newMap.set(habitId, updated);
          return { todayLogsMap: newMap };
        });
      } catch (e) {
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          if (previousLog) newMap.set(habitId, previousLog);
          else newMap.delete(habitId);
          return { todayLogsMap: newMap };
        });
        debouncedRecomputeAll();
      }
    },

    logCounterHabit: async (habitId: string, delta: number) => {
      const { selectedDate, todayLogsMap, habits } = get();
      const previousLog = todayLogsMap.get(habitId);
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      
      const newValue = (previousLog?.value ?? 0) + delta;
      
      const optimisticLog: HabitLog = previousLog ? {
        ...previousLog,
        value: newValue,
        completedAt: newValue > 0 ? (previousLog.completedAt ?? new Date().toISOString()) : null
      } : {
        id: 'optimistic', habitId, date: selectedDate, value: newValue,
        completedAt: newValue > 0 ? new Date().toISOString() : null,
        durationSeconds: 0, notes: '', moodRating: null, failureReason: null, failureCustomText: '', compositeProgress: {}
      };

      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, optimisticLog);
        return { todayLogsMap: newMap };
      });
      debouncedRecomputeAll();

      try {
        const updated = await logHabit({
          habitId, date: selectedDate, value: newValue,
          completedAt: newValue > 0 ? (previousLog?.completedAt ?? new Date().toISOString()) : null,
        });
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          newMap.set(habitId, updated);
          return { todayLogsMap: newMap };
        });
      } catch (e) {
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          if (previousLog) newMap.set(habitId, previousLog);
          else newMap.delete(habitId);
          return { todayLogsMap: newMap };
        });
        debouncedRecomputeAll();
      }
    },

    logHabitReason: async (habitId: string, reason: FailureReasonType, customText?: string) => {
      const { selectedDate, todayLogsMap } = get();
      const previousLog = todayLogsMap.get(habitId);
      
      const optimisticLog: HabitLog = previousLog ? {
        ...previousLog,
        failureReason: reason,
        failureCustomText: customText ?? previousLog.failureCustomText
      } : {
        id: 'optimistic', habitId, date: selectedDate, value: 0,
        completedAt: null, durationSeconds: 0, notes: '', moodRating: null,
        failureReason: reason, failureCustomText: customText ?? '', compositeProgress: {}
      };

      set((state) => {
        const newMap = new Map(state.todayLogsMap);
        newMap.set(habitId, optimisticLog);
        return { todayLogsMap: newMap };
      });
      debouncedRecomputeAll();

      try {
        const updated = await logHabit({
          habitId, date: selectedDate, value: previousLog?.value ?? 0,
          completedAt: previousLog?.completedAt ?? null,
          durationSeconds: previousLog?.durationSeconds ?? 0,
          notes: previousLog?.notes ?? '',
          moodRating: previousLog?.moodRating ?? null,
          compositeProgress: previousLog?.compositeProgress ?? {},
          failureReason: reason, failureCustomText: customText ?? ''
        });
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          newMap.set(habitId, updated);
          return { todayLogsMap: newMap };
        });
      } catch (e) {
        set((state) => {
          const newMap = new Map(state.todayLogsMap);
          if (previousLog) newMap.set(habitId, previousLog);
          else newMap.delete(habitId);
          return { todayLogsMap: newMap };
        });
        debouncedRecomputeAll();
      }
    },

    // ❌ REMOVED: The computed selectors from the store definition
  })),
);
