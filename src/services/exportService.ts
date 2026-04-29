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
import { getAllStacksRaw } from './stackService';

const BACKUP_VERSION = '1.0.0';
const BACKUP_DIR = new Directory(Paths.document, 'backups');

// ── Read all data ───────────────────────────────────────────────────────────

async function collectAllData(): Promise<BackupData> {
  const db = await getDb();

  const [habits, habitLogs, stacks, moodLogs] = await Promise.all([
    getAllHabitsRaw(),
    getAllLogsRaw(),
    getAllStacksRaw(),
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
    stacks,
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

export async function exportToCSV(): Promise<string> {
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await ensureBackupDir();

  const csvFile = new File(BACKUP_DIR, `habitvault-logs-${timestamp}.csv`);

  const BOM = '\uFEFF'; // Excel-friendly
  await csvFile.write(BOM + csv);

  return csvFile.uri;
}

// ── Import ──────────────────────────────────────────────────────────────────

export async function pickAndImportBackup(passphrase?: string): Promise<BackupMeta> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new Error('Import cancelled');

  const uri = result.assets[0].uri;
  const raw = await new File(uri).text();

  let jsonStr = raw;
  // Detect encrypted backup
  if (raw.trim().startsWith('"') || !raw.trim().startsWith('{')) {
    if (!passphrase) throw new Error('This backup is encrypted. Please provide a passphrase.');
    jsonStr = await decryptData(raw, passphrase);
  }

  const data: BackupData = JSON.parse(jsonStr);
  await restoreFromBackup(data);

  return {
    version: data.version,
    exportedAt: data.exportedAt,
    habitCount: data.habits.length,
    logCount: data.habitLogs.length,
    encrypted: jsonStr !== raw,
  };
}

async function restoreFromBackup(data: BackupData): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    // Clear existing data
    await db.execAsync('DELETE FROM failure_reasons');
    await db.execAsync('DELETE FROM habit_logs');
    await db.execAsync('DELETE FROM habits');
    await db.execAsync('DELETE FROM stacks');
    await db.execAsync('DELETE FROM mood_logs');
    await db.execAsync('DELETE FROM achievements');

    // Restore stacks
    for (const s of data.stacks) {
      await db.runAsync(
        'INSERT OR IGNORE INTO stacks (id, name, icon, color, sortOrder, createdAt) VALUES (?,?,?,?,?,?)',
        [s.id, s.name, s.icon, s.color, s.sortOrder, s.createdAt],
      );
    }

    // Restore habits
    for (const h of data.habits) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habits
         (id, name, description, type, targetValue, unit, frequencyRules,
          color, icon, stackId, compositeSteps, createdAt, archivedAt, sortOrder)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [h.id, h.name, h.description, h.type, h.targetValue, h.unit,
        JSON.stringify(h.frequencyRules), h.color, h.icon, h.stackId,
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

// ── Encryption (AES-GCM via WebCrypto / Hermes) ─────────────────────────────

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  // Slice to ensure we have a plain ArrayBuffer (not SharedArrayBuffer)
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptData(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  // Pack: salt(16) + iv(12) + ciphertext → base64
  const ciphertextBytes = new Uint8Array(ciphertext as ArrayBuffer);
  const combined = new Uint8Array(salt.length + iv.length + ciphertextBytes.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertextBytes, salt.length + iv.length);
  return JSON.stringify({ encrypted: true, data: uint8ToBase64(combined) });
}

async function decryptData(encryptedJson: string, passphrase: string): Promise<string> {
  const { data } = JSON.parse(encryptedJson);
  const combined = base64ToUint8(data);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveKey(passphrase, salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer,
  );
  return new TextDecoder().decode(plainBuffer);
}

// ── Utils ───────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

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