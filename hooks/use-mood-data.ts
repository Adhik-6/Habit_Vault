// --- useMoodData.ts ---

import { getLast30Days } from '@/src/utils/dateUtils';
import { useMoodStore } from '@src/store/useMoodStore'; // Adjust path
import { useMemo } from 'react';

/** Returns ordered [date, score] pairs for charting. */
export function useMoodTimeline(days = 30): Array<{ date: string; score: number }> {
    // Subscribe to the raw map
    const moodByDate = useMoodStore((s) => s.moodByDate);

    // Re-calculate only when the raw map changes
    return useMemo(() => {
        const dates = getLast30Days().slice(-days);
        return dates
            .filter((d) => moodByDate.has(d))
            .map((d) => ({ date: d, score: moodByDate.get(d)!.score }));
    }, [moodByDate, days]);
}

/** Returns a date → score map for mood correlation computation. */
export function useMoodScoreMap(): Map<string, number> {
    const moodByDate = useMoodStore((s) => s.moodByDate);

    return useMemo(() => {
        const result = new Map<string, number>();
        for (const [date, log] of moodByDate) {
            result.set(date, log.score);
        }
        return result;
    }, [moodByDate]);
}