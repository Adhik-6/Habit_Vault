import { getDb } from '../db/database';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Habit, HabitLog, HabitType, FrequencyRule } from '../types';
import { generateId } from '../utils/idUtils';
import { toDateString } from '../utils/dateUtils';

// ── Row mapper ──────────────────────────────────────────────────────────────

interface HabitRow {
  id: string;
  name: string;
  description: string;
  type: HabitType;
  targetValue: number;
  unit: string;
  frequencyRules: string;
  color: string;
  icon: string;
  categoryId: string | null;
  compositeSteps: string;
  createdAt: string;
  archivedAt: string | null;
  sortOrder: number;
}

function rowToHabit(row: HabitRow): Habit {
  return {
    ...row,
    frequencyRules: JSON.parse(row.frequencyRules) as FrequencyRule,
    compositeSteps: JSON.parse(row.compositeSteps),
  };
}

// ── Read operations ─────────────────────────────────────────────────────────

export async function getHabits(includeArchived = false): Promise<Habit[]> {
  const db = await getDb();
  const sql = includeArchived
    ? 'SELECT * FROM habits ORDER BY sortOrder ASC, createdAt ASC'
    : 'SELECT * FROM habits WHERE archivedAt IS NULL ORDER BY sortOrder ASC, createdAt ASC';
  const rows = await db.getAllAsync<HabitRow>(sql);
  return rows.map(rowToHabit);
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
  return row ? rowToHabit(row) : null;
}

export async function getHabitsByCategory(categoryId: string): Promise<Habit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE categoryId = ? AND archivedAt IS NULL ORDER BY sortOrder ASC',
    [categoryId],
  );
  return rows.map(rowToHabit);
}

// ── Write operations ────────────────────────────────────────────────────────

export interface CreateHabitInput {
  name: string;
  description?: string;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  frequencyRules?: FrequencyRule;
  color?: string;
  icon?: string;
  categoryId?: string | null;
  compositeSteps?: Habit['compositeSteps'];
  sortOrder?: number;
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const db = await getDb();
  const habit: Habit = {
    id: generateId(),
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    targetValue: input.targetValue ?? 1,
    unit: input.unit ?? '',
    frequencyRules: input.frequencyRules ?? { type: 'daily' },
    color: input.color ?? '#6366F1',
    icon: input.icon ?? 'star',
    categoryId: input.categoryId ?? null,
    compositeSteps: input.compositeSteps ?? [],
    createdAt: new Date().toISOString(),
    archivedAt: null,
    sortOrder: input.sortOrder ?? 0,
  };

  await db.runAsync(
    `INSERT INTO habits
      (id, name, description, type, targetValue, unit, frequencyRules,
       color, icon, categoryId, compositeSteps, createdAt, archivedAt, sortOrder)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      habit.id, habit.name, habit.description, habit.type,
      habit.targetValue, habit.unit, JSON.stringify(habit.frequencyRules),
      habit.color, habit.icon, habit.categoryId,
      JSON.stringify(habit.compositeSteps), habit.createdAt,
      habit.archivedAt, habit.sortOrder,
    ],
  );
  return habit;
}

export interface UpdateHabitInput extends Partial<Omit<Habit, 'id' | 'createdAt'>> {}

export async function updateHabit(id: string, input: UpdateHabitInput): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(input.type); }
  if (input.targetValue !== undefined) { fields.push('targetValue = ?'); values.push(input.targetValue); }
  if (input.unit !== undefined) { fields.push('unit = ?'); values.push(input.unit); }
  if (input.frequencyRules !== undefined) { fields.push('frequencyRules = ?'); values.push(JSON.stringify(input.frequencyRules)); }
  if (input.color !== undefined) { fields.push('color = ?'); values.push(input.color); }
  if (input.icon !== undefined) { fields.push('icon = ?'); values.push(input.icon); }
  if (input.categoryId !== undefined) { fields.push('categoryId = ?'); values.push(input.categoryId); }
  if (input.compositeSteps !== undefined) { fields.push('compositeSteps = ?'); values.push(JSON.stringify(input.compositeSteps)); }
  if (input.sortOrder !== undefined) { fields.push('sortOrder = ?'); values.push(input.sortOrder); }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE habits SET archivedAt = ? WHERE id = ?', [
    new Date().toISOString(), id,
  ]);
}

export async function unarchiveHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE habits SET archivedAt = NULL WHERE id = ?', [id]);
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb();
  // CASCADE deletes habit_logs and failure_reasons
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE habits SET sortOrder = ? WHERE id = ?', [i, orderedIds[i]]);
    }
  });
}

// ── Scheduling helpers ──────────────────────────────────────────────────────

/**
 * Returns only habits that should be tracked on the given date,
 * based on their frequencyRules.
 */
export function filterHabitsForDate(habits: Habit[], dateStr: string): Habit[] {
  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
  return habits.filter((h) => {
    const rule: FrequencyRule = h.frequencyRules;
    if (rule.type === 'daily') return true;
    if (rule.type === 'weekly' && rule.daysOfWeek) {
      return rule.daysOfWeek.includes(dayOfWeek);
    }
    if (rule.type === 'custom' && rule.daysOfWeek) {
      return rule.daysOfWeek.includes(dayOfWeek);
    }
    return true;
  });
}

// ── Bulk export helper ──────────────────────────────────────────────────────

export async function getAllHabitsRaw(): Promise<Habit[]> {
  return getHabits(true); // include archived
}
