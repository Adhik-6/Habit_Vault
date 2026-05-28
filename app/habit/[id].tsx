import React, { useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useHabitStore } from '@store/useHabitStore';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { getCompletionWeight } from '@src/utils/analytics';
import { HabitDetail } from '@src/components/insights/HabitPerformanceSheet';
import { Layout, Cards, Buttons, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { getHabitById, archiveHabit, deleteHabit, unarchiveHabit } from '@services/habitService';
import { getLogsForHabit } from '@services/logService';
import { HabitForm, type HabitFormRef } from '@src/components/habits/HabitForm';
import type { HabitWithLog, FailurePattern } from '@src/types';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { useHabitColor } from '@/hooks/use-habit-color';
import { FailureAnalysisWidget } from '@src/components/insights/FailureAnalysisWidget';
import { analyzeFailurePatterns } from '@src/utils/analytics';

export default function HabitDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const habits = useHabitStore((s) => s.habits);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const ac = useAccentColors();
  
  const formRef = useRef<HabitFormRef>(null);

  const todayLogsMap = useHabitStore((s) => s.todayLogsMap);
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  
  const [localHabit, setLocalHabit] = React.useState<HabitWithLog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failurePatterns, setFailurePatterns] = React.useState<FailurePattern[]>([]);
  const [customReasons, setCustomReasons] = React.useState<{text: string, count: number}[]>([]);

  const rawHabitColor = useHabitColor(localHabit?.categoryId ?? null);
  const habitColor = localHabit?.isBadHabit ? Colors.danger : (rawHabitColor || ac.accent);

  React.useEffect(() => {
    async function load() {
      let h = habits.find((h) => h.id === id);
      if (!h) {
        // Try fetching directly (e.g., if archived)
        const dbHabit = await getHabitById(id);
        if (dbHabit) {
          h = dbHabit;
        }
      }
      
      if (h) {
        const todayLog = todayLogsMap.get(h.id) ?? null;
        const scoreObj = strengthScores.find((s) => s.habitId === h.id);
        const streak = scoreObj?.streak ?? { current: 0, longest: 0, lastCompletedDate: null };
        const strengthScore = scoreObj?.score ?? 0;
        const isCompleted = !!todayLog?.completedAt;
        const weight = getCompletionWeight(h, todayLog);
        setLocalHabit({
          ...h,
          todayLog,
          isCompleted,
          contributesToProgress: weight === 1,
          completionWeight: weight,
          streak,
          strengthScore,
        });

        // Compute local failure patterns
        const logs = await getLogsForHabit(h.id);
        setFailurePatterns(analyzeFailurePatterns(logs));
        
        // Extract custom 'Other' texts
        const customLogs = logs.filter(l => l.failureReason === 'custom' && l.failureCustomText && l.failureCustomText.trim().length > 0);
        const counts = new Map<string, { text: string, count: number }>();
        for (const l of customLogs) {
          const text = l.failureCustomText.trim();
          const key = text.toLowerCase();
          if (!counts.has(key)) {
            counts.set(key, { text, count: 0 });
          }
          counts.get(key)!.count += 1;
        }
        setCustomReasons(Array.from(counts.values()).sort((a, b) => b.count - a.count));
      }
      setLoading(false);
    }
    load();
  }, [id, habits, todayLogsMap, strengthScores]);

  if (loading) {
    return <SafeAreaView style={Layout.screen} />;
  }

  if (!localHabit) {
    return (
      <SafeAreaView style={[Layout.screen, Layout.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={[T.h3, { marginTop: Spacing[4] }]}>Habit not found</Text>
        <TouchableOpacity style={[Buttons.primary, { marginTop: Spacing[4] }]} onPress={() => {
          if (router.canGoBack()) router.back();
        }}>
          <Text style={[T.bodyMedium, { color: '#fff' }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleArchive = () => {
    Alert.alert('Archive Habit', `Are you sure you want to archive "${localHabit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'default', onPress: () => {
        if (router.canGoBack()) router.back();
        setTimeout(async () => {
          try {
            await archiveHabit(localHabit.id);
            await loadHabits();
          } catch (error: any) {
            Alert.alert('Archive Error', error.message);
          }
        }, 300);
      }}
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Habit', `Delete "${localHabit.name}" and all its data? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        if (router.canGoBack()) router.back();
        setTimeout(async () => {
          try {
            await deleteHabit(localHabit.id);
            await loadHabits();
          } catch (error: any) {
            Alert.alert('Delete Error', error.message);
          }
        }, 300);
      }}
    ]);
  };

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      {/* Header */}
      <View style={[Layout.row, { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], paddingBottom: Spacing[4], gap: Spacing[3] }]}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) router.back();
        }} style={Buttons.icon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[T.h3, { flex: 1 }]} numberOfLines={1}>Habit Dashboard</Text>
        <TouchableOpacity onPress={() => formRef.current?.openEdit(localHabit)} style={Buttons.icon}>
          <Ionicons name="pencil" size={20} color={habitColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <HabitDetail habit={localHabit} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginTop: Spacing[4] }}>
          <FailureAnalysisWidget 
            patterns={failurePatterns} 
            isBadHabit={localHabit.isBadHabit} 
            title={localHabit.isBadHabit ? "Why You Slip Up" : "Why You Miss This Habit"}
            customReasons={customReasons}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: Spacing[6], gap: Spacing[3] }}>
          <Text style={[T.label, { marginBottom: Spacing[2] }]}>Actions</Text>
          {localHabit.archivedAt ? (
            <TouchableOpacity style={[Buttons.secondary, { justifyContent: 'flex-start' }]} onPress={async () => {
              await unarchiveHabit(localHabit.id);
              await loadHabits();
              if (router.canGoBack()) router.back();
            }}>
              <Ionicons name="refresh-outline" size={20} color={Colors.success} />
              <Text style={[T.bodyMedium, { color: Colors.success }]}>Unarchive Habit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[Buttons.secondary, { justifyContent: 'flex-start' }]} onPress={handleArchive}>
              <Ionicons name="archive-outline" size={20} color={Colors.warning} />
              <Text style={[T.bodyMedium, { color: Colors.warning }]}>Archive Habit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[Buttons.danger, { justifyContent: 'flex-start' }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={[T.bodyMedium, { color: '#fff' }]}>Delete Habit</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <HabitForm ref={formRef} />
    </SafeAreaView>
  );
}
