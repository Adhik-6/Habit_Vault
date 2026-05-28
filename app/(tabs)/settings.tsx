/**
 * Settings Screen — Export / Import / Preferences.
 */
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Cards, Divider, Layout, Text as T, Inputs, Buttons } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData, generateSampleData } from '@services/devData';
import { importBackupFromUri, shareBackupJSON } from '@services/exportService';
import { type BottomSheetRef } from '@src/components/common/BottomSheet';
import { ManageCategoriesSheet } from '@src/components/habits/ManageCategoriesSheet';
import { AccentColorSheet } from '@src/components/settings/AccentColorSheet';
import { AuthModal } from '@src/components/settings/AuthModal';
import { NotificationSettingsSheet, type NotificationSettingsSheetRef } from '@src/components/settings/NotificationSettingsSheet';
import { SetPasswordSheet } from '@src/components/settings/SetPasswordSheet';
import { useAuthStore } from '@store/useAuthStore';
import { useHabitStore } from '@store/useHabitStore';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  ScrollView, Text,
  TouchableOpacity, View, Modal, TextInput, NativeSyntheticEvent, TextInputSubmitEditingEventData
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────

import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
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
  const [importing, setImporting] = useState(false);
  const [importUri, setImportUri] = useState<string | null>(null);
  // Cross-platform passphrase modal state
  const [passphraseAction, setPassphraseAction] = useState<'export-json' | 'import' | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.todayLogsMap);
  const manageCategoriesRef = useRef<BottomSheetRef>(null);
  const accentColorRef = useRef<BottomSheetRef>(null);
  const notificationsRef = useRef<NotificationSettingsSheetRef>(null);
  const ac = useAccentColors();

  // ── Export JSON ───────────────────────────────────────────────────────────
  function handleExportJSON() {
    Alert.alert(
      'Export Backup',
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

  const passwordRef = useRef<BottomSheetRef>(null);

  // Auth interceptor
  const [pendingAuthAction, setPendingAuthAction] = useState<{ action: () => void } | null>(null);
  const executeWithAuth = (action: () => void) => {
    if (useAuthStore.getState().passwordHash) {
      setPendingAuthAction({ action });
    } else {
      action();
    }
  };


  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
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
      {passphraseAction && (
        <Modal transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing[5] }}>
            <View style={[Cards.base, { backgroundColor: Colors.surface, padding: Spacing[5] }]}>
              <Text style={[T.h3, { marginBottom: Spacing[2] }]}>
                {passphraseAction === 'export-json' ? 'Set Backup Passphrase' : 'Enter Backup Passphrase'}
              </Text>
              <Text style={[T.caption, { marginBottom: Spacing[4] }]}>
                {passphraseAction === 'export-json' 
                  ? 'This passphrase will be used to encrypt your backup. Do not lose it.' 
                  : 'This backup is encrypted. Enter the passphrase to decrypt it.'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[4] }}>
                <TextInput
                  style={[Inputs.base, { flex: 1, paddingRight: 40 }]}
                  placeholder="Passphrase"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassphrase}
                  autoFocus
                  onSubmitEditing={(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
                    handlePassphraseConfirm(e.nativeEvent.text);
                    setShowPassphrase(false);
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassphrase(!showPassphrase)} style={{ position: 'absolute', right: Spacing[3] }}>
                  <Ionicons name={showPassphrase ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing[3], justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => { setPassphraseAction(null); setShowPassphrase(false); }} style={[Buttons.secondary, { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] }]}>
                  <Text style={[T.smMedium, { color: Colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
              <Text style={T.scoreSm}>v3.0</Text>
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
            icon="lock-closed-outline"
            label="App Password"
            description="Protect your data with a password"
            color={Colors.warning}
            onPress={() => passwordRef.current?.open()}
          />
          <SettingRow
            icon="share-outline"
            label="Export JSON Backup"
            description="Full backup with AES-256 encryption option"
            onPress={() => executeWithAuth(handleExportJSON)}
            loading={exportingJSON}
            color={Colors.accent}
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
          <FaqItem
            question="What is a Bad Habit?"
            answer="Bad habits are behaviors you want to avoid. The goal is to NOT do them. If you fail and engage in the bad habit, you log it. If you successfully avoid it, you do not log anything, and your consistency will increase over time."
          />
          <FaqItem
            question="What happens if I forget my App Password?"
            answer="If you forget your App Password, you can use the custom recovery questions you created to reset it. However, if you forget both your password and the answers to your recovery questions, you will be unable to bypass the security lock, as the app is entirely offline and has no way to recover your data for you."
          />
          <FaqItem
            question="How do the colored dots in the calendar work?"
            answer="Each time you complete habits from a category, a dot matching that category's color appears under the date in the calendar. If you complete habits from more than two categories, a 3rd dot will continuously animate, cycling through the colors of all remaining completed categories. For Bad Habits, a dot only appears on days where you successfully avoided doing them (a clean day)."
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
            <Text style={[T.xs, { color: Colors.textMuted, marginTop: Spacing[1] }]}>
              Version {Constants.expoConfig?.version ?? '3.0.0'}
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

        <View style={Divider.horizontal} />

        <View style={{ marginTop: Spacing[6] }}>
          <Text style={[T.label, { marginBottom: Spacing[2], color: Colors.danger }]}>Danger Zone</Text>
          <SettingRow
            icon="trash-bin-outline"
            label="Clear All Data"
            description="Drops all habits and logs"
            color={Colors.danger}
            onPress={() => {
              Alert.alert('Clear Data', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => executeWithAuth(clearAllData) }
              ]);
            }}
          />
        </View>

        {__DEV__ && (
          <View style={{ marginTop: Spacing[6] }}>
            <Text style={[T.label, { marginBottom: Spacing[2], color: Colors.warning }]}>Development Tools</Text>
            <SettingRow
              icon="flask-outline"
              label="Generate Sample Data"
              description="Injects 10 habits and 50 days of logs"
              color={Colors.warning}
              onPress={() => {
                Alert.alert('Generate Data', 'This will clear existing data. Proceed?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Generate', onPress: generateSampleData }
                ]);
              }}
            />
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing[8], marginBottom: Spacing[4] }}>
          <Text style={[T.caption, { color: Colors.textMuted }]}>Made with </Text>
          <AnimatedHeart />
        </View>
      </ScrollView>
      <ManageCategoriesSheet ref={manageCategoriesRef} />
      <AccentColorSheet ref={accentColorRef} />
      <NotificationSettingsSheet ref={notificationsRef} />
      <SetPasswordSheet
        ref={passwordRef}
        onRemoveRequest={() => {
          executeWithAuth(() => {
            useAuthStore.getState().clearPassword();
            Alert.alert('Removed', 'App password has been removed.');
          });
        }}
      />

      <AuthModal
        visible={pendingAuthAction !== null}
        onSuccess={() => {
          if (pendingAuthAction) {
            pendingAuthAction.action();
            setPendingAuthAction(null);
          }
        }}
        onCancel={() => setPendingAuthAction(null)}
      />
    </SafeAreaView>
  );
}
