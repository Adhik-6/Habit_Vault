/**
 * Settings Screen — Export / Import / Preferences.
 */
import { Cards, Divider, Layout, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { shareExportCSV, pickAndImportBackup, shareBackupJSON } from '@services/exportService';
import { useHabitStore } from '@store/useHabitStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { useRef, useState } from 'react';
import { ManageCategoriesSheet } from '@src/components/habits/ManageCategoriesSheet';
import { AccentColorSheet } from '@src/components/settings/AccentColorSheet';
import type { BottomSheetRef } from '@src/components/common/BottomSheet';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function SettingsScreen() {
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importing, setImporting] = useState(false);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.todayLogsMap);
  const manageCategoriesRef = useRef<BottomSheetRef>(null);
  const accentColorRef = useRef<BottomSheetRef>(null);
  const ac = useAccentColors();

  async function handleExportJSON() {
    setExportingJSON(true);
    try {
      await shareBackupJSON();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExportingJSON(false);
    }
  }

  async function handleExportCSV() {
    setExportingCSV(true);
    try {
      await shareExportCSV();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const meta = await pickAndImportBackup();
      await loadHabits();
      Alert.alert(
        'Import Complete',
        `Restored ${meta.habitCount} habits and ${meta.logCount} log entries from backup.`,
      );
    } catch (e: any) {
      if (e.message !== 'Import cancelled') {
        Alert.alert('Import Failed', e.message);
      }
    } finally {
      setImporting(false);
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
              <Text style={T.scoreSm}>v1.0</Text>
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
          
          <Text style={[T.label, { marginBottom: Spacing[3], marginTop: Spacing[4] }]}>Data & Backup</Text>

          <SettingRow
            icon="share-outline"
            label="Export JSON Backup"
            description="Full backup — shareable via any app"
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
            description="Restore from a JSON backup file"
            onPress={handleImport}
            loading={importing}
            color={Colors.success}
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
      </ScrollView>
      <ManageCategoriesSheet ref={manageCategoriesRef} />
      <AccentColorSheet ref={accentColorRef} />
    </SafeAreaView>
  );
}
