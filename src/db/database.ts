import * as SQLite from 'expo-sqlite';
import {
  CREATE_ACHIEVEMENTS_TABLE,
  CREATE_FAILURE_REASONS_TABLE,
  CREATE_HABIT_LOGS_TABLE,
  CREATE_HABITS_TABLE,
  CREATE_INDEXES,
  CREATE_MIGRATIONS_TABLE,
  CREATE_MOOD_LOGS_TABLE,
  CREATE_CATEGORIES_TABLE,
  BAD_HABITS_CATEGORY_ID,
  CREATE_STREAK_TARGETS_TABLE,
} from './schema';

const DB_NAME = 'habitvault.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

// ── Public API ──────────────────────────────────────────────────────────────

/** Call once at app startup (idempotent). */
export async function initDatabase(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    _db = await SQLite.openDatabaseAsync(DB_NAME);

    // Performance & safety pragmas
    await _db.execAsync('PRAGMA journal_mode = WAL;');
    await _db.execAsync('PRAGMA foreign_keys = ON;');
    await _db.execAsync('PRAGMA cache_size = -8000;'); // 8 MB cache

    // Migrations table must exist before anything else
    await _db.execAsync(CREATE_MIGRATIONS_TABLE);

    await _runMigrations(_db);

    // Ensure the "Bad Habits" system category always exists (in case it got deleted).
    // NOTE: This MUST run AFTER migrations, because migration v1 creates the
    // categories table.  On a fresh install the table won't exist yet otherwise.
    await _db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, sortOrder, createdAt)
       VALUES (?, 'Bad Habits', 'skull-outline', '#EF4444', 9999, ?)`,
      [BAD_HABITS_CATEGORY_ID, new Date().toISOString()],
    );

    console.log('[DB] habitvault.db ready');
  })().catch((err) => {
    // Clear cached promise so the next call can retry initialisation
    _initPromise = null;
    _db = null;
    throw err;
  });

  return _initPromise;
}

/** Returns the shared database instance. Throws if not yet initialised. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  await initDatabase();
  return _db!;
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
    _initPromise = null;
  }
}

// ── Migrations ──────────────────────────────────────────────────────────────

type Migration = {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      // Create ALL tables in dependency order.
      // On a fresh install this is the first migration that runs, so every
      // table must be created here using the current DDL (which already
      // contains columns added by later migrations like isBadHabit, stepValue).
      await db.execAsync(CREATE_CATEGORIES_TABLE);
      await db.execAsync(CREATE_HABITS_TABLE);
      await db.execAsync(CREATE_HABIT_LOGS_TABLE);
      await db.execAsync(CREATE_MOOD_LOGS_TABLE);
      await db.execAsync(CREATE_FAILURE_REASONS_TABLE);
      await db.execAsync(CREATE_ACHIEVEMENTS_TABLE);
      await db.execAsync(CREATE_STREAK_TARGETS_TABLE);
      // Indexes (streak_targets index is created by v7, not here)
      for (const sql of CREATE_INDEXES) {
        await db.execAsync(sql);
      }
      // Also create streak_targets index here for fresh installs
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_streak_targets_habitId ON streak_targets(habitId);');
    },
  },
  {
    version: 2,
    up: async (db) => {
      // Rename stacks → categories (upgrade path from v1 of the app).
      // On a fresh install the table is already called 'categories', so
      // the rename would fail — that's expected and safe to ignore.
      try {
        await db.execAsync('ALTER TABLE stacks RENAME TO categories;');
        await db.execAsync('ALTER TABLE habits RENAME COLUMN stackId TO categoryId;');
      } catch (_e) {
        // Table was already named 'categories' (fresh install) — nothing to do.
      }
    },
  },
  {
    version: 3,
    up: async (_db) => {
      // 'counter' habit type added — no schema change required.
      // The `value` column in habit_logs already stores the running count.
      // This migration is a marker so the version system stays in sync.
    },
  },
  {
    version: 4,
    up: async (db) => {
      // Bad habit tracking: add isBadHabit flag to habits table.
      // On a fresh install the column already exists in CREATE_HABITS_TABLE DDL.
      try {
        await db.execAsync(
          'ALTER TABLE habits ADD COLUMN isBadHabit INTEGER NOT NULL DEFAULT 0',
        );
      } catch (_e) {
        // Column already exists (fresh install) — safe to ignore.
      }
      // Seed the locked "Bad Habits" system category
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, sortOrder, createdAt)
         VALUES (?, 'Bad Habits', 'skull-outline', '#EF4444', 9999, ?)`,
        [BAD_HABITS_CATEGORY_ID, new Date().toISOString()],
      );
    },
  },
  {
    version: 5,
    up: async (db) => {
      // Ensure the "Bad Habits" system category exists (in case v4 was applied before the seed was added)
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, sortOrder, createdAt)
         VALUES (?, 'Bad Habits', 'skull-outline', '#EF4444', 9999, ?)`,
        [BAD_HABITS_CATEGORY_ID, new Date().toISOString()],
      );
    },
  },
  {
    version: 6,
    up: async (db) => {
      // Fix for users who missed the isBadHabit column addition in v4 due to version mismatch
      try {
        await db.execAsync('ALTER TABLE habits ADD COLUMN isBadHabit INTEGER NOT NULL DEFAULT 0');
      } catch (e) {
        // Ignore if column already exists
      }
    },
  },
  {
    version: 7,
    up: async (db) => {
      await db.execAsync(CREATE_STREAK_TARGETS_TABLE);
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_streak_targets_habitId ON streak_targets(habitId);');
    },
  },
  {
    version: 8,
    up: async (db) => {
      // Add stepValue to habits table.
      // On a fresh install the column already exists in CREATE_HABITS_TABLE DDL.
      try {
        await db.execAsync('ALTER TABLE habits ADD COLUMN stepValue REAL NOT NULL DEFAULT 1;');
      } catch (_e) {
        // Column already exists (fresh install) — safe to ignore.
      }
    },
  },
  {
    version: 9,
    up: async (db) => {
      // Migrate duration habits to quantity type
      
      // 1. Convert durationSeconds to value in minutes for all duration logs
      await db.execAsync(`
        UPDATE habit_logs 
        SET value = CAST(durationSeconds AS REAL)
        WHERE habitId IN (
          SELECT id FROM habits WHERE type = 'duration'
        ) AND durationSeconds > 0;
      `);

      // 2. Convert all duration habits to quantity type
      await db.execAsync(`
        UPDATE habits SET type = 'quantity' WHERE type = 'duration';
      `);
    },
  },
];

async function _runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version ASC',
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue;

    console.log(`[DB] Running migration v${migration.version}`);
    await migration.up(db);
    await db.runAsync(
      'INSERT INTO migrations (version, appliedAt) VALUES (?, ?)',
      [migration.version, new Date().toISOString()],
    );
    console.log(`[DB] Migration v${migration.version} complete`);
  }
}

// ── Transaction helpers ─────────────────────────────────────────────────────

/** Run a function inside a SQLite transaction. Rolls back on error. */
export async function withTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const db = await getDb();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await fn(db);
  });
  return result;
}
