/**
 * HabitPerformanceSheet — Bottom sheet showing a single habit's
 * detailed analytics: 30-day trend, completion rate, streak history,
 * and personal best.
 */
import { useMoodScoreMap } from '@/hooks/use-mood-data';
import { Cards, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { ProgressRing } from '@src/components/common/ProgressRing';
import { HabitHeatmap } from '@src/components/habits/HabitHeatmap';
import type { HabitWithLog } from '@src/types';
import { getLastNDays, getShortDayName } from '@src/utils/dateUtils';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { getLogsForHabit } from '@src/services/logService';
import type { HabitLog } from '@src/types';
import React, { useRef, useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { useHabitColor } from '@/hooks/use-habit-color';
import { useAccentColors } from '@/hooks/use-accent-colors';

interface HabitDetailProps {
  habit: HabitWithLog;
}

export function HabitDetail({ habit }: HabitDetailProps) {
  const isBad = habit.isBadHabit;
  const ac = useAccentColors();
  const habitColor = useHabitColor(habit.categoryId) || ac.accent;
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const moodByDate = useMoodScoreMap();
  
  const [historyLogs, setHistoryLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    getLogsForHabit(habit.id).then(setHistoryLogs);
  }, [habit.id]);

  const score = strengthScores.find((s) => s.habitId === habit.id);
  const streak = score?.streak;

  // Build 30-day completion trend from todayLogsMap + streakCache
  const last30 = getLastNDays(30);

  // Weekday completion mini-heatmap
  const weekdays = [0, 1, 2, 3, 4, 5, 6];

  const completionRate = score?.completionRate ?? 0;
  const consistencyScore = score?.consistencyScore ?? 0;

  const moodOnComplete: number[] = [];
  const moodOnMiss: number[] = [];

  const completedDates = new Set(historyLogs.filter(l => l.completedAt !== null).map(l => l.date));

  // Analytics for quantity, duration, counter
  let highestValue = 0;
  let totalValue = 0;
  let logCount = 0;

  // Analytics for composite
  const stepCompletions: Record<string, number> = {};
  let totalStepsCompleted = 0;
  let compositeLogCount = 0;

  historyLogs.forEach(l => {
    if (habit.type === 'quantity' || habit.type === 'counter') {
      if (l.value > highestValue) highestValue = l.value;
      totalValue += l.value;
      if (l.value > 0) logCount++;
    } else if (habit.type === 'composite') {
      let dailySteps = 0;
      if (l.compositeProgress) {
        Object.entries(l.compositeProgress).forEach(([stepId, completed]) => {
          if (completed) {
            stepCompletions[stepId] = (stepCompletions[stepId] || 0) + 1;
            dailySteps++;
            totalStepsCompleted++;
          }
        });
      }
      if (dailySteps > 0) compositeLogCount++;
    }
  });

  const averageValue = logCount > 0 ? (totalValue / logCount).toFixed(1) : '0';

  let highestValueDisplay = highestValue.toString();
  let averageValueDisplay = averageValue;
  let statUnit = habit.unit;



  const averageSteps = compositeLogCount > 0 ? (totalStepsCompleted / compositeLogCount).toFixed(1) : '0';

  const rankedSteps = habit.type === 'composite' ? habit.compositeSteps.map(step => ({
    ...step,
    completedTimes: stepCompletions[step.id] || 0
  })).sort((a, b) => b.completedTimes - a.completedTimes) : [];

  return (
    <View style={{ gap: Spacing[4], paddingBottom: Spacing[6] }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
        {isBad ? (
          <LinearGradient
            colors={['#000000', Colors.danger]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 14, height: 14, borderRadius: 7 }}
          />
        ) : (
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: habitColor }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={T.h3} numberOfLines={2}>{habit.name}</Text>
          {habit.description ? (
            <Text style={T.caption}>{habit.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Key metrics */}
      <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
        {[
          { label: 'Strength', value: score?.score ?? 0, unit: '/100', color: habitColor },
          { label: isBad ? 'Clean Streak' : 'Streak', value: streak?.current ?? 0, unit: 'd', color: Colors.warning },
          { label: 'Best', value: streak?.longest ?? 0, unit: 'd', color: Colors.success },
          { label: isBad ? 'Avoidance' : 'Rate', value: Math.round(completionRate * 100), unit: '%', color: Colors.info },
        ].map((m) => (
          <View key={m.label} style={[Cards.compact, { flex: 1, alignItems: 'center', paddingVertical: Spacing[2], paddingHorizontal: Spacing[1] }]}>
            <Text style={[T.scoreSm, { color: m.color }]} numberOfLines={1} adjustsFontSizeToFit>{m.value}<Text style={[T.xs, { color: Colors.textMuted }]}>{m.unit}</Text></Text>
            <Text style={T.xs} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Consistency score */}
      <View style={[Cards.compact]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[2] }}>
          <Text style={T.label}>Consistency</Text>
          <Text style={[T.sm, { color: habitColor }]}>{Math.round(consistencyScore * 100)}%</Text>
        </View>
        <View style={{ backgroundColor: Colors.border, height: 6, borderRadius: 3, overflow: 'hidden' }}>
          {isBad ? (
            <LinearGradient
              colors={['#1A1A2E', habitColor]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ width: `${consistencyScore * 100}%`, height: 6, borderRadius: 3 }}
            />
          ) : (
            <View style={{
              width: `${consistencyScore * 100}%`, height: 6,
              backgroundColor: habitColor, borderRadius: 3,
            }} />
          )}
        </View>
        <Text style={[T.caption, { marginTop: Spacing[2] }]}>
          {consistencyScore > 0.8 ? 'Excellent — very regular pattern 🏆'
            : consistencyScore > 0.6 ? 'Good — mostly on schedule'
              : consistencyScore > 0.4 ? 'Fair — some gaps to work on'
                : 'Needs work — build a regular schedule'}
        </Text>
      </View>

      {/* Full-year heatmap */}
      <View style={[Cards.compact]}>
        <Text style={[T.label, { marginBottom: Spacing[3] }]}>365-Day Activity</Text>
        <HabitHeatmap
          habit={habit}
          habitColor={habitColor}
        />
      </View>

      {/* Frequency info */}
      <View style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }]}>
        <Ionicons name="repeat-outline" size={20} color={Colors.textMuted} />
        <View>
          <Text style={T.sm}>
            {habit.frequencyRules.type === 'daily' ? 'Every day' :
              `Weekly on: ${(habit.frequencyRules.daysOfWeek ?? []).map((d) => getShortDayName(d)).join(', ')}`}
          </Text>
          {habit.type === 'quantity' && (
            <Text style={T.caption}>
              Target: {habit.targetValue}{habit.unit ? ` ${habit.unit}` : ''}
            </Text>
          )}
          {habit.type === 'counter' && (
            <Text style={T.caption}>Counter — no target (accumulates daily)</Text>
          )}
        </View>
      </View>

      {/* Values & Checklist Stats */}
      {(habit.type === 'quantity' || habit.type === 'counter') && logCount > 0 && (
        <View style={{ gap: Spacing[3] }}>
          <Text style={T.label}>Performance Stats</Text>
          <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
            <View style={[Cards.compact, { flex: 1, alignItems: 'center', paddingVertical: Spacing[4] }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[2] }}>
                <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
              </View>
              <Text style={T.sm}>Highest Record</Text>
              <Text style={[T.h2, { color: Colors.warning, marginTop: Spacing[1] }]}>
                {highestValueDisplay}
                <Text style={[T.sm, { color: Colors.textMuted }]}> {statUnit}</Text>
              </Text>
            </View>
            <View style={[Cards.compact, { flex: 1, alignItems: 'center', paddingVertical: Spacing[4] }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[2] }}>
                <Ionicons name="stats-chart-outline" size={20} color={Colors.info} />
              </View>
              <Text style={T.sm}>Average</Text>
              <Text style={[T.h2, { color: Colors.info, marginTop: Spacing[1] }]}>
                {averageValueDisplay}
                <Text style={[T.sm, { color: Colors.textMuted }]}> {statUnit}</Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      {habit.type === 'composite' && rankedSteps.length > 0 && (
        <View style={{ gap: Spacing[3] }}>
          <Text style={T.label}>Checklist Stats</Text>
          
          <View style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', padding: Spacing[4], gap: Spacing[4] }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-done-circle-outline" size={28} color={habitColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.sm}>Average items completed</Text>
              <Text style={[T.h2, { color: habitColor, marginTop: 2 }]}>
                {averageSteps}
                <Text style={[T.sm, { color: Colors.textMuted }]}> items</Text>
              </Text>
            </View>
          </View>

          <View style={[Cards.compact, { padding: Spacing[4] }]}>
            <Text style={[T.label, { marginBottom: Spacing[3] }]}>Sub-habits Ranking</Text>
            <View style={{ gap: Spacing[3] }}>
              {rankedSteps.map((step, index) => (
                <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
                  {index === 0 ? (
                    isBad ? (
                      <LinearGradient
                        colors={['#000000', Colors.danger]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 1 }}
                      >
                        <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 13, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={[T.smMedium, { color: Colors.danger }]}>{index + 1}</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 1, borderColor: habitColor, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[T.smMedium, { color: habitColor }]}>{index + 1}</Text>
                      </View>
                    )
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[T.smMedium, { color: habitColor }]}>{index + 1}</Text>
                    </View>
                  )}
                  <Text style={[T.bodyMedium, { flex: 1 }]} numberOfLines={1}>{step.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[1] }}>
                    <Text style={[T.smMedium, { color: habitColor }]}>{step.completedTimes}</Text>
                    <Text style={T.xs}>times</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Streak milestone progress */}
      {streak && (
        <View style={[Cards.compact]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[2] }}>
            <Text style={T.label}>{isBad ? '🛡️ Clean Streak' : '🔥 Streak'}</Text>
            <Text style={[T.sm, { color: Colors.warning }]}>{streak.current} days</Text>
          </View>
          {streak.lastCompletedDate && (
            <Text style={T.caption}>Last {isBad ? 'triggered' : 'completed'}: {streak.lastCompletedDate}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Sheet Wrapper ─────────────────────────────────────────────────────────────

export interface HabitPerformanceSheetRef {
  open: (habit: HabitWithLog) => void;
}

export const HabitPerformanceSheet = React.forwardRef<HabitPerformanceSheetRef>(
  (_, ref) => {
    const sheetRef = useRef<BottomSheetRef>(null);
    const [habit, setHabit] = useState<HabitWithLog | null>(null);

    React.useImperativeHandle(ref, () => ({
      open: (h: HabitWithLog) => {
        setHabit(h);
        sheetRef.current?.open();
      },
    }));

    return (
      <BottomSheet ref={sheetRef} title="Habit Performance">
        {habit && <HabitDetail habit={habit} />}
      </BottomSheet>
    );
  },
);
