import React from 'react';
import { View, Text } from 'react-native';
import { useHabitStore } from '@store/useHabitStore';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { Cards, Text as T } from '@design/components';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { ProgressRing } from '@src/components/common/ProgressRing';

export function CategoryAnalysisWidget() {
  const categories = useHabitStore((s) => s.categories);
  const habits = useHabitStore((s) => s.habits);
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);

  if (categories.length === 0 || habits.length === 0) {
    return null;
  }

  // Calculate average strength score and completion rate for each category
  const categoryStats = categories.map((cat) => {
    const catHabits = habits.filter((h) => h.categoryId === cat.id);
    if (catHabits.length === 0) return null;

    let totalScore = 0;
    let totalRate = 0;

    catHabits.forEach((h) => {
      const scoreData = strengthScores.find((s) => s.habitId === h.id);
      totalScore += scoreData?.score ?? 0;
      totalRate += scoreData?.completionRate ?? 0;
    });

    return {
      category: cat,
      habitCount: catHabits.length,
      avgScore: Math.round(totalScore / catHabits.length),
      avgRate: totalRate / catHabits.length,
    };
  }).filter(Boolean) as { category: any; habitCount: number; avgScore: number; avgRate: number }[];

  // Sort by highest average score
  categoryStats.sort((a, b) => b.avgScore - a.avgScore);

  if (categoryStats.length === 0) return null;

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <Text style={[T.label, { marginBottom: Spacing[3] }]}>Category Analysis</Text>
      
      {categoryStats.map((stat, i) => (
        <View 
          key={stat.category.id} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: Spacing[3],
            paddingVertical: Spacing[2],
            borderBottomWidth: i < categoryStats.length - 1 ? 1 : 0,
            borderBottomColor: Colors.border,
          }}
        >
          {/* Icon */}
          <View style={{ 
            width: 32, height: 32, borderRadius: Radius.md, 
            backgroundColor: stat.category.color + '22',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Ionicons name={stat.category.icon as any} size={18} color={stat.category.color} />
          </View>
          
          {/* Details */}
          <View style={{ flex: 1 }}>
            <Text style={T.bodyMedium}>{stat.category.name}</Text>
            <Text style={T.caption}>{stat.habitCount} habits</Text>
          </View>
          
          {/* Metrics */}
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[T.smMedium, { color: stat.category.color }]}>
              {Math.round(stat.avgRate * 100)}% <Text style={[T.xs, { color: Colors.textMuted }]}>rate</Text>
            </Text>
            <Text style={[T.xs, { color: Colors.textDim }]}>Score {stat.avgScore}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
