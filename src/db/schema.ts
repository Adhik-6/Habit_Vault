// ─────────────────────────────────────────────
// SQLite DDL — All table CREATE statements
// and index definitions for habitvault.db
// ─────────────────────────────────────────────

/** Well-known ID for the locked "Bad Habits" system category. */
export const BAD_HABITS_CATEGORY_ID = '__bad_habits__';

export const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    version   INTEGER NOT NULL UNIQUE,
    appliedAt TEXT    NOT NULL
  );
`;

export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id        TEXT    PRIMARY KEY NOT NULL,
    name      TEXT    NOT NULL,
    icon      TEXT    NOT NULL DEFAULT 'layers',
    color     TEXT    NOT NULL DEFAULT '#6366F1',
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT    NOT NULL
  );
`;

export const CREATE_HABITS_TABLE = `
  CREATE TABLE IF NOT EXISTS habits (
    id             TEXT    PRIMARY KEY NOT NULL,
    name           TEXT    NOT NULL,
    description    TEXT    NOT NULL DEFAULT '',
    type           TEXT    NOT NULL DEFAULT 'boolean',
    targetValue    REAL    NOT NULL DEFAULT 1,
    stepValue      REAL    NOT NULL DEFAULT 1,
    unit           TEXT    NOT NULL DEFAULT '',
    frequencyRules TEXT    NOT NULL DEFAULT '{"type":"daily"}',
    color          TEXT    NOT NULL DEFAULT '#6366F1',
    icon           TEXT    NOT NULL DEFAULT 'star',
    categoryId     TEXT,
    compositeSteps TEXT    NOT NULL DEFAULT '[]',
    createdAt      TEXT    NOT NULL,
    archivedAt     TEXT,
    sortOrder      INTEGER NOT NULL DEFAULT 0,
    isBadHabit     INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_HABIT_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS habit_logs (
    id                TEXT    PRIMARY KEY NOT NULL,
    habitId           TEXT    NOT NULL,
    date              TEXT    NOT NULL,
    value             REAL    NOT NULL DEFAULT 0,
    completedAt       TEXT,
    durationSeconds   INTEGER NOT NULL DEFAULT 0,
    notes             TEXT    NOT NULL DEFAULT '',
    moodRating        INTEGER,
    failureReason     TEXT,
    failureCustomText TEXT    NOT NULL DEFAULT '',
    compositeProgress TEXT    NOT NULL DEFAULT '{}',
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE(habitId, date)
  );
`;

export const CREATE_MOOD_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS mood_logs (
    id        TEXT    PRIMARY KEY NOT NULL,
    date      TEXT    NOT NULL UNIQUE,
    score     INTEGER NOT NULL,
    emoji     TEXT    NOT NULL DEFAULT '😐',
    notes     TEXT    NOT NULL DEFAULT '',
    createdAt TEXT    NOT NULL
  );
`;

export const CREATE_FAILURE_REASONS_TABLE = `
  CREATE TABLE IF NOT EXISTS failure_reasons (
    id         TEXT PRIMARY KEY NOT NULL,
    habitId    TEXT NOT NULL,
    logId      TEXT NOT NULL,
    reason     TEXT NOT NULL,
    customText TEXT NOT NULL DEFAULT '',
    createdAt  TEXT NOT NULL,
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (logId)   REFERENCES habit_logs(id) ON DELETE CASCADE
  );
`;

export const CREATE_ACHIEVEMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS achievements (
    id         TEXT PRIMARY KEY NOT NULL,
    type       TEXT NOT NULL UNIQUE,
    unlockedAt TEXT NOT NULL,
    metadata   TEXT NOT NULL DEFAULT '{}'
  );
`;

// ── Performance indexes ──────────────────────
// NOTE: streak_targets index is NOT here — it's created by migration v7
// alongside the table itself.  Including it here would crash migration v1
// on fresh installs because the table doesn't exist yet.
export const CREATE_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_habitId      ON habit_logs(habitId);`,
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_date         ON habit_logs(date);`,
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_habitId_date ON habit_logs(habitId, date);`,
  `CREATE INDEX IF NOT EXISTS idx_habits_categoryId       ON habits(categoryId);`,
  `CREATE INDEX IF NOT EXISTS idx_habits_active           ON habits(archivedAt);`,
  `CREATE INDEX IF NOT EXISTS idx_failure_reasons_habit   ON failure_reasons(habitId);`,
  `CREATE INDEX IF NOT EXISTS idx_mood_logs_date          ON mood_logs(date);`,
];

export const CREATE_STREAK_TARGETS_TABLE = `
  CREATE TABLE IF NOT EXISTS streak_targets (
    id         TEXT PRIMARY KEY NOT NULL,
    habitId    TEXT NOT NULL,
    label      TEXT,
    targetDays INTEGER NOT NULL,
    createdAt  TEXT NOT NULL,
    achievedAt TEXT,
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
  );
`;
