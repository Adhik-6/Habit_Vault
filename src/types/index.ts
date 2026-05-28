// ─────────────────────────────────────────────
// HABIT CORE TYPES
// ─────────────────────────────────────────────

export type HabitType = 'boolean' | 'quantity' | 'composite' | 'counter';
export type FrequencyType = 'daily' | 'weekly' | 'custom';
/** Failure reasons for good habits */
export type GoodHabitFailureReason = 'tired' | 'busy' | 'forgot' | 'lazy' | 'custom';
/** Slip reasons for bad habits */
export type BadHabitSlipReason = 'urge' | 'stressed' | 'bored' | 'triggered' | 'social_pressure' | 'custom';
export type FailureReasonType = GoodHabitFailureReason | BadHabitSlipReason;

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
  /** For quantity: target amount. For boolean: 1. */
  targetValue: number;
  stepValue: number;
  unit: string; // e.g. 'ml', 'pages', 'min', ''
  frequencyRules: FrequencyRule;
  color: string; // hex
  icon: string; // icon name
  categoryId: string | null;
  compositeSteps: CompositeStep[];
  createdAt: string; // ISO 8601
  archivedAt: string | null;
  sortOrder: number;
  /** True if this habit tracks something the user wants to AVOID. */
  isBadHabit: boolean;
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
  completionRate: number; // 0-1 (for bad habits: avoidance rate)
  consistencyScore: number; // 0-1
  streakBonus: number; // 0-20 extra points
  streak: StreakData;
  /** True if this score belongs to a bad habit (UI uses this for label inversion) */
  isBadHabit: boolean;
  /** The total number of scheduled days evaluated (used for Top Habits eligibility) */
  scheduledDaysCount: number;
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
  /** Raw logged value (quantity count, duration seconds, counter count, etc.) */
  rawValue?: number;
  /** Composite step progress map for checklist habits */
  compositeProgress?: Record<string, boolean>;
}


export interface HabitInsight {
  type: 'best_time' | 'worst_day' | 'streak_risk' | 'improving' | 'declining' | 'pattern' | 'bad_habit_clean' | 'bad_habit_slip';
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
  /** Factual: did the user perform/log this action today? */
  isCompleted: boolean;
  /** Value judgment: is this habit in a "positive" state for the day?
   *  Good habits: same as isCompleted. Bad habits: opposite of isCompleted. */
  contributesToProgress: boolean;
  /** Decimal weight (0 to 1) representing partial completion (e.g. 0.5 for 2/4 checklist steps). Incorporates bad habit inversion (1 - rawWeight). */
  completionWeight: number;
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
  streakTargets?: StreakTarget[];
  settings?: any;
  auth?: any;
}

export interface BackupMeta {
  version: string;
  exportedAt: string;
  habitCount: number;
  logCount: number;
  encrypted: boolean;
}

// ─────────────────────────────────────────────
// STREAK TARGET TYPES
// ─────────────────────────────────────────────

export interface StreakTarget {
  id: string;
  habitId: string;
  label: string | null;
  targetDays: number;
  createdAt: string; // ISO timestamp
  achievedAt: string | null; // ISO timestamp
}

export interface StreakTargetWithProgress extends StreakTarget {
  currentStreak: number;
  isAchieved: boolean;
  daysRemaining: number;
}

