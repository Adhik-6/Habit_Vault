// --- useMoodStore.ts ---

import { create } from 'zustand';
import { logMood as dbLogMood, getMoodLogs, deleteMoodLog as dbDeleteMoodLog, type LogMoodInput } from '../services/moodService';
import type { MoodLog } from '../types';
import { toDateString } from '../utils/dateUtils';

// ── State ───────────────────────────────────────────────────────────────────

interface MoodState {
  /** date → MoodLog */
  moodByDate: Map<string, MoodLog>;
  todayMood: MoodLog | null;
  isLoading: boolean;
  error: string | null;
}

interface MoodActions {
  loadMoodLogs: (fromDate?: string, toDate?: string) => Promise<void>;
  logMood: (input: LogMoodInput) => Promise<MoodLog>;
  // We can keep these two because they return simple values/references, not computed structures
  getTodayMood: () => MoodLog | null;
  getMoodForDate: (date: string) => MoodLog | null;
  deleteMood: (date: string) => Promise<void>;

  // ❌ REMOVED: getMoodTimeline and getMoodScoreMap
}

type MoodStore = MoodState & MoodActions;

// ── Store ───────────────────────────────────────────────────────────────────

export const useMoodStore = create<MoodStore>()((set, get) => ({
  moodByDate: new Map(),
  todayMood: null,
  isLoading: false,
  error: null,

  loadMoodLogs: async (fromDate?: string, toDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const logs = await getMoodLogs(fromDate, toDate);
      const map = new Map<string, MoodLog>(logs.map((l) => [l.date, l]));
      const today = toDateString();
      set({ moodByDate: map, todayMood: map.get(today) ?? null });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  logMood: async (input: LogMoodInput) => {
    const moodLog = await dbLogMood(input);
    set((state) => {
      const newMap = new Map(state.moodByDate);
      newMap.set(moodLog.date, moodLog);
      const today = toDateString();
      return {
        moodByDate: newMap,
        todayMood: moodLog.date === today ? moodLog : state.todayMood,
      };
    });
    return moodLog;
  },

  deleteMood: async (date: string) => {
    await dbDeleteMoodLog(date);
    set((state) => {
      const newMap = new Map(state.moodByDate);
      newMap.delete(date);
      const today = toDateString();
      return {
        moodByDate: newMap,
        todayMood: date === today ? null : state.todayMood,
      };
    });
  },

  getTodayMood: () => get().todayMood,

  getMoodForDate: (date: string) => get().moodByDate.get(date) ?? null,
}));