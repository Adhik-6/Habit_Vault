import type {
  HabitLog, StreakData, HabitStrengthScore, DayIntensity,
  HabitInsight, FailurePattern, MoodCorrelation, WeekdayStats,
  FailureReasonType,
} from '../types';
import {
  toDateString, diffDays, getDayOfWeek, getDayName,
  getLast30Days, getLast365Days, addDays,
} from './dateUtils';

// ─────────────────────────────────────────────
// STREAK CALCULATION
// ─────────────────────────────────────────────

/**
 * Computes current streak and longest streak from an ordered list of logs.
 * A log is "completed" if completedAt is non-null.
 */
export function computeStreak(logs: HabitLog[]): StreakData {
  if (logs.length === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }

  // Build a set of completed dates
  const completedDates = new Set(
    logs.filter((l) => l.completedAt !== null).map((l) => l.date),
  );

  if (completedDates.size === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null };
  }

  const sortedDates = Array.from(completedDates).sort();
  const lastCompleted = sortedDates[sortedDates.length - 1];
  const today = toDateString();
  const yesterday = addDays(today, -1);

  // Current streak: count backwards from today/yesterday
  let current = 0;
  let cursor = completedDates.has(today) ? today : completedDates.has(yesterday) ? yesterday : null;

  if (cursor) {
    while (completedDates.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }

  // Longest streak: sliding window
  let longest = 0;
  let runLength = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = diffDays(sortedDates[i - 1], sortedDates[i]);
    if (gap === 1) {
      runLength++;
    } else {
      longest = Math.max(longest, runLength);
      runLength = 1;
    }
  }
  longest = Math.max(longest, runLength);

  return { current, longest, lastCompletedDate: lastCompleted };
}

// ─────────────────────────────────────────────
// COMPLETION RATE
// ─────────────────────────────────────────────

export function computeCompletionRate(
  logs: HabitLog[],
  scheduledDates: string[],
): number {
  if (scheduledDates.length === 0) return 0;
  const completedSet = new Set(
    logs.filter((l) => l.completedAt !== null).map((l) => l.date),
  );
  const completed = scheduledDates.filter((d) => completedSet.has(d)).length;
  return completed / scheduledDates.length;
}

// ─────────────────────────────────────────────
// CONSISTENCY SCORE (0-1)
// Measures how evenly distributed completions are over recent period.
// ─────────────────────────────────────────────

export function computeConsistencyScore(logs: HabitLog[], scheduledDates: string[]): number {
  if (scheduledDates.length === 0) return 0;
  
  const completedDates = new Set(logs.filter((l) => l.completedAt !== null).map(l => l.date));
  const recentLogs = scheduledDates.filter(d => completedDates.has(d));

  if (recentLogs.length === 0) return 0;

  // Group by week
  const weekMap = new Map<string, number>();
  
  // Initialize all active weeks with 0
  for (const dateStr of scheduledDates) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const weekKey = toDateString(d);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, 0);
  }

  // Count completions
  for (const dateStr of recentLogs) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const weekKey = toDateString(d);
    if (weekMap.has(weekKey)) {
      weekMap.set(weekKey, weekMap.get(weekKey)! + 1);
    }
  }

  const weeks = Array.from(weekMap.values());
  if (weeks.length <= 1) {
    // If the habit spans only 1 calendar week, variance is meaningless.
    // Fall back to simple completion rate.
    return recentLogs.length / scheduledDates.length;
  }

  const avg = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  const variance = weeks.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weeks.length;
  const stdDev = Math.sqrt(variance);

  // Normalise: lower stdDev relative to avg = higher consistency
  const cv = avg > 0 ? stdDev / avg : 1; // coefficient of variation
  return Math.max(0, 1 - Math.min(cv, 1));
}

// ─────────────────────────────────────────────
// HABIT STRENGTH SCORE (0-100)
// ─────────────────────────────────────────────

export function computeHabitStrengthScore(
  habitId: string,
  logs: HabitLog[],
  scheduledDates: string[],
): HabitStrengthScore {
  const completionRate = computeCompletionRate(logs, scheduledDates);
  const consistencyScore = computeConsistencyScore(logs, scheduledDates);
  const { current, longest, lastCompletedDate } = computeStreak(logs);

  // Streak bonus: max 20 pts (10 for current, 10 for longest relative to days)
  const days = scheduledDates.length || 1;
  const streakBonus = Math.min(20, (current / days) * 10 + (longest / days) * 10);

  const baseScore = completionRate * 50 + consistencyScore * 30 + streakBonus;
  const score = Math.round(Math.min(100, Math.max(0, baseScore)));

  return { habitId, score, completionRate, consistencyScore, streakBonus, streak: { current, longest, lastCompletedDate } };
}

// ─────────────────────────────────────────────
// HEATMAP INTENSITY
// ─────────────────────────────────────────────

/**
 * Maps a 0-1 completion rate to a 0-4 intensity tier for heatmap rendering.
 */
export function toIntensityTier(rate: number): 0 | 1 | 2 | 3 | 4 {
  if (rate === 0) return 0;
  if (rate <= 0.25) return 1;
  if (rate <= 0.5) return 2;
  if (rate <= 0.75) return 3;
  return 4;
}

/**
 * Builds per-day intensity data for the last 365 days.
 * `logsByDate`: map of date → array of logs for that date.
 * `countByDate`: map of date → total scheduled habits that day.
 */
export function buildDayIntensities(
  logsByDate: Map<string, HabitLog[]>,
  scheduledCountByDate: Map<string, number>,
  moodByDate: Map<string, number>,
): DayIntensity[] {
  const dates = getLast365Days();
  return dates.map((date) => {
    const logs = logsByDate.get(date) ?? [];
    const total = scheduledCountByDate.get(date) ?? 0;
    const completed = logs.filter((l) => l.completedAt !== null).length;
    const completionRate = total > 0 ? completed / total : 0;

    return {
      date,
      completedCount: completed,
      totalCount: total,
      completionRate,
      intensityTier: toIntensityTier(completionRate),
      moodScore: moodByDate.get(date) ?? null,
    };
  });
}

// ─────────────────────────────────────────────
// WEEKDAY STATS
// ─────────────────────────────────────────────

export function computeWeekdayStats(
  logs: HabitLog[],
  scheduledDates: string[],
): WeekdayStats[] {
  const totalByDay = new Array(7).fill(0);
  const completedByDay = new Array(7).fill(0);

  for (const date of scheduledDates) {
    const dow = getDayOfWeek(date);
    totalByDay[dow]++;
  }

  for (const log of logs) {
    if (log.completedAt !== null) {
      completedByDay[getDayOfWeek(log.date)]++;
    }
  }

  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    totalAttempts: totalByDay[i],
    completionRate: totalByDay[i] > 0 ? completedByDay[i] / totalByDay[i] : 0,
  }));
}

// ─────────────────────────────────────────────
// FAILURE PATTERNS
// ─────────────────────────────────────────────

export function analyzeFailurePatterns(
  logs: HabitLog[],
): FailurePattern[] {
  const missed = logs.filter((l) => !l.completedAt && l.failureReason);
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
  habitId: string,
  habitName: string,
  logs: HabitLog[],
  scheduledDates: string[],
): HabitInsight[] {
  const insights: HabitInsight[] = [];
  if (logs.length < 7) return insights;

  // Worst day of week
  const weekdayStats = computeWeekdayStats(logs, scheduledDates);
  const worstDay = weekdayStats
    .filter((d) => d.totalAttempts >= 2)
    .sort((a, b) => a.completionRate - b.completionRate)[0];

  if (worstDay && worstDay.completionRate < 0.5) {
    insights.push({
      type: 'worst_day',
      habitId,
      message: `You skip "${habitName}" most often on ${getDayName(worstDay.dayIndex)}s (${Math.round(worstDay.completionRate * 100)}% completion).`,
      data: { dayIndex: worstDay.dayIndex, completionRate: worstDay.completionRate },
    });
  }

  // Streak risk
  const { current } = computeStreak(logs);
  if (current >= 3) {
    const tomorrow = addDays(toDateString(), 1);
    insights.push({
      type: 'streak_risk',
      habitId,
      message: `You're on a ${current}-day streak for "${habitName}". Don't break it!`,
      data: { streakLength: current },
    });
  }

  // Trend: compare last 7 days vs previous 7 days
  const last7 = getLast30Days().slice(-7);
  const prev7 = getLast30Days().slice(-14, -7);

  const rate7 = computeCompletionRate(logs.filter((l) => last7.includes(l.date)), last7);
  const ratePrev7 = computeCompletionRate(logs.filter((l) => prev7.includes(l.date)), prev7);

  if (rate7 > ratePrev7 + 0.2) {
    insights.push({
      type: 'improving',
      habitId,
      message: `"${habitName}" is trending up — ${Math.round(rate7 * 100)}% this week vs ${Math.round(ratePrev7 * 100)}% last week.`,
      data: { rate7, ratePrev7 },
    });
  } else if (rate7 < ratePrev7 - 0.2) {
    insights.push({
      type: 'declining',
      habitId,
      message: `"${habitName}" is declining — ${Math.round(rate7 * 100)}% this week vs ${Math.round(ratePrev7 * 100)}% last week.`,
      data: { rate7, ratePrev7 },
    });
  }

  return insights;
}
