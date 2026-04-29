import { getDb } from '../db/database';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Stack } from '../types';
import { generateId } from '../utils/idUtils';

// ── Row mapper ──────────────────────────────────────────────────────────────

type StackRow = Stack;

function rowToStack(row: StackRow): Stack {
  return { ...row };
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function getStacks(): Promise<Stack[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StackRow>(
    'SELECT * FROM stacks ORDER BY sortOrder ASC, createdAt ASC',
  );
  return rows.map(rowToStack);
}

export async function getStackById(id: string): Promise<Stack | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StackRow>('SELECT * FROM stacks WHERE id = ?', [id]);
  return row ? rowToStack(row) : null;
}

// ── Write ───────────────────────────────────────────────────────────────────

export interface CreateStackInput {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export async function createStack(input: CreateStackInput): Promise<Stack> {
  const db = await getDb();
  const stack: Stack = {
    id: generateId(),
    name: input.name,
    icon: input.icon ?? 'layers',
    color: input.color ?? '#6366F1',
    sortOrder: input.sortOrder ?? 0,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO stacks (id, name, icon, color, sortOrder, createdAt)
     VALUES (?,?,?,?,?,?)`,
    [stack.id, stack.name, stack.icon, stack.color, stack.sortOrder, stack.createdAt],
  );
  return stack;
}

export async function updateStack(
  id: string,
  input: Partial<Omit<Stack, 'id' | 'createdAt'>>,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.icon !== undefined) { fields.push('icon = ?'); values.push(input.icon); }
  if (input.color !== undefined) { fields.push('color = ?'); values.push(input.color); }
  if (input.sortOrder !== undefined) { fields.push('sortOrder = ?'); values.push(input.sortOrder); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE stacks SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteStack(id: string): Promise<void> {
  const db = await getDb();
  // Habits in this stack have stackId set to NULL via ON DELETE SET NULL
  await db.runAsync('DELETE FROM stacks WHERE id = ?', [id]);
}

export async function reorderStacks(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE stacks SET sortOrder = ? WHERE id = ?', [i, orderedIds[i]]);
    }
  });
}

export async function getAllStacksRaw(): Promise<Stack[]> {
  return getStacks();
}
