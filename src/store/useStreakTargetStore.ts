import { create } from 'zustand';
import type { StreakTarget, StreakTargetWithProgress } from '../types';
import { getStreakTargets, createStreakTarget, updateStreakTarget, deleteStreakTarget, markAsAchieved } from '../services/streakTargetService';
import { getLogsForHabit } from '../services/logService';
import { useHabitStore } from './useHabitStore';
import { computeStreak } from '../utils/analytics';
import { getLast365Days } from '../utils/dateUtils';
import { isHabitScheduledForDate } from '../services/habitService';

interface StreakTargetState {
  targets: StreakTargetWithProgress[];
  isLoading: boolean;
  error: string | null;
}

interface StreakTargetActions {
  loadTargets: () => Promise<void>;
  addTarget: (target: Omit<StreakTarget, 'id' | 'createdAt' | 'achievedAt'>) => Promise<void>;
  editTarget: (id: string, updates: Partial<Pick<StreakTarget, 'label' | 'targetDays' | 'habitId'>>) => Promise<void>;
  removeTarget: (id: string) => Promise<void>;
}

type StreakTargetStore = StreakTargetState & StreakTargetActions;

export const useStreakTargetStore = create<StreakTargetStore>((set, get) => ({
  targets: [],
  isLoading: false,
  error: null,

  loadTargets: async () => {
    set({ isLoading: true, error: null });
    try {
      const rawTargets = await getStreakTargets();
      const { habits } = useHabitStore.getState();
      
      const last365 = getLast365Days();
      const enrichedTargets: StreakTargetWithProgress[] = [];
      let anyAchieved = false;

      for (const target of rawTargets) {
        const habit = habits.find(h => h.id === target.habitId);
        let currentStreak = 0;
        
        if (habit) {
          const logs = await getLogsForHabit(habit.id);
          const habitScheduledDates = last365.filter(d => isHabitScheduledForDate(habit, d));
          const streakData = computeStreak(habit, logs, habitScheduledDates);
          currentStreak = streakData.current;
        }

        const isAchieved = currentStreak >= target.targetDays || target.achievedAt !== null;
        const daysRemaining = Math.max(0, target.targetDays - currentStreak);

        enrichedTargets.push({
          ...target,
          currentStreak,
          isAchieved,
          daysRemaining,
        });

        if (isAchieved && target.achievedAt === null) {
          await markAsAchieved(target.id);
          anyAchieved = true;
        }
      }

      set({ targets: enrichedTargets, isLoading: false });

      // If we marked any as achieved, reload to get the updated timestamps
      if (anyAchieved) {
        get().loadTargets();
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addTarget: async (target) => {
    await createStreakTarget(target);
    await get().loadTargets();
  },

  editTarget: async (id, updates) => {
    await updateStreakTarget(id, updates);
    await get().loadTargets();
  },

  removeTarget: async (id) => {
    await deleteStreakTarget(id);
    await get().loadTargets();
  },
}));
