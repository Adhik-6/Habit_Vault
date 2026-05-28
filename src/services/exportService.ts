import 'react-native-get-random-values';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getDb } from '../db/database';
import type {
  Achievement,
  BackupData, BackupMeta,
  FailureReason,
  StreakTarget
} from '../types';
import { getAllHabitsRaw } from './habitService';
import { getAllLogsRaw } from './logService';
import { getAllMoodLogsRaw } from './moodService';
import { getAllCategoriesRaw } from './categoryService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';

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

  const streakTargets = await db.getAllAsync<StreakTarget>(
    'SELECT * FROM streak_targets ORDER BY createdAt ASC',
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
    streakTargets,
    settings: useSettingsStore.getState(),
    auth: useAuthStore.getState(),
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
  
  if (Platform.OS === 'android') {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = encrypt ? `habitvault-backup-${timestamp}.enc.json` : `habitvault-backup-${timestamp}.json`;
        
        const content = await new File(fileUri).text();
        const newUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/json');
        await StorageAccessFramework.writeAsStringAsync(newUri, content);
        return;
      }
    } catch (e) {
      console.warn('SAF failed, falling back to share', e);
    }
  }
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Share HabitVault Backup',
    });
  } else {
    throw new Error(`File generated at: ${fileUri}`);
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

  // Only support JSON now
  let data: BackupData;
  try {
    data = JSON.parse(textStr);
    if (!data.habits || !data.habitLogs) {
      throw new Error('Invalid backup data structure.');
    }
  } catch (e: any) {
    throw new Error('Invalid backup file format. Expected a JSON backup.');
  }
  await restoreFromBackup(data);

  return {
    version: data.version,
    exportedAt: data.exportedAt,
    habitCount: data.habits.length,
    logCount: data.habitLogs.length,
    encrypted: isEncrypted,
  };
}

async function restoreFromBackup(data: BackupData): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    // Clear existing data
    await db.execAsync('DELETE FROM failure_reasons');
    await db.execAsync('DELETE FROM streak_targets');
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
         (id, name, description, type, targetValue, stepValue, unit, frequencyRules,
          color, icon, categoryId, compositeSteps, createdAt, archivedAt, sortOrder, isBadHabit)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [h.id, h.name, h.description, h.type, h.targetValue, h.stepValue ?? 1, h.unit,
        JSON.stringify(h.frequencyRules), h.color, h.icon, h.categoryId,
        JSON.stringify(h.compositeSteps), h.createdAt, h.archivedAt, h.sortOrder, h.isBadHabit ? 1 : 0],
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

    // Restore streak targets
    if (data.streakTargets) {
      for (const st of data.streakTargets) {
        await db.runAsync(
          'INSERT OR IGNORE INTO streak_targets (id, habitId, label, targetDays, createdAt, achievedAt) VALUES (?,?,?,?,?,?)',
          [st.id, st.habitId, st.label, st.targetDays, st.createdAt, st.achievedAt]
        );
      }
    }
  });

  if (data.settings) {
    useSettingsStore.setState(data.settings);
  }
  if (data.auth) {
    useAuthStore.setState(data.auth);
  }
}


import CryptoJS from 'crypto-js';

// ── Encryption (AES via crypto-js) ─────────────────────────────

async function encryptData(plaintext: string, passphrase: string): Promise<string> {
  // CryptoJS handles salt and IV automatically when passing a string passphrase
  const ciphertext = CryptoJS.AES.encrypt(plaintext, passphrase).toString();
  return JSON.stringify({ encrypted: true, data: ciphertext });
}

async function decryptData(encryptedJson: string, passphrase: string): Promise<string> {
  try {
    const { data } = JSON.parse(encryptedJson);
    const bytes = CryptoJS.AES.decrypt(data, passphrase);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
    }
    return plaintext;
  } catch (e: any) {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
  }
}

// ── Utils ───────────────────────────────────────────────────────────────────

async function ensureBackupDir(): Promise<void> {
  if (!BACKUP_DIR.exists) {
    BACKUP_DIR.create();
  }
}