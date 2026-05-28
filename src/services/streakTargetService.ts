import { getDb } from '../db/database';
import type { StreakTarget } from '../types';
import { generateId } from '../utils/idUtils';

export async function createStreakTarget(
  target: Omit<StreakTarget, 'id' | 'createdAt' | 'achievedAt'>
): Promise<StreakTarget> {
  const db = await getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();
  
  const newTarget: StreakTarget = {
    ...target,
    id,
    createdAt,
    achievedAt: null,
  };

  await db.runAsync(
    'INSERT INTO streak_targets (id, habitId, label, targetDays, createdAt, achievedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [
      newTarget.id,
      newTarget.habitId,
      newTarget.label,
      newTarget.targetDays,
      newTarget.createdAt,
      newTarget.achievedAt,
    ],
  );
  return newTarget;
}

export async function getStreakTargets(): Promise<StreakTarget[]> {
  const db = await getDb();
  return db.getAllAsync<StreakTarget>(
    'SELECT * FROM streak_targets ORDER BY createdAt DESC',
  );
}

export async function updateStreakTarget(
  id: string,
  updates: Partial<Pick<StreakTarget, 'label' | 'targetDays' | 'habitId'>>
): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: any[] = [];
  
  if (updates.label !== undefined) {
    setClauses.push('label = ?');
    args.push(updates.label);
  }
  if (updates.targetDays !== undefined) {
    setClauses.push('targetDays = ?');
    args.push(updates.targetDays);
  }
  if (updates.habitId !== undefined) {
    setClauses.push('habitId = ?');
    args.push(updates.habitId);
  }
  
  if (updates.targetDays !== undefined || updates.habitId !== undefined) {
    setClauses.push('achievedAt = NULL');
  }
  
  if (setClauses.length === 0) return;
  
  args.push(id);
  
  await db.runAsync(
    `UPDATE streak_targets SET ${setClauses.join(', ')} WHERE id = ?`,
    args,
  );
}

export async function deleteStreakTarget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM streak_targets WHERE id = ?', [id]);
}

export async function markAsAchieved(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE streak_targets SET achievedAt = ? WHERE id = ? AND achievedAt IS NULL',
    [new Date().toISOString(), id],
  );
}
