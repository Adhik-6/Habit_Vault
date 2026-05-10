import { getDb } from '../db/database';
import type { MoodLog } from '../types';
import { generateId } from '../utils/idUtils';
import { toDateString } from '../utils/dateUtils';

// ── Row mapper ──────────────────────────────────────────────────────────────

type MoodLogRow = MoodLog;

// ── Read ────────────────────────────────────────────────────────────────────

export async function getMoodForDate(date: string): Promise<MoodLog | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MoodLogRow>(
    'SELECT * FROM mood_logs WHERE date = ?',
    [date],
  );
  return row ?? null;
}

export async function getMoodLogs(fromDate?: string, toDate?: string): Promise<MoodLog[]> {
  const db = await getDb();
  if (fromDate && toDate) {
    return db.getAllAsync<MoodLogRow>(
      'SELECT * FROM mood_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [fromDate, toDate],
    );
  }
  return db.getAllAsync<MoodLogRow>('SELECT * FROM mood_logs ORDER BY date ASC');
}

export async function getAllMoodLogsRaw(): Promise<MoodLog[]> {
  return getMoodLogs();
}

// ── Write ───────────────────────────────────────────────────────────────────

export interface LogMoodInput {
  date?: string;
  score: number; // 1-10
  emoji?: string;
  notes?: string;
}

/** Upsert a mood log (one per day). */
export async function logMood(input: LogMoodInput): Promise<MoodLog> {
  const db = await getDb();
  const date = input.date ?? toDateString();
  const existing = await getMoodForDate(date);

  const moodLog: MoodLog = {
    id: existing?.id ?? generateId(),
    date,
    score: input.score,
    emoji: input.emoji ?? scoreToEmoji(input.score),
    notes: input.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO mood_logs (id, date, score, emoji, notes, createdAt)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(date) DO UPDATE SET
       score     = excluded.score,
       emoji     = excluded.emoji,
       notes     = excluded.notes`,
    [moodLog.id, moodLog.date, moodLog.score, moodLog.emoji, moodLog.notes, moodLog.createdAt],
  );
  return moodLog;
}

export async function deleteMoodLog(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM mood_logs WHERE date = ?', [date]);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function scoreToEmoji(score: number): string {
  switch (score) {
    case 1: return '😭';
    case 2: return '😢';
    case 3: return '😞';
    case 4: return '😔';
    case 5: return '😕';
    case 6: return '😐';
    case 7: return '🙂';
    case 8: return '😊';
    case 9: return '😄';
    case 10: return '🤩';
    default: return '😐';
  }
}
