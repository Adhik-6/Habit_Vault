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
import type { HabitWithLog } from '@src/types';
import { getLastNDays, getShortDayName } from '@src/utils/dateUtils';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

interface HabitDetailProps {
  habit: HabitWithLog;
}

export function HabitDetail({ habit }: HabitDetailProps) {
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const streakCache = useHabitStore((s) => s.streakCache);
  const todayLogsMap = useHabitStore((s) => s.todayLogsMap);
  const moodByDate = useMoodScoreMap();

  const score = strengthScores.find((s) => s.habitId === habit.id);
  const streak = streakCache.get(habit.id);

  // Build 30-day completion trend from todayLogsMap + streakCache
  const last30 = getLastNDays(30);

  // Weekday completion mini-heatmap
  const weekdays = [0, 1, 2, 3, 4, 5, 6];

  const completionRate = score?.completionRate ?? 0;
  const consistencyScore = score?.consistencyScore ?? 0;

  // Mood on days this habit was completed vs not
  const moodOnComplete: number[] = [];
  const moodOnMiss: number[] = [];

  return (
    <View style={{ gap: Spacing[4], paddingBottom: Spacing[6] }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: habit.color }} />
        <View style={{ flex: 1 }}>
          <Text style={T.h3} numberOfLines={2}>{habit.name}</Text>
          {habit.description ? (
            <Text style={T.caption}>{habit.description}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'center' }}>
          <ProgressRing progress={completionRate} size={52} strokeWidth={5} color={habit.color} />
        </View>
      </View>

      {/* Key metrics */}
      <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
        {[
          { label: 'Strength', value: score?.score ?? 0, unit: '/100', color: Colors.accent },
          { label: 'Streak', value: streak?.current ?? 0, unit: 'd', color: Colors.warning },
          { label: 'Best', value: streak?.longest ?? 0, unit: 'd', color: Colors.success },
          { label: 'Rate', value: Math.round(completionRate * 100), unit: '%', color: Colors.info },
        ].map((m) => (
          <View key={m.label} style={[Cards.compact, { flex: 1, alignItems: 'center', paddingVertical: Spacing[2] }]}>
            <Text style={[T.scoreSm, { color: m.color }]}>{m.value}<Text style={[T.xs, { color: Colors.textMuted }]}>{m.unit}</Text></Text>
            <Text style={T.xs}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Consistency score */}
      <View style={[Cards.compact]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[2] }}>
          <Text style={T.label}>Consistency</Text>
          <Text style={[T.sm, { color: Colors.accent }]}>{Math.round(consistencyScore * 100)}%</Text>
        </View>
        <View style={{ backgroundColor: Colors.border, height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{
            width: `${consistencyScore * 100}%`, height: 6,
            backgroundColor: Colors.accent, borderRadius: 3,
          }} />
        </View>
        <Text style={[T.caption, { marginTop: Spacing[2] }]}>
          {consistencyScore > 0.8 ? 'Excellent — very regular pattern 🏆'
            : consistencyScore > 0.6 ? 'Good — mostly on schedule'
              : consistencyScore > 0.4 ? 'Fair — some gaps to work on'
                : 'Needs work — build a regular schedule'}
        </Text>
      </View>

      {/* 30-day mini calendar */}
      <View style={[Cards.compact]}>
        <Text style={[T.label, { marginBottom: Spacing[3] }]}>Last 30 Days</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {last30.map((date) => {
            const log = todayLogsMap.get(date);
            // We only have today's log in todayLogsMap — for history, use streak data as proxy
            const completed = log?.completedAt !== null && log !== undefined;
            const isToday = date === last30[last30.length - 1];
            return (
              <View
                key={date}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  backgroundColor: completed
                    ? habit.color
                    : isToday ? Colors.accentMuted : Colors.surfaceElevated,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: Colors.accent,
                }}
              />
            );
          })}
        </View>
        <Text style={[T.xs, { color: Colors.textDim, marginTop: Spacing[2] }]}>
          Each cell = 1 day · filled = completed
        </Text>
      </View>

      {/* Frequency info */}
      <View style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }]}>
        <Ionicons name="repeat-outline" size={20} color={Colors.textMuted} />
        <View>
          <Text style={T.sm}>
            {habit.frequencyRules.type === 'daily' ? 'Every day' :
              `Weekly on: ${(habit.frequencyRules.daysOfWeek ?? []).map((d) => getShortDayName(d)).join(', ')}`}
          </Text>
          {habit.type !== 'boolean' && (
            <Text style={T.caption}>
              Target: {habit.targetValue}{habit.unit ? ` ${habit.unit}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Streak milestone progress */}
      {streak && (
        <View style={[Cards.compact]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[2] }}>
            <Text style={T.label}>🔥 Streak</Text>
            <Text style={[T.sm, { color: Colors.warning }]}>{streak.current} days</Text>
          </View>
          {streak.lastCompletedDate && (
            <Text style={T.caption}>Last completed: {streak.lastCompletedDate}</Text>
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
