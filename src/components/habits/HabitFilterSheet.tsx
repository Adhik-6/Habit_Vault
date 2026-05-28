import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Cards, Text as T, Layout } from '@design/components';
import { Ionicons } from '@expo/vector-icons';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { useHabitStore } from '@store/useHabitStore';
import { LinearGradient } from 'expo-linear-gradient';

export type SortOption = 'strength' | 'completion' | 'consistency' | 'streak' | 'name';
export type FilterType = 'boolean' | 'quantity' | 'composite' | 'counter';

export interface HabitFilterOptions {
  sortBy: SortOption;
  sortDesc: boolean;
  filterTypes: FilterType[];
  filterCategoryIds: string[];
  groupByCategory: boolean;
}

interface HabitFilterSheetProps {
  options: HabitFilterOptions;
  onChange: (opts: HabitFilterOptions) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'strength', label: 'Strength', icon: 'bar-chart' },
  { value: 'completion', label: 'Completion %', icon: 'pie-chart' },
  { value: 'consistency', label: 'Consistency', icon: 'calendar' },
  { value: 'streak', label: 'Streak', icon: 'flame' },
  { value: 'name', label: 'Name', icon: 'text' },
];

const TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'boolean', label: 'Done/Not Done' },
  { value: 'quantity', label: 'Measurable' },

  { value: 'composite', label: 'Checklist' },
  { value: 'counter', label: 'Counter' },
];

export const HabitFilterSheet = React.forwardRef<BottomSheetRef, HabitFilterSheetProps>(
  ({ options, onChange }, ref) => {
    const categories = useHabitStore((s) => s.categories);
    const ac = useAccentColors();

    const update = (patch: Partial<HabitFilterOptions>) => {
      onChange({ ...options, ...patch });
    };

    const handleReset = () => {
      onChange({
        ...options,
        sortBy: 'strength',
        sortDesc: true,
        filterTypes: [],
        filterCategoryIds: [],
      });
    };

    return (
      <BottomSheet ref={ref} title="Sort & Filter">
        <ScrollView style={{ paddingBottom: Spacing[8] }} showsVerticalScrollIndicator={false}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing[4] }}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[T.smMedium, { color: ac.accent }]}>Clear Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Grouping */}
          <View style={{ marginBottom: Spacing[6] }}>
            <Text style={[T.label, { marginBottom: Spacing[3] }]}>Display Mode</Text>
            <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
              <TouchableOpacity
                onPress={() => update({ groupByCategory: true })}
                style={[Cards.compact, { flex: 1, alignItems: 'center', borderColor: options.groupByCategory ? ac.accent : Colors.border }]}
              >
                <Text style={[T.smMedium, { color: options.groupByCategory ? ac.accent : Colors.text }]}>Group by Category</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => update({ groupByCategory: false })}
                style={[Cards.compact, { flex: 1, alignItems: 'center', borderColor: !options.groupByCategory ? ac.accent : Colors.border }]}
              >
                <Text style={[T.smMedium, { color: !options.groupByCategory ? ac.accent : Colors.text }]}>Flat List</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sorting */}
          <View style={{ marginBottom: Spacing[6] }}>
            <View style={[Layout.spaceBetween, { marginBottom: Spacing[3] }]}>
              <Text style={T.label}>Sort By</Text>
              <TouchableOpacity
                onPress={() => update({ sortDesc: !options.sortDesc })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[1] }}
              >
                <Text style={[T.xs, { color: Colors.textMuted }]}>{options.sortDesc ? 'Descending' : 'Ascending'}</Text>
                <Ionicons name={options.sortDesc ? "arrow-down" : "arrow-up"} size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => update({ sortBy: opt.value })}
                  style={[Cards.compact, {
                    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
                    paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                    borderColor: options.sortBy === opt.value ? ac.accent : Colors.border,
                    backgroundColor: options.sortBy === opt.value ? ac.accentMuted : Colors.surface,
                  }]}
                >
                  <Ionicons name={opt.icon as any} size={16} color={options.sortBy === opt.value ? ac.accentGlow : Colors.textMuted} />
                  <Text style={[T.sm, { color: options.sortBy === opt.value ? ac.accentGlow : Colors.textSecondary }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Filtering - Type */}
          <View style={{ marginBottom: Spacing[6] }}>
            <Text style={[T.label, { marginBottom: Spacing[3] }]}>Habit Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
              <TouchableOpacity
                onPress={() => update({ filterTypes: [] })}
                style={[Cards.compact, {
                  paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                  borderColor: options.filterTypes.length === 0 ? ac.accent : Colors.border,
                  backgroundColor: options.filterTypes.length === 0 ? ac.accentMuted : Colors.surface,
                }]}
              >
                <Text style={[T.sm, { color: options.filterTypes.length === 0 ? ac.accentGlow : Colors.textSecondary }]}>All Types</Text>
              </TouchableOpacity>
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = options.filterTypes.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      if (isSelected) {
                        update({ filterTypes: options.filterTypes.filter((t) => t !== opt.value) });
                      } else {
                        update({ filterTypes: [...options.filterTypes, opt.value] });
                      }
                    }}
                    style={[Cards.compact, {
                      paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                      borderColor: isSelected ? ac.accent : Colors.border,
                      backgroundColor: isSelected ? ac.accentMuted : Colors.surface,
                    }]}
                  >
                    <Text style={[T.sm, { color: isSelected ? ac.accentGlow : Colors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Filtering - Category */}
          <View style={{ marginBottom: Spacing[6] }}>
            <Text style={[T.label, { marginBottom: Spacing[3] }]}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
              <TouchableOpacity
                onPress={() => update({ filterCategoryIds: [] })}
                style={[Cards.compact, {
                  paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                  borderColor: options.filterCategoryIds.length === 0 ? ac.accent : Colors.border,
                  backgroundColor: options.filterCategoryIds.length === 0 ? ac.accentMuted : Colors.surface,
                }]}
              >
                <Text style={[T.sm, { color: options.filterCategoryIds.length === 0 ? ac.accentGlow : Colors.textSecondary }]}>All Categories</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const isSelected = options.filterCategoryIds.includes('none');
                  if (isSelected) {
                    update({ filterCategoryIds: options.filterCategoryIds.filter((c) => c !== 'none') });
                  } else {
                    update({ filterCategoryIds: [...options.filterCategoryIds, 'none'] });
                  }
                }}
                style={[Cards.compact, {
                  paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                  borderColor: options.filterCategoryIds.includes('none') ? ac.accent : Colors.border,
                  backgroundColor: options.filterCategoryIds.includes('none') ? ac.accentMuted : Colors.surface,
                }]}
              >
                <Text style={[T.sm, { color: options.filterCategoryIds.includes('none') ? ac.accentGlow : Colors.textSecondary }]}>Uncategorized</Text>
              </TouchableOpacity>
              {categories.map((cat) => {
                const isSelected = options.filterCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      if (isSelected) {
                        update({ filterCategoryIds: options.filterCategoryIds.filter((c) => c !== cat.id) });
                      } else {
                        update({ filterCategoryIds: [...options.filterCategoryIds, cat.id] });
                      }
                    }}
                    style={[Cards.compact, {
                      flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
                      paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                      borderColor: isSelected ? ac.accent : Colors.border,
                      backgroundColor: isSelected ? ac.accentMuted : Colors.surface,
                    }]}
                  >
                    {cat.id === '__bad_habits__' ? (
                      <LinearGradient
                        colors={['#000000', Colors.danger]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: 8, height: 8, borderRadius: 4 }}
                      />
                    ) : (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                    )}
                    <Text style={[T.sm, { color: isSelected ? ac.accentGlow : Colors.textSecondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </BottomSheet>
    );
  }
);
