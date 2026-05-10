import { getDb } from '../db/database';
import type { HabitLog, FailureReasonType } from '../types';
import { generateId } from '../utils/idUtils';
import { toDateString } from '../utils/dateUtils';

// ── Row mapper ──────────────────────────────────────────────────────────────

interface HabitLogRow {
  id: string;
  habitId: string;
  date: string;
  value: number;
  completedAt: string | null;
  durationSeconds: number;
  notes: string;
  moodRating: number | null;
  failureReason: string | null;
  failureCustomText: string;
  compositeProgress: string;
}

function rowToLog(row: HabitLogRow): HabitLog {
  return {
    ...row,
    failureReason: row.failureReason as FailureReasonType | null,
    compositeProgress: JSON.parse(row.compositeProgress),
  };
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function getLogForHabitOnDate(
  habitId: string,
  date: string,
): Promise<HabitLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE habitId = ? AND date = ?',
    [habitId, date],
  );
  return row ? rowToLog(row) : null;
}

export async function getLogsForDate(date: string): Promise<HabitLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE date = ?',
    [date],
  );
  return rows.map(rowToLog);
}

export async function getLogsForHabit(
  habitId: string,
  fromDate?: string,
  toDate?: string,
): Promise<HabitLog[]> {
  const db = await getDb();
  if (fromDate && toDate) {
    const rows = await db.getAllAsync<HabitLogRow>(
      'SELECT * FROM habit_logs WHERE habitId = ? AND date >= ? AND date <= ? ORDER BY date ASC',
      [habitId, fromDate, toDate],
    );
    return rows.map(rowToLog);
  }
  const rows = await db.getAllAsync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE habitId = ? ORDER BY date ASC',
    [habitId],
  );
  return rows.map(rowToLog);
}

export async function getLogsForDateRange(fromDate: string, toDate: string): Promise<HabitLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [fromDate, toDate],
  );
  return rows.map(rowToLog);
}

export async function getAllLogsRaw(): Promise<HabitLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitLogRow>(
    'SELECT * FROM habit_logs ORDER BY date ASC',
  );
  return rows.map(rowToLog);
}

// ── Write ───────────────────────────────────────────────────────────────────

export interface LogHabitInput {
  habitId: string;
  date?: string;
  value: number;
  /** ISO timestamp of completion, null if marking as incomplete */
  completedAt?: string | null;
  durationSeconds?: number;
  notes?: string;
  moodRating?: number | null;
  failureReason?: FailureReasonType | null;
  failureCustomText?: string;
  compositeProgress?: Record<string, boolean>;
}

/**
 * Upsert a habit log for a specific date.
 * If a log already exists for (habitId, date), it is updated.
 */
export async function logHabit(input: LogHabitInput): Promise<HabitLog> {
  const db = await getDb();
  const date = input.date ?? toDateString();
  const existing = await getLogForHabitOnDate(input.habitId, date);

  const log: HabitLog = {
    id: existing?.id ?? generateId(),
    habitId: input.habitId,
    date,
    value: input.value,
    completedAt: input.completedAt !== undefined
      ? input.completedAt
      : input.value > 0 ? new Date().toISOString() : null,
    durationSeconds: input.durationSeconds ?? existing?.durationSeconds ?? 0,
    notes: input.notes ?? existing?.notes ?? '',
    moodRating: input.moodRating !== undefined ? input.moodRating : existing?.moodRating ?? null,
    failureReason: input.failureReason !== undefined
      ? input.failureReason
      : existing?.failureReason ?? null,
    failureCustomText: input.failureCustomText ?? existing?.failureCustomText ?? '',
    compositeProgress: input.compositeProgress ?? existing?.compositeProgress ?? {},
  };

  await db.runAsync(
    `INSERT INTO habit_logs
       (id, habitId, date, value, completedAt, durationSeconds,
        notes, moodRating, failureReason, failureCustomText, compositeProgress)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(habitId, date) DO UPDATE SET
       value             = excluded.value,
       completedAt       = excluded.completedAt,
       durationSeconds   = excluded.durationSeconds,
       notes             = excluded.notes,
       moodRating        = excluded.moodRating,
       failureReason     = excluded.failureReason,
       failureCustomText = excluded.failureCustomText,
       compositeProgress = excluded.compositeProgress`,
    [
      log.id, log.habitId, log.date, log.value, log.completedAt,
      log.durationSeconds, log.notes, log.moodRating,
      log.failureReason, log.failureCustomText,
      JSON.stringify(log.compositeProgress),
    ],
  );
  return log;
}

/** Toggle a boolean habit — completes if not done, un-completes if done. */
export async function toggleBooleanHabit(
  habitId: string,
  date: string = toDateString(),
): Promise<HabitLog> {
  const existing = await getLogForHabitOnDate(habitId, date);
  const isCurrentlyDone = !!existing?.completedAt;

  return logHabit({
    habitId,
    date,
    value: isCurrentlyDone ? 0 : 1,
    completedAt: isCurrentlyDone ? null : new Date().toISOString(),
  });
}

export async function deleteLog(logId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habit_logs WHERE id = ?', [logId]);
}

export async function deleteLogsForHabit(habitId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habit_logs WHERE habitId = ?', [habitId]);
}

// ── Composite step toggling ─────────────────────────────────────────────────

export async function toggleCompositeStep(
  habitId: string,
  stepId: string,
  date: string = toDateString(),
): Promise<HabitLog> {
  const existing = await getLogForHabitOnDate(habitId, date);
  const progress: Record<string, boolean> = existing?.compositeProgress ?? {};
  progress[stepId] = !progress[stepId];

  const completedSteps = Object.values(progress).filter(Boolean).length;

  return logHabit({
    habitId,
    date,
    value: completedSteps,
    compositeProgress: progress,
  });
}
// ── Counter habit ────────────────────────────────────────────────────────────

/** Increment a counter habit by `delta` (default +1). Negative values decrement. */
export async function incrementCounter(
  habitId: string,
  delta: number = 1,
  date: string = toDateString(),
): Promise<HabitLog> {
  const existing = await getLogForHabitOnDate(habitId, date);
  const current = existing?.value ?? 0;
  const newValue = Math.max(0, current + delta);

  return logHabit({
    habitId,
    date,
    value: newValue,
    // Counter habits don't have a binary completed state —
    // mark completedAt only when value > 0 so streak works
    completedAt: newValue > 0 ? (existing?.completedAt ?? new Date().toISOString()) : null,
  });
}
