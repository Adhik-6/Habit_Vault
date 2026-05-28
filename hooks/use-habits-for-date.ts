// --- useHabitsForDate.ts ---

import { filterHabitsForDate } from '@/src/services/habitService';
import { useHabitStore } from '@/src/store/useHabitStore';
import { useAnalyticsStore } from '@/src/store/useAnalyticsStore';
import { getCompletionWeight } from '@/src/utils/analytics';
import type { HabitWithLog, CategoryWithHabits } from '@/src/types';
import { useMemo } from 'react';

export function useHabitsForSelectedDate(): HabitWithLog[] {
    // Subscribe to the specific raw state dependencies
    const habits = useHabitStore((s) => s.habits);
    const selectedDate = useHabitStore((s) => s.selectedDate);
    const todayLogsMap = useHabitStore((s) => s.todayLogsMap);
    const strengthScores = useAnalyticsStore((s) => s.strengthScores);

    // Compute the derived data and memoize it based on those dependencies
    return useMemo(() => {
        const scheduled = filterHabitsForDate(habits, selectedDate);
        return scheduled.map((h): HabitWithLog => {
            const log = todayLogsMap.get(h.id) ?? null;
            const scoreObj = strengthScores.find(s => s.habitId === h.id);
            const weight = getCompletionWeight(h, log);
            
            let isCompleted = !!log?.completedAt;
            if (h.type === 'composite') {
                isCompleted = h.isBadHabit ? weight === 0 : weight === 1;
            }
            return {
                ...h,
                todayLog: log,
                isCompleted,
                completionWeight: weight,
                contributesToProgress: weight === 1,
                streak: scoreObj?.streak ?? { current: 0, longest: 0, lastCompletedDate: null },
                strengthScore: scoreObj?.score ?? 0,
            };
        });
    }, [habits, selectedDate, todayLogsMap, strengthScores]);
}

export function useCategoriesWithHabits(): CategoryWithHabits[] {
    const categories = useHabitStore((s) => s.categories);
    const habitsForDate = useHabitsForSelectedDate(); // Uses the hook above!

    return useMemo(() => {
        return categories.map((c): CategoryWithHabits => {
            const categoryHabits = habitsForDate.filter((h) => h.categoryId === c.id);
            const completed = categoryHabits.reduce((sum, h) => sum + h.completionWeight, 0);
            return {
                ...c,
                habits: categoryHabits,
                completedCount: completed,
                totalCount: categoryHabits.length,
                completionRate: categoryHabits.length > 0 ? completed / categoryHabits.length : 0,
            };
        });
    }, [categories, habitsForDate]);
}

export function useUncategorizedHabits(): HabitWithLog[] {
    const habitsForDate = useHabitsForSelectedDate();

    return useMemo(() => {
        return habitsForDate.filter((h) => h.categoryId === null);
    }, [habitsForDate]);
}