/**
 * MoodCorrelationWidget — Horizontal bar chart showing which habits
 * correlate positively / negatively with mood (Pearson r).
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Cards, Text as T } from '@design/components';

function CorrelationBar({ value, color }: { value: number; color: string }) {
  const pct = Math.abs(value) * 50; // max 50% each side
  const isPositive = value >= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 8 }}>
      {/* Negative side */}
      <View style={{ flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', justifyContent: 'flex-end' }}>
        {!isPositive && (
          <View style={{ width: `${pct * 2}%`, height: 6, backgroundColor: Colors.danger, borderRadius: 3 }} />
        )}
      </View>
      {/* Center line */}
      <View style={{ width: 1, height: 12, backgroundColor: Colors.borderLight, marginHorizontal: 2 }} />
      {/* Positive side */}
      <View style={{ flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' }}>
        {isPositive && (
          <View style={{ width: `${pct * 2}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
        )}
      </View>
    </View>
  );
}

export function MoodCorrelationWidget() {
  const moodCorrelations = useAnalyticsStore((s) => s.moodCorrelations);
  const habits = useHabitStore((s) => s.habits);
  const categories = useHabitStore((s) => s.categories);
  const habitMap = new Map(habits.map((h) => [h.id, h]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  /** Resolve display color: category color → habit.color → fallback */
  const resolveHabitColor = (habit: { color: string; categoryId: string | null }, fallback: string): string => {
    if (habit.categoryId) {
      const cat = categoryMap.get(habit.categoryId);
      if (cat?.color) return cat.color;
    }
    return habit.color ?? fallback;
  };

  // Sort by abs(correlation), show top 6
  const sorted = [...moodCorrelations]
    .filter((c) => c.sampleSize >= 5)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 6);

  if (sorted.length === 0) {
    return (
      <View style={[Cards.base, { marginBottom: Spacing[4], alignItems: 'center', paddingVertical: Spacing[6] }]}>
        <Ionicons name="analytics-outline" size={32} color={Colors.textMuted} />
        <Text style={[T.caption, { marginTop: Spacing[2], textAlign: 'center' }]}>
          Log mood and habits for 5+ overlapping days to see correlations
        </Text>
      </View>
    );
  }

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <Text style={[T.label, { marginBottom: Spacing[1] }]}>Mood Correlation</Text>
      <Text style={[T.caption, { marginBottom: Spacing[4] }]}>
        How each habit affects your mood (Pearson r)
      </Text>

      {/* Axis labels */}
      <View style={{ flexDirection: 'row', marginBottom: Spacing[2] }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[T.xs, { color: Colors.danger }]}>Negative</Text>
        </View>
        <View style={{ width: 5 }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[T.xs, { color: Colors.success }]}>Positive</Text>
        </View>
      </View>

      <View style={{ gap: Spacing[3] }}>
        {sorted.map((c) => {
          const habit = habitMap.get(c.habitId);
          if (!habit) return null;
          const isPositive = c.correlation >= 0;
          const strength =
            Math.abs(c.correlation) > 0.5 ? 'Strong' :
            Math.abs(c.correlation) > 0.3 ? 'Moderate' : 'Weak';
          const color = resolveHabitColor(habit, isPositive ? Colors.success : Colors.danger);

          return (
            <View key={c.habitId}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[1] }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: Spacing[2] }} />
                <Text style={[T.sm, { flex: 1 }]} numberOfLines={1}>
                  {habit.isBadHabit && <Text>🛡️ </Text>}
                  {habit.name}
                </Text>
                <Text style={[T.xs, {
                  color: isPositive ? Colors.success : Colors.danger,
                  fontFamily: 'Inter_600SemiBold',
                }]}>
                  {isPositive ? '+' : ''}{c.correlation.toFixed(2)}
                </Text>
                <Text style={[T.xs, { color: Colors.textDim, marginLeft: Spacing[1] }]}>
                  ({strength})
                </Text>
              </View>
              <CorrelationBar value={c.correlation} color={color} />
              <Text style={[T.xs, { color: Colors.textDim, marginTop: 2 }]}>
                Based on {c.sampleSize} overlapping days
              </Text>
              {habit.isBadHabit && (
                <Text style={[T.xs, { color: isPositive ? Colors.warning : Colors.success, marginTop: 1, fontStyle: 'italic' }]}>
                  {isPositive
                    ? '⚠️ Doing this correlates with better mood — consider healthy alternatives.'
                    : '✓ Avoiding this habit improves your mood.'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
