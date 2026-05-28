import type {
  Habit, HabitLog, StreakData, HabitStrengthScore, DayIntensity,
  HabitInsight, FailurePattern, MoodCorrelation, WeekdayStats,
  FailureReasonType,
} from '../types';
import {
  toDateString, diffDays, getDayOfWeek, getDayName,
  getLast30Days, getLast365Days, addDays,
} from './dateUtils';
import { isHabitScheduledForDate } from '../services/habitService';

// ─────────────────────────────────────────────
// STREAK CALCULATION
// ─────────────────────────────────────────────

export function getCompletionWeight(habit: Habit, log: HabitLog | null | undefined): number {
  let weight = 0;
  if (log) {
    switch (habit.type) {
      case 'boolean':
        weight = log.completedAt !== null ? 1 : 0;
        break;
      case 'quantity': {
        const targetQ = habit.targetValue > 0 ? habit.targetValue : 1;
        weight = Math.min(1, log.value / targetQ);
        break;
      }

      case 'composite': {
        const totalSteps = habit.compositeSteps.length || 1;
        const completedSteps = log.compositeProgress ? Object.values(log.compositeProgress).filter(Boolean).length : 0;
        weight = completedSteps / totalSteps;
        break;
      }
      case 'counter':
        weight = log.value > 0 ? 1 : 0;
        break;
    }
  }
  return habit.isBadHabit ? (1 - weight) : weight;
}

/**
 * Computes current streak and longest streak from an ordered list of logs.
 * Streaks count consecutive SCHEDULED days where the habit was fully completed (or avoided for bad habits).
 */
export function computeStreak(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): StreakData {
  if (scheduledDates.length === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }
  const logByDate = new Map<string, HabitLog>(logs.map(l => [l.date, l]));
  const sortedDates = [...scheduledDates].sort();
  const today = toDateString();

  const isPositiveDay = (date: string) => {
    return getCompletionWeight(habit, logByDate.get(date)) === 1;
  };

  const positiveDates = new Set<string>();
  for (const d of sortedDates) {
    if (isPositiveDay(d)) positiveDates.add(d);
  }

  if (positiveDates.size === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }

  const sortedPositive = Array.from(positiveDates).sort();
  const lastCompleted = sortedPositive[sortedPositive.length - 1];

  let current = 0;
  let activeIndex = sortedDates.length - 1;
  while (activeIndex >= 0 && sortedDates[activeIndex] > today) {
    activeIndex--;
  }

  for (let i = activeIndex; i >= 0; i--) {
    const d = sortedDates[i];
    if (isPositiveDay(d)) {
      current++;
    } else {
      if (d === today) continue;
      break;
    }
  }

  let longest = 0;
  let runLength = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (isPositiveDay(sortedDates[i])) {
      runLength++;
      if (runLength > longest) longest = runLength;
    } else {
      if (sortedDates[i] !== today) {
        runLength = 0;
      }
    }
  }

  return { current, longest, lastCompletedDate: lastCompleted };
}

// ─────────────────────────────────────────────
// COMPLETION RATE
// ─────────────────────────────────────────────

/**
 * For good habits: % of scheduled days where habit was completed.
 * For bad habits:  % of scheduled days where habit was AVOIDED (not completed).
 */
export function computeCompletionRate(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): number {
  if (scheduledDates.length === 0) return 0;
  const logByDate = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));
  let totalWeight = 0;
  for (const d of scheduledDates) {
    totalWeight += getCompletionWeight(habit, logByDate.get(d));
  }
  return totalWeight / scheduledDates.length;
}

// ─────────────────────────────────────────────
// CONSISTENCY SCORE (0-1)
// Measures how evenly distributed completions are over recent period.
// ─────────────────────────────────────────────

export function computeConsistencyScore(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): number {
  if (scheduledDates.length === 0) return 0;
  
  const logByDate = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));
  const positiveDays = scheduledDates.filter(d => getCompletionWeight(habit, logByDate.get(d)) === 1);

  if (positiveDays.length === 0) return 0;

  // Group by week
  const weekMap = new Map<string, number>();
  
  for (const dateStr of scheduledDates) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const weekKey = toDateString(d);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, 0);
  }

  for (const dateStr of positiveDays) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const weekKey = toDateString(d);
    if (weekMap.has(weekKey)) {
      weekMap.set(weekKey, weekMap.get(weekKey)! + 1);
    }
  }

  const weeks = Array.from(weekMap.values());
  if (weeks.length <= 1) {
    return positiveDays.length / scheduledDates.length;
  }

  const avg = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  const variance = weeks.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weeks.length;
  const stdDev = Math.sqrt(variance);

  const cv = avg > 0 ? stdDev / avg : 1;
  return Math.max(0, 1 - Math.min(cv, 1));
}

// ─────────────────────────────────────────────
// HABIT STRENGTH SCORE (0-100)
// ─────────────────────────────────────────────

export function computeHabitStrengthScore(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): HabitStrengthScore {
  const completionRate = computeCompletionRate(habit, logs, scheduledDates);
  const consistencyScore = computeConsistencyScore(habit, logs, scheduledDates);
  const { current, longest, lastCompletedDate } = computeStreak(habit, logs, scheduledDates);

  const days = scheduledDates.length || 1;
  const streakBonus = Math.min(20, (current / days) * 10 + (longest / days) * 10);

  const baseScore = completionRate * 50 + consistencyScore * 30 + streakBonus;
  const score = Math.round(Math.min(100, Math.max(0, baseScore)));

  return {
    habitId: habit.id, score, completionRate, consistencyScore, streakBonus,
    streak: { current, longest, lastCompletedDate },
    isBadHabit: habit.isBadHabit,
    scheduledDaysCount: days,
  };
}

// ─────────────────────────────────────────────
// HEATMAP INTENSITY
// ─────────────────────────────────────────────

export function toIntensityTier(rate: number): 0 | 1 | 2 | 3 | 4 {
  if (rate === 0) return 0;
  if (rate <= 0.25) return 1;
  if (rate <= 0.5) return 2;
  if (rate <= 0.75) return 3;
  return 4;
}

export function buildDayIntensities(
  logsByDate: Map<string, HabitLog[]>,
  scheduledHabitsByDate: Map<string, Habit[]>,
  moodByDate: Map<string, number>,
): DayIntensity[] {
  const dates = getLast365Days();

  return dates.map((date) => {
    const logs = logsByDate.get(date) ?? [];
    const scheduled = scheduledHabitsByDate.get(date) ?? [];
    const total = scheduled.length;

    let progressCount = 0;
    for (const habit of scheduled) {
      const log = logs.find(l => l.habitId === habit.id);
      progressCount += getCompletionWeight(habit, log);
    }

    const completionRate = total > 0 ? Math.min(1, progressCount / total) : 0;

    return {
      date,
      completedCount: Math.round(progressCount),
      totalCount: total,
      completionRate,
      intensityTier: toIntensityTier(completionRate),
      moodScore: moodByDate.get(date) ?? null,
    };
  });
}

/**
 * Builds a per-day intensity array for a SINGLE habit over the last 365 days.
 * For bad habits: intensity represents occurrence level (higher = worse),
 * using the same tier system but the UI renders with red colors.
 */
export function buildHabitDayIntensities(
  logs: HabitLog[],
  habit: Habit,
): DayIntensity[] {
  const dates = getLast365Days();
  const logByDate = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));

  // For counter type: find max value in the window to normalise intensity
  let counterMax = 1;
  if (habit.type === 'counter') {
    for (const log of logs) {
      if (log.value > counterMax) counterMax = log.value;
    }
  }

  return dates.map((date) => {
    const log = logByDate.get(date);
    const isScheduled = isHabitScheduledForDate(habit, date);
    let intensityTier: 0 | 1 | 2 | 3 | 4 = 0;
    let completionRate = 0;
    let rawValue = 0;
    let compositeProgress: Record<string, boolean> | undefined;

    if (log) {
      rawValue = habit.type === 'composite' ? Object.values(log.compositeProgress).filter(Boolean).length : log.value;
      compositeProgress = log.compositeProgress;
    }

    if (!isScheduled) {
       return { date, completedCount: 0, totalCount: 1, completionRate: 0, intensityTier: 0, moodScore: null, rawValue, compositeProgress };
    }

    let weight = getCompletionWeight(habit, log);
    if (habit.type === 'counter' && log) {
       weight = counterMax > 0 ? log.value / counterMax : 0;
       if (habit.isBadHabit) weight = 1 - weight;
    }

    completionRate = weight;
    intensityTier = habit.type === 'counter' && log?.value === 0 && !habit.isBadHabit ? 0 : toIntensityTier(weight);

    return {
      date,
      completedCount: log?.completedAt ? 1 : 0,
      totalCount: 1,
      completionRate,
      intensityTier,
      moodScore: null,
      rawValue,
      compositeProgress,
    };
  });
}



// ─────────────────────────────────────────────
// WEEKDAY STATS
// ─────────────────────────────────────────────

export function computeGlobalWeekdayStats(
  logsByDate: Map<string, HabitLog[]>,
  scheduledHabitsByDate: Map<string, Habit[]>,
  dates: string[],
): WeekdayStats[] {
  const totalByDay = new Array(7).fill(0);
  const progressByDay = new Array(7).fill(0);

  for (const date of dates) {
    const dow = getDayOfWeek(date);
    const scheduled = scheduledHabitsByDate.get(date) ?? [];
    totalByDay[dow] += scheduled.length;

    const logs = logsByDate.get(date) ?? [];
    for (const habit of scheduled) {
      const log = logs.find(l => l.habitId === habit.id);
      progressByDay[dow] += getCompletionWeight(habit, log);
    }
  }

  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    totalAttempts: totalByDay[i],
    completionRate: totalByDay[i] > 0 ? Math.min(1, progressByDay[i] / totalByDay[i]) : 0,
  }));
}

export function computeWeekdayStats(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): WeekdayStats[] {
  const totalByDay = new Array(7).fill(0);
  const progressByDay = new Array(7).fill(0);
  const logByDate = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));

  for (const date of scheduledDates) {
    const dow = getDayOfWeek(date);
    totalByDay[dow]++;
    progressByDay[dow] += getCompletionWeight(habit, logByDate.get(date));
  }

  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    totalAttempts: totalByDay[i],
    completionRate: totalByDay[i] > 0 ? Math.min(1, progressByDay[i] / totalByDay[i]) : 0,
  }));
}

// ─────────────────────────────────────────────
// FAILURE PATTERNS
// ─────────────────────────────────────────────

export function analyzeFailurePatterns(
  logs: HabitLog[],
): FailurePattern[] {
  const missed = logs.filter((l) => !!l.failureReason);
  if (missed.length === 0) return [];

  const reasonCount = new Map<string, { count: number; dayMap: Map<number, number> }>();

  for (const log of missed) {
    const reason = log.failureReason!;
    if (!reasonCount.has(reason)) {
      reasonCount.set(reason, { count: 0, dayMap: new Map() });
    }
    const entry = reasonCount.get(reason)!;
    entry.count++;
    const dow = getDayOfWeek(log.date);
    entry.dayMap.set(dow, (entry.dayMap.get(dow) ?? 0) + 1);
  }

  const total = missed.length;
  return Array.from(reasonCount.entries()).map(([reason, { count, dayMap }]) => {
    let peakDayIndex: number | undefined;
    let peakCount = 0;
    for (const [day, cnt] of dayMap) {
      if (cnt > peakCount) { peakCount = cnt; peakDayIndex = day; }
    }
    return {
      reason: reason as FailureReasonType,
      count,
      percentage: count / total,
      peakDayIndex,
    };
  }).sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────
// MOOD CORRELATION (Pearson)
// ─────────────────────────────────────────────

export function computeMoodCorrelation(
  habitId: string,
  habitLogs: HabitLog[],
  moodByDate: Map<string, number>,
): MoodCorrelation {
  const pairs: Array<[number, number]> = [];

  for (const log of habitLogs) {
    const mood = moodByDate.get(log.date);
    if (mood === undefined) continue;
    pairs.push([log.completedAt !== null ? 1 : 0, mood]);
  }

  if (pairs.length < 3) return { habitId, correlation: 0, sampleSize: pairs.length };

  const n = pairs.length;
  const meanX = pairs.reduce((s, [x]) => s + x, 0) / n;
  const meanY = pairs.reduce((s, [, y]) => s + y, 0) / n;

  let num = 0, denomX = 0, denomY = 0;
  for (const [x, y] of pairs) {
    num += (x - meanX) * (y - meanY);
    denomX += Math.pow(x - meanX, 2);
    denomY += Math.pow(y - meanY, 2);
  }

  const denom = Math.sqrt(denomX * denomY);
  const correlation = denom === 0 ? 0 : num / denom;

  return { habitId, correlation: Math.round(correlation * 100) / 100, sampleSize: n };
}

// ─────────────────────────────────────────────
// INSIGHT GENERATION
// ─────────────────────────────────────────────

export function generateInsights(
  habit: Habit,
  logs: HabitLog[],
  scheduledDates: string[],
): HabitInsight[] {
  const insights: HabitInsight[] = [];
  if (logs.length < 7) return insights;

  const weekdayStats = computeWeekdayStats(habit, logs, scheduledDates);

  if (habit.isBadHabit) {
    // ── Bad habit insights ──

    // Most vulnerable day (highest occurrence rate)
    // Avoidance rate is high = good. So we want lowest completionRate (highest occurrence)
    const worstDay = weekdayStats
      .filter((d) => d.totalAttempts >= 2)
      .sort((a, b) => a.completionRate - b.completionRate)[0];

    if (worstDay && worstDay.completionRate < 0.7) {
      insights.push({
        type: 'bad_habit_slip',
        habitId: habit.id,
        message: `You slip on "${habit.name}" most often on ${getDayName(worstDay.dayIndex)}s — plan ahead for those days.`,
        data: { dayIndex: worstDay.dayIndex, occurrenceRate: 1 - worstDay.completionRate },
      });
    }

    // Clean streak
    const { current } = computeStreak(habit, logs, scheduledDates);
    if (current >= 3) {
      insights.push({
        type: 'bad_habit_clean',
        habitId: habit.id,
        message: `You've been clean from "${habit.name}" for ${current} days — keep the momentum! 🛡️`,
        data: { cleanDays: current },
      });
    }

    // Trend: compare avoidance rates
    const last7 = getLast30Days().slice(-7);
    const prev7 = getLast30Days().slice(-14, -7);
    const occRate7 = 1 - computeCompletionRate(habit, logs.filter((l) => last7.includes(l.date)), last7);
    const occRatePrev7 = 1 - computeCompletionRate(habit, logs.filter((l) => prev7.includes(l.date)), prev7);

    if (occRate7 < occRatePrev7 - 0.2) {
      insights.push({
        type: 'improving',
        habitId: habit.id,
        message: `"${habit.name}" occurrences are trending down — ${Math.round(occRate7 * 100)}% this week vs ${Math.round(occRatePrev7 * 100)}% last week. 💪`,
        data: { occRate7, occRatePrev7 },
      });
    } else if (occRate7 > occRatePrev7 + 0.2) {
      insights.push({
        type: 'declining',
        habitId: habit.id,
        message: `"${habit.name}" occurrences are rising — ${Math.round(occRate7 * 100)}% this week vs ${Math.round(occRatePrev7 * 100)}% last week. Stay alert.`,
        data: { occRate7, occRatePrev7 },
      });
    }

    return insights;
  }

  // ── Good habit insights (original logic) ──

  const worstDay = weekdayStats
    .filter((d) => d.totalAttempts >= 2)
    .sort((a, b) => a.completionRate - b.completionRate)[0];

  if (worstDay && worstDay.completionRate < 0.5) {
    insights.push({
      type: 'worst_day',
      habitId: habit.id,
      message: `You skip "${habit.name}" most often on ${getDayName(worstDay.dayIndex)}s (${Math.round(worstDay.completionRate * 100)}% completion).`,
      data: { dayIndex: worstDay.dayIndex, completionRate: worstDay.completionRate },
    });
  }

  const { current } = computeStreak(habit, logs, scheduledDates);
  if (current >= 3) {
    insights.push({
      type: 'streak_risk',
      habitId: habit.id,
      message: `You're on a ${current}-day streak for "${habit.name}". Don't break it!`,
      data: { streakLength: current },
    });
  }

  const last7 = getLast30Days().slice(-7);
  const prev7 = getLast30Days().slice(-14, -7);

  const rate7 = computeCompletionRate(habit, logs.filter((l) => last7.includes(l.date)), last7);
  const ratePrev7 = computeCompletionRate(habit, logs.filter((l) => prev7.includes(l.date)), prev7);

  if (rate7 > ratePrev7 + 0.2) {
    insights.push({
      type: 'improving',
      habitId: habit.id,
      message: `"${habit.name}" is trending up — ${Math.round(rate7 * 100)}% this week vs ${Math.round(ratePrev7 * 100)}% last week.`,
      data: { rate7, ratePrev7 },
    });
  } else if (rate7 < ratePrev7 - 0.2) {
    insights.push({
      type: 'declining',
      habitId: habit.id,
      message: `"${habit.name}" is declining — ${Math.round(rate7 * 100)}% this week vs ${Math.round(ratePrev7 * 100)}% last week.`,
      data: { rate7, ratePrev7 },
    });
  }

  return insights;
}
