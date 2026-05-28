import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Cards, Layout, Buttons, Text as T, Inputs } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { useHabitStore } from '@store/useHabitStore';
import { getHabits } from '@services/habitService';
import type { Habit } from '@src/types';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { HabitFilterSheet, type HabitFilterOptions, type SortOption, type FilterType } from '@src/components/habits/HabitFilterSheet';
import { BottomSheetRef } from '@src/components/common/BottomSheet';
import { TextInput } from 'react-native-gesture-handler';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function HabitsScreen() {
  const router = useRouter();
  const habits = useHabitStore((s) => s.habits);
  const categories = useHabitStore((s) => s.categories);
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const ac = useAccentColors();

  const sortedGlobal = [...strengthScores].sort((a, b) => b.score - a.score);
  
  const getRank = (habitId: string) => {
    const idx = sortedGlobal.findIndex(s => s.habitId === habitId);
    return idx === -1 ? '-' : idx + 1;
  };

  const getScore = (habitId: string) => {
    return strengthScores.find(s => s.habitId === habitId)?.score ?? 0;
  };
  
  const [showArchived, setShowArchived] = React.useState(false);
  const [archivedHabits, setArchivedHabits] = React.useState<Habit[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const [filterOpts, setFilterOpts] = React.useState<HabitFilterOptions>({
    sortBy: 'strength',
    sortDesc: true,
    filterTypes: [],
    filterCategoryIds: [],
    groupByCategory: true,
  });
  const filterSheetRef = React.useRef<BottomSheetRef>(null);

  React.useEffect(() => {
    if (showArchived) {
      getHabits(true).then(all => {
        setArchivedHabits(all.filter(h => h.archivedAt));
      });
    }
  }, [showArchived, habits]);

  // Apply filters and sorting
  let activeHabits = showArchived ? archivedHabits : habits;
  
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    activeHabits = activeHabits.filter(h => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
  }

  if (filterOpts.filterTypes.length > 0) {
    activeHabits = activeHabits.filter(h => filterOpts.filterTypes.includes(h.type as any));
  }

  if (filterOpts.filterCategoryIds.length > 0) {
    activeHabits = activeHabits.filter(h => {
      if (h.categoryId === null) return filterOpts.filterCategoryIds.includes('none');
      return filterOpts.filterCategoryIds.includes(h.categoryId);
    });
  }

  activeHabits = [...activeHabits].sort((a, b) => {
    let valA = 0;
    let valB = 0;
    let strA = '';
    let strB = '';
    
    switch (filterOpts.sortBy) {
      case 'strength':
        valA = strengthScores.find(s => s.habitId === a.id)?.score ?? 0;
        valB = strengthScores.find(s => s.habitId === b.id)?.score ?? 0;
        break;
      case 'completion':
        valA = strengthScores.find(s => s.habitId === a.id)?.completionRate ?? 0;
        valB = strengthScores.find(s => s.habitId === b.id)?.completionRate ?? 0;
        break;
      case 'consistency':
        // using completion rate as proxy for consistency here
        valA = strengthScores.find(s => s.habitId === a.id)?.completionRate ?? 0;
        valB = strengthScores.find(s => s.habitId === b.id)?.completionRate ?? 0;
        break;
      case 'streak':
        valA = strengthScores.find(s => s.habitId === a.id)?.streak?.current ?? 0;
        valB = strengthScores.find(s => s.habitId === b.id)?.streak?.current ?? 0;
        break;
      case 'name':
        strA = a.name.toLowerCase();
        strB = b.name.toLowerCase();
        break;
    }
    
    if (filterOpts.sortBy === 'name') {
      return filterOpts.sortDesc ? strB.localeCompare(strA) : strA.localeCompare(strB);
    }
    return filterOpts.sortDesc ? valB - valA : valA - valB;
  });

  const categorized = categories.map((c) => ({
    category: c,
    habits: activeHabits.filter((h) => h.categoryId === c.id),
  })).filter((group) => group.habits.length > 0);

  const uncategorized = activeHabits.filter((h) => h.categoryId === null);

  const renderHabitRow = (habit: Habit, categoryColor?: string) => {
    const color = categoryColor || habit.color;
    const rank = getRank(habit.id);
    const isBad = habit.isBadHabit;
    return (
    <TouchableOpacity
      key={habit.id}
      onPress={() => router.push(`/habit/${habit.id}` as any)}
      style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginBottom: Spacing[2] }]}
    >
      {isBad ? (
        <LinearGradient
          colors={['#000000', Colors.danger]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 1 }}
        >
          <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 17, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[T.smMedium, { color: Colors.danger }]}>{rank}</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color }}>
          <Text style={[T.smMedium, { color: color }]}>{rank}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={T.bodyMedium}>{habit.name}</Text>
        <Text style={T.caption}>
          {habit.type === 'composite' ? 'Checklist' : habit.type === 'boolean' ? 'Done / Not Done' : habit.type.charAt(0).toUpperCase() + habit.type.slice(1)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[Layout.screen, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={[Layout.spaceBetween, { marginBottom: Spacing[4] }]}>
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

        {/* Search & Filter Bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={{ flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[5] }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: Spacing[3] }}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={[T.body, { flex: 1, paddingVertical: Spacing[3], paddingHorizontal: Spacing[2], color: Colors.text }]}
              placeholder="Search habits..."
              placeholderTextColor={Colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => filterSheetRef.current?.open()}
            style={{ 
              width: 48, height: 48, borderRadius: 12, 
              backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: (filterOpts.filterTypes.length > 0 || filterOpts.filterCategoryIds.length > 0) ? ac.accent : 'transparent'
            }}
          >
            <Ionicons name="options-outline" size={24} color={(filterOpts.filterTypes.length > 0 || filterOpts.filterCategoryIds.length > 0) ? ac.accent : Colors.text} />
          </TouchableOpacity>
        </Animated.View>

        {activeHabits.length === 0 ? (
          <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[8] }]}>
            <Ionicons name={showArchived ? "archive-outline" : "library-outline"} size={32} color={Colors.textMuted} />
            <Text style={[T.caption, { marginTop: Spacing[3] }]}>
              {showArchived && archivedHabits.length === 0 ? "No archived habits." : searchQuery || filterOpts.filterTypes.length > 0 ? "No habits match filters." : "No habits created yet."}
            </Text>
          </View>
        ) : (
          <>
            {filterOpts.groupByCategory ? (
              <>
                {categorized.map((group, index) => (
                  <Animated.View key={group.category.id} entering={FadeInDown.delay(index * 100).duration(300)}>
                    <View style={[Layout.row, { marginBottom: Spacing[3], marginTop: index > 0 ? Spacing[4] : 0 }]}>
                      {group.category.id === '__bad_habits__' ? (
                        <LinearGradient
                          colors={['#000000', Colors.danger]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ width: 10, height: 10, borderRadius: 5, marginRight: Spacing[2] }}
                        />
                      ) : (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.category.color, marginRight: Spacing[2] }} />
                      )}
                      <Text style={T.h3}>{group.category.name}</Text>
                    </View>
                    {group.habits.map((h) => renderHabitRow(h, group.category.color))}
                  </Animated.View>
                ))}

                {uncategorized.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(categorized.length * 100).duration(300)}>
                    {categorized.length > 0 && (
                      <Text style={[T.label, { marginBottom: Spacing[3], marginTop: Spacing[4] }]}>Other Habits</Text>
                    )}
                    {uncategorized.map((h) => renderHabitRow(h))}
                  </Animated.View>
                )}
              </>
            ) : (
              <Animated.View entering={FadeInDown.duration(300)}>
                {activeHabits.map((h) => renderHabitRow(h, h.categoryId ? categories.find(c => c.id === h.categoryId)?.color : undefined))}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <HabitFilterSheet
        ref={filterSheetRef}
        options={filterOpts}
        onChange={setFilterOpts}
      />
    </SafeAreaView>
  );
}
