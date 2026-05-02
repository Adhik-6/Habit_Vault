// ─────────────────────────────────────────────
// HABIT CORE TYPES
// ─────────────────────────────────────────────

export type HabitType = 'boolean' | 'quantity' | 'duration' | 'composite';
export type FrequencyType = 'daily' | 'weekly' | 'custom';
export type FailureReasonType = 'tired' | 'busy' | 'forgot' | 'lazy' | 'custom';

export interface FrequencyRule {
  type: FrequencyType;
  /** Days of week to track (0=Sun … 6=Sat). Omit for 'daily'. */
  daysOfWeek?: number[];
  /** For 'weekly': how many times per week. */
  timesPerWeek?: number;
}

export interface CompositeStep {
  id: string;
  title: string;
  order: number;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  type: HabitType;
  /** For quantity: target amount. For duration: target seconds. For boolean: 1. */
  targetValue: number;
  unit: string; // e.g. 'ml', 'pages', 'min', ''
  frequencyRules: FrequencyRule;
  color: string; // hex
  icon: string; // icon name
  categoryId: string | null;
  compositeSteps: CompositeStep[];
  createdAt: string; // ISO 8601
  archivedAt: string | null;
  sortOrder: number;
}

// ─────────────────────────────────────────────
// LOG TYPES
// ─────────────────────────────────────────────

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  value: number;
  completedAt: string | null; // ISO timestamp when marked done
  durationSeconds: number;
  notes: string;
  moodRating: number | null; // 1-10 at time of logging
  failureReason: FailureReasonType | null;
  failureCustomText: string;
  /** stepId → completed for composite habits */
  compositeProgress: Record<string, boolean>;
}

// ─────────────────────────────────────────────
// CATEGORY TYPES
// ─────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

// ─────────────────────────────────────────────
// MOOD TYPES
// ─────────────────────────────────────────────

export interface MoodLog {
  id: string;
  date: string; // YYYY-MM-DD, one per day
  score: number; // 1-10
  emoji: string;
  notes: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// FAILURE REASON TYPES
// ─────────────────────────────────────────────

export interface FailureReason {
  id: string;
  habitId: string;
  logId: string;
  reason: FailureReasonType;
  customText: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// ACHIEVEMENT TYPES
// ─────────────────────────────────────────────

export interface Achievement {
  id: string;
  type: string;
  unlockedAt: string;
  metadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// ANALYTICS TYPES
// ─────────────────────────────────────────────

export interface StreakData {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

export interface HabitStrengthScore {
  habitId: string;
  /** 0-100 composite score */
  score: number;
  completionRate: number; // 0-1
  consistencyScore: number; // 0-1
  streakBonus: number; // 0-20 extra points
  streak: StreakData;
}

/** Aggregated data for a single calendar day (for heatmap + calendar) */
export interface DayIntensity {
  date: string;
  completedCount: number;
  totalCount: number;
  /** 0 = none, 1-4 = tiers of intensity */
  intensityTier: 0 | 1 | 2 | 3 | 4;
  completionRate: number; // 0-1
  moodScore: number | null;
}

export interface HabitInsight {
  type: 'best_time' | 'worst_day' | 'streak_risk' | 'improving' | 'declining' | 'pattern';
  habitId?: string;
  message: string;
  data: Record<string, unknown>;
}

export interface FailurePattern {
  reason: FailureReasonType | 'custom';
  count: number;
  percentage: number;
  /** Day index (0-6) where this reason peaks */
  peakDayIndex?: number;
}

export interface MoodCorrelation {
  habitId: string;
  /** Pearson correlation: -1 to 1 */
  correlation: number;
  sampleSize: number;
}

export interface WeekdayStats {
  dayIndex: number; // 0=Sun
  completionRate: number;
  totalAttempts: number;
}

// ─────────────────────────────────────────────
// ENRICHED VIEW TYPES (store-level)
// ─────────────────────────────────────────────

export interface HabitWithLog extends Habit {
  todayLog: HabitLog | null;
  isCompleted: boolean;
  streak: StreakData;
  strengthScore: number;
}

export interface CategoryWithHabits extends Category {
  habits: HabitWithLog[];
  completedCount: number;
  totalCount: number;
  completionRate: number;
}

// ─────────────────────────────────────────────
// EXPORT / IMPORT TYPES
// ─────────────────────────────────────────────

export interface BackupData {
  version: string;
  exportedAt: string;
  habits: Habit[];
  habitLogs: HabitLog[];
  categories: Category[];
  moodLogs: MoodLog[];
  failureReasons: FailureReason[];
  achievements: Achievement[];
}

export interface BackupMeta {
  version: string;
  exportedAt: string;
  habitCount: number;
  logCount: number;
  encrypted: boolean;
}
