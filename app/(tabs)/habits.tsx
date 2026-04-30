import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Cards, Layout, Buttons, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { useHabitStore } from '@store/useHabitStore';
import { getHabits } from '@services/habitService';
import type { Habit } from '@src/types';

export default function HabitsScreen() {
  const router = useRouter();
  const habits = useHabitStore((s) => s.habits);
  const categories = useHabitStore((s) => s.categories);
  
  const [showArchived, setShowArchived] = React.useState(false);
  const [archivedHabits, setArchivedHabits] = React.useState<Habit[]>([]);

  React.useEffect(() => {
    if (showArchived) {
      getHabits(true).then(all => {
        setArchivedHabits(all.filter(h => h.archivedAt));
      });
    }
  }, [showArchived, habits]);

  // Group habits by category
  const activeHabits = showArchived ? archivedHabits : habits;

  const categorized = categories.map((c) => ({
    category: c,
    habits: activeHabits.filter((h) => h.categoryId === c.id),
  })).filter((group) => group.habits.length > 0);

  const uncategorized = activeHabits.filter((h) => h.categoryId === null);

  const renderHabitRow = (habit: Habit) => (
    <TouchableOpacity
      key={habit.id}
      onPress={() => router.push(`/habit/${habit.id}` as any)}
      style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[2] }]}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: habit.color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={habit.icon as any} size={18} color={habit.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={T.bodyMedium}>{habit.name}</Text>
        <Text style={T.caption}>
          {habit.type === 'composite' ? 'Checklist' : habit.type === 'boolean' ? 'Done / Not Done' : habit.type.charAt(0).toUpperCase() + habit.type.slice(1)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={[Layout.spaceBetween, { marginBottom: Spacing[5] }]}>
          <View>
            <Text style={T.label}>All Habits</Text>
            <Text style={T.h1}>Library</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowArchived(!showArchived)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], padding: Spacing[2], backgroundColor: showArchived ? Colors.warning + '22' : Colors.surfaceElevated, borderRadius: 20 }}
          >
            <Ionicons name="archive-outline" size={16} color={showArchived ? Colors.warning : Colors.textMuted} />
            <Text style={[T.smMedium, { color: showArchived ? Colors.warning : Colors.textMuted }]}>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {activeHabits.length === 0 ? (
          <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[8] }]}>
            <Ionicons name={showArchived ? "archive-outline" : "library-outline"} size={32} color={Colors.textMuted} />
            <Text style={[T.caption, { marginTop: Spacing[3] }]}>
              {showArchived ? "No archived habits." : "No habits created yet."}
            </Text>
          </View>
        ) : (
          <>
            {categorized.map((group, index) => (
              <Animated.View key={group.category.id} entering={FadeInDown.delay(index * 100).duration(300)}>
                <View style={[Layout.row, { marginBottom: Spacing[3], marginTop: index > 0 ? Spacing[4] : 0 }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.category.color, marginRight: Spacing[2] }} />
                  <Text style={T.h3}>{group.category.name}</Text>
                </View>
                {group.habits.map(renderHabitRow)}
              </Animated.View>
            ))}

            {uncategorized.length > 0 && (
              <Animated.View entering={FadeInDown.delay(categorized.length * 100).duration(300)}>
                {categorized.length > 0 && (
                  <Text style={[T.label, { marginBottom: Spacing[3], marginTop: Spacing[4] }]}>Other Habits</Text>
                )}
                {uncategorized.map(renderHabitRow)}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
