import 'react-native-get-random-values';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../db/database';
import type {
  Achievement,
  BackupData, BackupMeta,
  FailureReason
} from '../types';
import { getAllHabitsRaw } from './habitService';
import { getAllLogsRaw } from './logService';
import { getAllMoodLogsRaw } from './moodService';
import { getAllCategoriesRaw } from './categoryService';

const BACKUP_VERSION = '1.0.0';
const BACKUP_DIR = new Directory(Paths.document, 'backups');

// ── Read all data ───────────────────────────────────────────────────────────

async function collectAllData(): Promise<BackupData> {
  const db = await getDb();

  const [habits, habitLogs, categories, moodLogs] = await Promise.all([
    getAllHabitsRaw(),
    getAllLogsRaw(),
    getAllCategoriesRaw(),
    getAllMoodLogsRaw(),
  ]);

  const failureReasons = await db.getAllAsync<FailureReason>(
    'SELECT * FROM failure_reasons ORDER BY createdAt ASC',
  );
  const achievements = await db.getAllAsync<Achievement>(
    'SELECT * FROM achievements ORDER BY unlockedAt ASC',
  ).then((rows) =>
    rows.map((r) => ({
      ...r,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    })),
  );

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits,
    habitLogs,
    categories,
    moodLogs,
    failureReasons,
    achievements,
  };
}

// ── JSON Export ─────────────────────────────────────────────────────────────

export async function exportToJSON(encrypt = false, passphrase?: string): Promise<string> {
  const data = await collectAllData();
  const json = JSON.stringify(data, null, 2);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await ensureBackupDir();

  let content = json;
  let filename = `habitvault-backup-${timestamp}.json`;

  if (encrypt && passphrase) {
    content = await encryptData(json, passphrase);
    filename = `habitvault-backup-${timestamp}.enc.json`;
  }

  const file = new File(BACKUP_DIR, filename);
  await file.write(content);

  return file.uri;
}

export async function shareBackupJSON(encrypt = false, passphrase?: string): Promise<void> {
  const fileUri = await exportToJSON(encrypt, passphrase);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Share HabitVault Backup',
    });
  }
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export async function exportToCSV(encrypt = false, passphrase?: string): Promise<string> {
  const data = await collectAllData();

  const headers = [
    'date', 'habitId', 'habitName', 'type', 'value',
    'completedAt', 'durationSeconds', 'notes',
    'moodRating', 'failureReason'
  ];

  const habitMap = new Map(data.habits.map((h) => [h.id, h]));

  const rows = data.habitLogs.map((log) => {
    const habit = habitMap.get(log.habitId);

    return [
      escapeCSV(log.date),
      escapeCSV(log.habitId),
      escapeCSV(habit?.name),
      escapeCSV(habit?.type),
      escapeCSV(log.value),
      escapeCSV(log.completedAt),
      escapeCSV(log.durationSeconds),
      escapeCSV(log.notes),
      escapeCSV(log.moodRating),
      escapeCSV(log.failureReason),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const BOM = '\uFEFF'; // Excel-friendly

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await ensureBackupDir();

  let content = BOM + csv;
  let filename = `habitvault-logs-${timestamp}.csv`;

  if (encrypt && passphrase) {
    content = await encryptData(csv, passphrase);
    filename = `habitvault-logs-${timestamp}.enc.csv`;
  }

  const csvFile = new File(BACKUP_DIR, filename);
  await csvFile.write(content);

  return csvFile.uri;
}

export async function shareExportCSV(encrypt = false, passphrase?: string): Promise<void> {
  const fileUri = await exportToCSV(encrypt, passphrase);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: encrypt ? 'application/octet-stream' : 'text/csv',
      dialogTitle: 'Share Habit Logs CSV',
    });
  }
}

// ── Import ──────────────────────────────────────────────────────────────────

export async function importBackupFromUri(uri: string, passphrase?: string): Promise<BackupMeta> {
  const raw = await new File(uri).text();

  let textStr = raw;
  let isEncrypted = false;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.encrypted === true && typeof parsed.data === 'string') {
      isEncrypted = true;
    }
  } catch (e) {
    // Not valid JSON, might be raw CSV or corrupted
  }

  if (isEncrypted) {
    if (!passphrase) throw new Error('This backup is encrypted. Please provide a passphrase.');
    textStr = await decryptData(raw, passphrase);
  }

  // Determine if JSON or CSV
  const isJson = textStr.trim().startsWith('{');
  
  if (isJson) {
    let data: BackupData;
    try {
      data = JSON.parse(textStr);
      if (!data.habits || !data.habitLogs) {
        throw new Error('Invalid backup data structure.');
      }
    } catch (e: any) {
      throw new Error('Invalid backup file format.');
    }
    await restoreFromBackup(data);

    return {
      version: data.version,
      exportedAt: data.exportedAt,
      habitCount: data.habits.length,
      logCount: data.habitLogs.length,
      encrypted: isEncrypted,
    };
  } else {
    // Try CSV
    const rows = parseCSV(textStr);
    if (rows.length === 0) {
      throw new Error('Invalid backup file format. Expected a JSON or CSV backup.');
    }
    await restoreFromCSV(rows);
    const habitIds = new Set(rows.map(r => r.habitId));
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      habitCount: habitIds.size,
      logCount: rows.length,
      encrypted: isEncrypted,
    };
  }
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  // remove BOM if present
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rowStr = lines[i];
    const values: string[] = [];
    let curVal = '';
    let inQuote = false;
    for (let j = 0; j < rowStr.length; j++) {
      const char = rowStr[j];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(curVal);
        curVal = '';
      } else {
        curVal += char;
      }
    }
    values.push(curVal);

    const obj: any = {};
    headers.forEach((h, idx) => {
      let val = values[idx];
      if (val === undefined) val = '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      obj[h] = val === '' ? null : val;
    });
    rows.push(obj);
  }
  return rows;
}

async function restoreFromBackup(data: BackupData): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    // Clear existing data
    await db.execAsync('DELETE FROM failure_reasons');
    await db.execAsync('DELETE FROM habit_logs');
    await db.execAsync('DELETE FROM habits');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM mood_logs');
    await db.execAsync('DELETE FROM achievements');

    // Restore categories
    for (const c of data.categories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, icon, color, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
        [c.id, c.name, c.icon, c.color, c.sortOrder, c.createdAt],
      );
    }

    // Restore habits
    for (const h of data.habits) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habits
         (id, name, description, type, targetValue, unit, frequencyRules,
          color, icon, categoryId, compositeSteps, createdAt, archivedAt, sortOrder)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [h.id, h.name, h.description, h.type, h.targetValue, h.unit,
        JSON.stringify(h.frequencyRules), h.color, h.icon, h.categoryId,
        JSON.stringify(h.compositeSteps), h.createdAt, h.archivedAt, h.sortOrder],
      );
    }

    // Restore logs
    for (const l of data.habitLogs) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habit_logs
         (id, habitId, date, value, completedAt, durationSeconds,
          notes, moodRating, failureReason, failureCustomText, compositeProgress)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [l.id, l.habitId, l.date, l.value, l.completedAt, l.durationSeconds,
        l.notes, l.moodRating, l.failureReason, l.failureCustomText,
        JSON.stringify(l.compositeProgress)],
      );
    }

    // Restore mood logs
    for (const m of data.moodLogs) {
      await db.runAsync(
        'INSERT OR IGNORE INTO mood_logs (id, date, score, emoji, notes, createdAt) VALUES (?,?,?,?,?,?)',
        [m.id, m.date, m.score, m.emoji, m.notes, m.createdAt],
      );
    }
  });
}

import { generateId } from '../utils/idUtils';

async function restoreFromCSV(rows: any[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      if (!r.habitId || !r.date) continue;
      
      // Ensure habit exists
      const habitExists = await db.getFirstAsync('SELECT id FROM habits WHERE id = ?', [r.habitId]);
      if (!habitExists) {
        // Create stub habit
        await db.runAsync(
          `INSERT INTO habits (id, name, description, type, targetValue, unit, frequencyRules, color, icon, categoryId, compositeSteps, createdAt, archivedAt, sortOrder)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
           [
             r.habitId,
             r.habitName || 'Imported Habit',
             '',
             r.type || 'boolean',
             1,
             '',
             JSON.stringify({ type: 'daily' }),
             '#6366F1',
             'star',
             null,
             '[]',
             new Date().toISOString(),
             null,
             0
           ]
        );
      }

      // Insert log
      await db.runAsync(
        `INSERT OR IGNORE INTO habit_logs (id, habitId, date, value, completedAt, durationSeconds, notes, moodRating, failureReason, failureCustomText, compositeProgress)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [
           generateId(),
           r.habitId,
           r.date,
           parseFloat(r.value) || 0,
           r.completedAt || null,
           parseInt(r.durationSeconds) || 0,
           r.notes || '',
           r.moodRating ? parseInt(r.moodRating) : null,
           r.failureReason || null,
           '',
           '{}'
         ]
      );
    }
  });
}

import CryptoJS from 'crypto-js';

// ── Encryption (AES via crypto-js) ─────────────────────────────

async function encryptData(plaintext: string, passphrase: string): Promise<string> {
  // CryptoJS handles salt and IV automatically when passing a string passphrase
  const ciphertext = CryptoJS.AES.encrypt(plaintext, passphrase).toString();
  return JSON.stringify({ encrypted: true, data: ciphertext });
}

async function decryptData(encryptedJson: string, passphrase: string): Promise<string> {
  const { data } = JSON.parse(encryptedJson);
  const bytes = CryptoJS.AES.decrypt(data, passphrase);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  if (!plaintext) {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
  }
  return plaintext;
}

// ── Utils ───────────────────────────────────────────────────────────────────

async function ensureBackupDir(): Promise<void> {
  if (!BACKUP_DIR.exists) {
    BACKUP_DIR.create();
  }
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}