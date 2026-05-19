/**
 * Settings Screen — Export / Import / Preferences.
 */
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Cards, Divider, Layout, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { importBackupFromUri, shareBackupJSON, shareExportCSV } from '@services/exportService';
import * as DocumentPicker from 'expo-document-picker';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { ManageCategoriesSheet } from '@src/components/habits/ManageCategoriesSheet';
import { AccentColorSheet } from '@src/components/settings/AccentColorSheet';
import { NotificationSettingsSheet, type NotificationSettingsSheetRef } from '@src/components/settings/NotificationSettingsSheet';
import { useHabitStore } from '@store/useHabitStore';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Cross-platform passphrase modal ──────────────────────────────────────────

type PassphraseAction = 'export-json' | 'export-csv' | 'import' | null;

interface PassphraseModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  confirmLabel?: string;
  onConfirm: (passphrase: string) => void;
  onCancel: () => void;
}

function PassphraseModal({ visible, title, subtitle, confirmLabel = 'Confirm', onConfirm, onCancel }: PassphraseModalProps) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);

  const handleConfirm = () => {
    if (!value.trim()) {
      Alert.alert('Required', 'Please enter a passphrase.');
      return;
    }
    const v = value.trim();
    setValue('');
    onConfirm(v);
  };

  const handleCancel = () => { setValue(''); onCancel(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={handleCancel}
        >
          <Pressable
            style={{
              backgroundColor: Colors.surface, borderRadius: Radius.lg,
              padding: Spacing[5], width: 300,
              borderWidth: 1, borderColor: Colors.border, gap: Spacing[3],
            }}
            onPress={() => {}}
          >
            <Text style={[T.h3, { textAlign: 'center' }]}>{title}</Text>
            <Text style={[T.caption, { textAlign: 'center', color: Colors.textSecondary }]}>{subtitle}</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
              borderWidth: 1, borderColor: Colors.border,
              paddingHorizontal: Spacing[3], gap: Spacing[2],
            }}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={[T.body as any, { flex: 1, color: Colors.text, paddingVertical: Spacing[3] }]}
                value={value}
                onChangeText={setValue}
                placeholder="Enter passphrase…"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!show}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
              <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={8}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
              <TouchableOpacity
                onPress={handleCancel}
                style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }}
              >
                <Text style={T.sm}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, backgroundColor: Colors.accent }}
              >
                <Text style={[T.sm, { color: '#fff', fontWeight: '600' }]}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function AnimatedHeart() {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(1.4, { duration: 200 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, // infinite
      false // don't reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, { marginLeft: Spacing[1], justifyContent: 'center' }]}>
      <Text style={{ fontSize: 16 }}>❤️‍🩹</Text>
    </Animated.View>
  );
}

interface SettingRowProps {

  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
}

function SettingRow({ icon, label, description, onPress, color, loading }: SettingRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          Cards.compact,
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing[3],
            marginBottom: Spacing[2],
          },
        ]}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: Radius.md,
            backgroundColor: (color ?? Colors.accent) + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={color ?? Colors.accent} />
          ) : (
            <Ionicons name={icon} size={20} color={color ?? Colors.accent} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={T.bodyMedium}>{label}</Text>
          {description && <Text style={T.caption}>{description}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const ac = useAccentColors();
  return (
    <TouchableOpacity onPress={() => setExpanded(!expanded)} style={[Cards.compact, { marginBottom: Spacing[2] }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[T.bodyMedium, { flex: 1, paddingRight: Spacing[2] }]}>{question}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={ac.accent} />
      </View>
      {expanded && (
        <Text style={[T.caption, { marginTop: Spacing[2], color: Colors.textSecondary, lineHeight: 20 }]}>{answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUri, setImportUri] = useState<string | null>(null);
  // Cross-platform passphrase modal state
  const [passphraseAction, setPassphraseAction] = useState<PassphraseAction>(null);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.todayLogsMap);
  const manageCategoriesRef = useRef<BottomSheetRef>(null);
  const accentColorRef = useRef<BottomSheetRef>(null);
  const notificationsRef = useRef<NotificationSettingsSheetRef>(null);
  const ac = useAccentColors();

  // ── Export JSON ───────────────────────────────────────────────────────────
  async function handleExportJSON() {
    Alert.alert(
      'Export JSON Backup',
      'Do you want to encrypt this backup with a passphrase?\n\nEncrypted backups use AES-256 and require the same passphrase to restore.',
      [
        {
          text: 'Export Plain',
          onPress: async () => {
            setExportingJSON(true);
            try { await shareBackupJSON(false); }
            catch (e: any) { Alert.alert('Export Failed', e.message); }
            finally { setExportingJSON(false); }
          },
        },
        {
          text: 'Encrypt…',
          // Open our cross-platform passphrase modal
          onPress: () => setPassphraseAction('export-json'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  async function handleExportCSV() {
    Alert.alert(
      'Export CSV',
      'Do you want to encrypt this CSV backup?',
      [
        {
          text: 'Export Plain',
          onPress: async () => {
            setExportingCSV(true);
            try { await shareExportCSV(); }
            catch (e: any) { Alert.alert('Export Failed', e.message); }
            finally { setExportingCSV(false); }
          },
        },
        {
          text: 'Encrypt…',
          onPress: () => setPassphraseAction('export-csv'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImporting(false);
        return;
      }
      
      const uri = result.assets[0].uri;
      setImportUri(uri);

      const meta = await importBackupFromUri(uri);
      await loadHabits();
      Alert.alert(
        'Import Complete',
        `Restored ${meta.habitCount} habits and ${meta.logCount} log entries from backup.${(meta as any).encrypted ? '\n\n🔒 Backup was decrypted.' : ''}`,
      );
      setImportUri(null);
    } catch (e: any) {
      if (e.message?.includes('encrypted') || e.message?.includes('passphrase') || e.message?.includes('decrypt')) {
        // File needs a passphrase — show our modal
        setPassphraseAction('import');
      } else {
        Alert.alert('Import Failed', e.message);
        setImportUri(null);
      }
    } finally {
      setImporting(false);
    }
  }

  // ── Passphrase modal handler ───────────────────────────────────────────────
  async function handlePassphraseConfirm(passphrase: string) {
    const action = passphraseAction;
    setPassphraseAction(null);
    if (!action) return;

    if (action === 'export-json') {
      setExportingJSON(true);
      try { await shareBackupJSON(true, passphrase); }
      catch (e: any) { Alert.alert('Export Failed', e.message); }
      finally { setExportingJSON(false); }
    } else if (action === 'export-csv') {
      setExportingCSV(true);
      try { await shareExportCSV(true, passphrase); }
      catch (e: any) { Alert.alert('Export Failed', e.message); }
      finally { setExportingCSV(false); }
    } else if (action === 'import') {
      if (!importUri) return;
      setImporting(true);
      try {
        const meta = await importBackupFromUri(importUri, passphrase);
        await loadHabits();
        Alert.alert(
          'Import Complete',
          `Restored ${meta.habitCount} habits and ${meta.logCount} log entries from backup.\n\n🔒 Backup was decrypted.`,
        );
        setImportUri(null);
      } catch (e: any) {
        Alert.alert('Import Failed', e.message);
      } finally {
        setImporting(false);
      }
    }
  }


  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: Spacing[5] }}>
          <Text style={T.label}>Preferences</Text>
          <Text style={T.h1}>Settings</Text>
        </Animated.View>

        {/* ── Stats ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[Cards.base, { marginBottom: Spacing[5] }]}>
          <View style={Layout.row}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>{habits.length}</Text>
              <Text style={T.caption}>Habits</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: Colors.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>{logs.size}</Text>
              <Text style={T.caption}>Logs Today</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: Colors.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>v1.2</Text>
              <Text style={T.caption}>Version</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Data section ── */}
        <Animated.View entering={FadeInDown.delay(180).duration(350)}>
          <Text style={[T.label, { marginBottom: Spacing[3] }]}>Customization</Text>
          <SettingRow
            icon="layers-outline"
            label="Manage Categories"
            description="Create or edit habit categories"
            onPress={() => manageCategoriesRef.current?.open()}
            color={ac.accent}
          />
          <SettingRow
            icon="color-palette-outline"
            label="Accent Color"
            description="Change the app's theme accent color"
            onPress={() => accentColorRef.current?.open()}
            color={ac.accent}
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            description="Reminders for habits and mood"
            onPress={() => notificationsRef.current?.open()}
            color={ac.accent}
          />

          <Text style={[T.label, { marginBottom: Spacing[3], marginTop: Spacing[4] }]}>Data & Backup</Text>

          <SettingRow
            icon="share-outline"
            label="Export JSON Backup"
            description="Full backup with AES-256 encryption option"
            onPress={handleExportJSON}
            loading={exportingJSON}
            color={Colors.accent}
          />
          <SettingRow
            icon="document-text-outline"
            label="Export CSV"
            description="Habit logs as spreadsheet"
            onPress={handleExportCSV}
            loading={exportingCSV}
            color={Colors.info}
          />
          <SettingRow
            icon="cloud-download-outline"
            label="Import Backup"
            description="Restore from encrypted or plain JSON backup"
            onPress={handleImport}
            loading={importing}
            color={Colors.success}
          />
        </Animated.View>

        <View style={Divider.horizontal} />

        {/* ── FAQ ── */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
          <Text style={[T.label, { marginBottom: Spacing[3] }]}>Frequently Asked Questions</Text>
          <FaqItem 
            question="What is Global Strength?" 
            answer="Global Strength (0-100) is a holistic metric of your overall behavioral performance. It aggregates the individual habit strength of all your habits and factors in your mood score to give you a quick read on how well you're doing right now."
          />
          <FaqItem 
            question="How is Habit Strength calculated?" 
            answer="Habit Strength (0-100) measures your consistency over time. It looks at your completion rate and penalizes high variance. It effectively measures how reliably you stick to your habits week over week."
          />
          <FaqItem 
            question="How does the intensity heatmap work?" 
            answer="The heatmap varies by habit type. Boolean habits show as solid colors. Duration, Quantity, and Checklist habits show intensity based on progress towards your daily target. For Counter habits, intensity is calculated relative to your all-time maximum on any single day, similar to GitHub's contribution graph."
          />
          <FaqItem 
            question="Are my backups secure?" 
            answer="Yes! When you encrypt your backups, HabitVault uses AES-256 encryption before generating the file. The key is never stored, and only you can decrypt the backup using your exact passphrase."
          />
          <FaqItem 
            question="Where is my data stored?" 
            answer="HabitVault is completely offline-first. Your data is stored directly on your device using a local SQLite database and is never sent to the cloud unless you manually share a backup."
          />
        </Animated.View>

        <View style={Divider.horizontal} />

        {/* ── About ── */}
        <Animated.View entering={FadeInDown.delay(260).duration(350)}>
          <Text style={[T.label, { marginBottom: Spacing[3] }]}>About</Text>
          <View style={[Cards.compact, { gap: Spacing[2] }]}>
            <Text style={T.bodyMedium}>HabitVault</Text>
            <Text style={T.caption}>
              A premium offline-first habit tracker and personal behavioral intelligence system.
              All data stays on your device.
            </Text>
            <View style={[Layout.row, { gap: Spacing[2], marginTop: Spacing[2] }]}>
              <View
                style={{
                  paddingHorizontal: Spacing[2],
                  paddingVertical: 2,
                  backgroundColor: Colors.accentMuted,
                  borderRadius: Radius.sm,
                }}
              >
                <Text style={[T.xs, { color: Colors.accentGlow }]}>Offline-First</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: Spacing[2],
                  paddingVertical: 2,
                  backgroundColor: Colors.successDim,
                  borderRadius: Radius.sm,
                }}
              >
                <Text style={[T.xs, { color: Colors.success }]}>AES-256 Encrypted</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing[8], marginBottom: Spacing[4] }}>
          <Text style={[T.caption, { color: Colors.textMuted }]}>Made with </Text>
          <AnimatedHeart />
        </View>
      </ScrollView>
      <ManageCategoriesSheet ref={manageCategoriesRef} />
      <AccentColorSheet ref={accentColorRef} />
      <NotificationSettingsSheet ref={notificationsRef} />

      {/* Cross-platform passphrase modal */}
      <PassphraseModal
        visible={passphraseAction !== null}
        title={
          passphraseAction === 'import' ? '🔒 Encrypted Backup'
          : '🔒 Set Passphrase'
        }
        subtitle={
          passphraseAction === 'import'
            ? 'This backup is encrypted. Enter the passphrase to restore.'
            : 'Your backup will be encrypted with AES-256. Keep this passphrase safe — you need it to restore.'
        }
        confirmLabel={passphraseAction === 'import' ? 'Decrypt & Import' : 'Encrypt & Export'}
        onConfirm={handlePassphraseConfirm}
        onCancel={() => setPassphraseAction(null)}
      />
    </SafeAreaView>
  );
}
