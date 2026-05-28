import { useMoodStore } from '@src/store/useMoodStore';
import { getCurrentMonthDates } from '@src/utils/dateUtils';
import { useMemo } from 'react';

export function useMoodTimeline(days: number = 30) {
    // 1. Subscribe to the correct raw state variable (the Map)
    const moodByDate = useMoodStore((s) => s.moodByDate);

    // 2. Perform the logic directly inside the memo so it reacts to changes
    return useMemo(() => {
        // Get the array of dates
        const dates = getCurrentMonthDates();

        // Filter and map out the timeline
        return dates
            .filter((d) => moodByDate.has(d))
            .map((d) => ({
                date: d,
                score: moodByDate.get(d)!.score
            }));

    }, [moodByDate, days]);
}

// You will also need this hook for your Insights screen!
export function useMoodScoreMap() {
    const moodByDate = useMoodStore((s) => s.moodByDate);

    return useMemo(() => {
        const result = new Map<string, number>();
        for (const [date, log] of moodByDate) {
            result.set(date, log.score);
        }
        return result;
    }, [moodByDate]);
}