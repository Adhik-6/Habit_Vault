import { getDb } from '../db/database';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Category } from '../types';
import { generateId } from '../utils/idUtils';
import { BAD_HABITS_CATEGORY_ID } from '../db/schema';

// ── Row mapper ──────────────────────────────────────────────────────────────

type CategoryRow = Category;

function rowToCategory(row: CategoryRow): Category {
  return { ...row };
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sortOrder ASC, createdAt ASC',
  );
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
  return row ? rowToCategory(row) : null;
}

// ── Write ───────────────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const db = await getDb();
  const category: Category = {
    id: generateId(),
    name: input.name,
    icon: input.icon ?? 'layers',
    color: input.color ?? '#6366F1',
    sortOrder: input.sortOrder ?? 0,
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, sortOrder, createdAt)
     VALUES (?,?,?,?,?,?)`,
    [category.id, category.name, category.icon, category.color, category.sortOrder, category.createdAt],
  );
  return category;
}

export async function updateCategory(
  id: string,
  input: Partial<Omit<Category, 'id' | 'createdAt'>>,
): Promise<void> {
  // Block editing system categories
  if (id === BAD_HABITS_CATEGORY_ID) {
    throw new Error('Cannot edit the system "Bad Habits" category.');
  }
  const db = await getDb();
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.icon !== undefined) { fields.push('icon = ?'); values.push(input.icon); }
  if (input.color !== undefined) { fields.push('color = ?'); values.push(input.color); }
  if (input.sortOrder !== undefined) { fields.push('sortOrder = ?'); values.push(input.sortOrder); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteCategory(id: string): Promise<void> {
  // Block deleting system categories
  if (id === BAD_HABITS_CATEGORY_ID) {
    throw new Error('Cannot delete the system "Bad Habits" category.');
  }
  const db = await getDb();
  // Habits in this category have categoryId set to NULL via ON DELETE SET NULL
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE categories SET sortOrder = ? WHERE id = ?', [i, orderedIds[i]]);
    }
  });
}

export async function getAllCategoriesRaw(): Promise<Category[]> {
  return getCategories();
}
