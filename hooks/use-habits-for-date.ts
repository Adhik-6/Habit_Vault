// --- useHabitsForDate.ts ---

import { filterHabitsForDate } from '@/src/services/habitService';
import { useHabitStore } from '@/src/store/useHabitStore';
import type { HabitWithLog, StackWithHabits } from '@/src/types';
import { useMemo } from 'react';

export function useHabitsForSelectedDate(): HabitWithLog[] {
    // Subscribe to the specific raw state dependencies
    const habits = useHabitStore((s) => s.habits);
    const selectedDate = useHabitStore((s) => s.selectedDate);
    const todayLogsMap = useHabitStore((s) => s.todayLogsMap);
    const streakCache = useHabitStore((s) => s.streakCache);
    const scoreCache = useHabitStore((s) => s.scoreCache);

    // Compute the derived data and memoize it based on those dependencies
    return useMemo(() => {
        const scheduled = filterHabitsForDate(habits, selectedDate);
        return scheduled.map((h): HabitWithLog => {
            const log = todayLogsMap.get(h.id) ?? null;
            return {
                ...h,
                todayLog: log,
                isCompleted: !!log?.completedAt,
                streak: streakCache.get(h.id) ?? { current: 0, longest: 0, lastCompletedDate: null },
                strengthScore: scoreCache.get(h.id) ?? 0,
            };
        });
    }, [habits, selectedDate, todayLogsMap, streakCache, scoreCache]);
}

export function useStacksWithHabits(): StackWithHabits[] {
    const stacks = useHabitStore((s) => s.stacks);
    const habitsForDate = useHabitsForSelectedDate(); // Uses the hook above!

    return useMemo(() => {
        return stacks.map((s): StackWithHabits => {
            const stackHabits = habitsForDate.filter((h) => h.stackId === s.id);
            const completed = stackHabits.filter((h) => h.isCompleted).length;
            return {
                ...s,
                habits: stackHabits,
                completedCount: completed,
                totalCount: stackHabits.length,
                completionRate: stackHabits.length > 0 ? completed / stackHabits.length : 0,
            };
        });
    }, [stacks, habitsForDate]);
}

export function useUnstackedHabits(): HabitWithLog[] {
    const habitsForDate = useHabitsForSelectedDate();

    return useMemo(() => {
        return habitsForDate.filter((h) => h.stackId === null);
    }, [habitsForDate]);
}