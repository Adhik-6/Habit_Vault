import { useAccentColors } from '@/hooks/use-accent-colors';
import { Cards, Sheet, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { ProgressRing } from '@src/components/common/ProgressRing';
import { AddStreakTargetSheet } from '@src/components/habits/AddStreakTargetSheet';
import { useHabitStore } from '@store/useHabitStore';
import { useStreakTargetStore } from '@store/useStreakTargetStore';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SortOption = 'daysRemaining' | 'progress' | 'name' | 'createdAt';
type SortDirection = 'asc' | 'desc';
const HABIT_TYPES = ['boolean', 'quantity', 'composite', 'counter'] as const;

export function GoalsTab() {
  const { targets, loadTargets, removeTarget } = useStreakTargetStore();
  const { habits, categories } = useHabitStore();
  const ac = useAccentColors();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | undefined>();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('progress');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const filteredAndSortedTargets = useMemo(() => {
    let result = targets.map(target => {
      const habit = habits.find(h => h.id === target.habitId);
      return { ...target, habit };
    }).filter(t => t.habit);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.habit!.name.toLowerCase().includes(q) || (t.label && t.label.toLowerCase().includes(q)));
    }

    if (selectedCategories.length > 0) {
      result = result.filter(t => selectedCategories.includes(t.habit!.categoryId || 'uncategorized'));
    }

    if (selectedTypes.length > 0) {
      result = result.filter(t => selectedTypes.includes(t.habit!.type));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortOption === 'daysRemaining') {
        cmp = a.daysRemaining - b.daysRemaining;
      } else if (sortOption === 'progress') {
        const progA = a.currentStreak / a.targetDays;
        const progB = b.currentStreak / b.targetDays;
        cmp = progA - progB;
      } else if (sortOption === 'name') {
        cmp = a.habit!.name.localeCompare(b.habit!.name);
      } else if (sortOption === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [targets, habits, searchQuery, sortOption, sortDirection, selectedCategories, selectedTypes]);

  const categoriesWithHabits = useMemo(() => {
    const cats: { id: string, name: string, color: string }[] = [];
    for (const cat of categories) {
      if (habits.some(h => h.categoryId === cat.id)) {
        cats.push({ id: cat.id, name: cat.name, color: cat.color });
      }
    }
    if (habits.some(h => h.categoryId === null)) {
      cats.push({ id: 'uncategorized', name: 'Other', color: ac.accent });
    }
    return cats;
  }, [categories, habits, ac.accent]);

  const handleReset = () => {
    setSortOption('progress');
    setSortDirection('desc');
    setSelectedCategories([]);
    setSelectedTypes([]);
  };

  const isFiltered = selectedCategories.length > 0 || selectedTypes.length > 0;

  return (
    <View style={{ flex: 1, gap: Spacing[4] }}>
      <View style={{ flexDirection: 'row', gap: Spacing[2], alignItems: 'center' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing[3], height: 44 }}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={[T.bodyMedium, { flex: 1, color: Colors.text, marginLeft: Spacing[2], padding: 0 }]}
            placeholder="Search goals..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          onPress={() => setFilterSheetVisible(true)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: isFiltered ? ac.accent + '22' : Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: isFiltered ? ac.accent : Colors.border }}
        >
          <Ionicons name="filter" size={20} color={isFiltered ? ac.accent : Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setEditingTargetId(undefined); setSheetVisible(true); }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: ac.accent, borderRadius: Radius.md }}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {filteredAndSortedTargets.length === 0 ? (
        <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[8] }]}>
          {searchQuery ? (
            <>
              <Text style={{ fontSize: 36 }}>🔍</Text>
              <Text style={[T.bodyMedium, { marginTop: Spacing[2] }]}>No matching goals</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 36 }}>🎯</Text>
              <Text style={[T.bodyMedium, { marginTop: Spacing[2] }]}>No Goals Yet</Text>
              <Text style={[T.caption, { textAlign: 'center', marginTop: Spacing[1] }]}>
                Set custom streak targets for your habits to stay motivated.
              </Text>
            </>
          )}
        </View>
      ) : (
        <View style={{ gap: Spacing[3] }}>
          {filteredAndSortedTargets.map((target, i) => {
            const habit = target.habit!;
            const isBad = habit.isBadHabit;
            const category = categories.find((c) => c.id === habit.categoryId);
            const targetColor = target.isAchieved ? Colors.success : (isBad ? Colors.danger : (category?.color || ac.accent));
            const icon = isBad ? '🛡️' : '🔥';
            const progress = Math.min(1, target.currentStreak / target.targetDays);

            return (
              <Animated.View key={target.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                <View style={[Cards.base, {
                  flexDirection: 'row', alignItems: 'center', gap: Spacing[4],
                  borderColor: target.isAchieved ? Colors.success : Colors.border,
                  ...(target.isAchieved ? { shadowColor: Colors.success, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, elevation: 15 } : {})
                }]}>
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    <ProgressRing progress={progress} size={64} strokeWidth={5} color={targetColor} isBadHabitGradient={isBad && !target.isAchieved} />
                    <View style={{ position: 'absolute' }}>
                      <Text style={{ fontSize: 18 }}>{icon}</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    {!!target.label && <Text style={T.label}>{target.label}</Text>}
                    <Text style={[T.h3, { color: Colors.text, marginTop: 2 }]} numberOfLines={1}>
                      {habit.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[1], alignItems: 'center' }}>
                      {target.isAchieved ? (
                        <View style={{ backgroundColor: Colors.successDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                          <Text style={[T.xs, { color: Colors.success, fontWeight: 'bold' }]}>ACHIEVED!</Text>
                        </View>
                      ) : (
                        <Text style={T.caption}>
                          {target.daysRemaining} {target.daysRemaining === 1 ? 'day' : 'days'} to go
                        </Text>
                      )}
                      <Text style={T.caption}>• {target.currentStreak} / {target.targetDays}</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => { setEditingTargetId(target.id); setSheetVisible(true); }} style={{ padding: Spacing[2] }}>
                    <Ionicons name="pencil" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}

      {sheetVisible && (
        <AddStreakTargetSheet
          onClose={() => setSheetVisible(false)}
          editingTargetId={editingTargetId}
        />
      )}

      {filterSheetVisible && (
        <Modal transparent animationType="slide" onRequestClose={() => setFilterSheetVisible(false)}>
          <TouchableOpacity style={Sheet.backdrop} activeOpacity={1} onPress={() => setFilterSheetVisible(false)} />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[Sheet.container, { paddingBottom: Spacing[8], maxHeight: '80%' }]}>
              <View style={Sheet.handle} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] }}>
                <Text style={T.h3}>Filter & Sort</Text>
                <TouchableOpacity onPress={handleReset}>
                  <Text style={[T.smMedium, { color: Colors.danger }]}>Clear All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[T.label, { marginBottom: Spacing[2] }]}>Sort By</Text>
                <View style={{ gap: Spacing[2], marginBottom: Spacing[4] }}>
                  {(['progress', 'daysRemaining', 'name', 'createdAt'] as SortOption[]).map(opt => {
                    const isSelected = sortOption === opt;
                    const labels: Record<SortOption, string> = {
                      progress: 'Progress Percentage',
                      daysRemaining: 'Days Remaining',
                      name: 'Habit Name',
                      createdAt: 'Creation Date'
                    };
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => {
                          if (isSelected) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                          else { setSortOption(opt); setSortDirection('desc'); }
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border
                        }}
                      >
                        <Text style={[T.bodyMedium, { color: isSelected ? ac.accent : Colors.text }]}>{labels[opt]}</Text>
                        {isSelected && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[1] }}>
                            <Text style={[T.xs, { color: ac.accent, textTransform: 'uppercase' }]}>{sortDirection}</Text>
                            <Ionicons name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} color={ac.accent} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {categoriesWithHabits.length > 0 && (
                  <>
                    <Text style={[T.label, { marginBottom: Spacing[2] }]}>Categories</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[4] }}>
                      {categoriesWithHabits.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                              setSelectedCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]);
                            }}
                            style={{
                              paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], borderRadius: Radius.full,
                              backgroundColor: isSelected ? cat.color : Colors.surface, borderWidth: 1,
                              borderColor: isSelected ? cat.color : Colors.border,
                            }}
                          >
                            <Text style={[T.smMedium, { color: isSelected ? '#FFF' : Colors.textSecondary }]}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={[T.label, { marginBottom: Spacing[2] }]}>Habit Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[8] }}>
                  {HABIT_TYPES.map((type) => {
                    const isSelected = selectedTypes.includes(type);
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => {
                          setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
                        }}
                        style={{
                          paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], borderRadius: Radius.full,
                          backgroundColor: isSelected ? ac.accent : Colors.surface, borderWidth: 1,
                          borderColor: isSelected ? ac.accent : Colors.border,
                        }}
                      >
                        <Text style={[T.smMedium, { color: isSelected ? '#FFF' : Colors.textSecondary, textTransform: 'capitalize' }]}>
                          {type === 'composite' ? 'Checklist' : type === 'boolean' ? 'Done / Undone' : type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
