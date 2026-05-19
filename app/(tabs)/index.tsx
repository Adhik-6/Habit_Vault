import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategoriesWithHabits, useHabitsForSelectedDate, useUncategorizedHabits } from '@/hooks/use-habits-for-date';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { archiveHabit, deleteHabit } from '@services/habitService';
import type { CategoryWithHabits, HabitWithLog } from '@src/types';
import { useHabitStore } from '@store/useHabitStore';
import { useMoodStore } from '@store/useMoodStore';

import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { MonthCalendar } from '@src/components/common/MonthCalendar';
import { ProgressRing } from '@src/components/common/ProgressRing';
import { HabitCard } from '@src/components/habits/HabitCard';
import { HabitForm, type HabitFormRef } from '@src/components/habits/HabitForm';

import { Buttons, Cards, Layout, Text as T } from '@design/components';
import { Colors, moodColor, Radius, Spacing } from '@design/tokens';
import { scoreToEmoji as moodEmoji } from '@services/moodService';
import {
  formatDisplayDate,
  todayString
} from '@src/utils/dateUtils';

// ── Category Section ─────────────────────────────────────────────────────────────
function CategorySection({ category, onLongPressHabit }: {
  category: CategoryWithHabits;
  onLongPressHabit: (h: HabitWithLog) => void;
}) {
  const pct = category.totalCount > 0 ? category.completedCount / category.totalCount : 0;
  const ac = useAccentColors();

  return (
    <View style={{ marginBottom: Spacing[5] }}>
      {/* Category header */}
      <View style={[Layout.spaceBetween, { marginBottom: Spacing[3] }]}>
        <View style={Layout.row}>
          <View style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: category.color, marginRight: Spacing[2],
          }} />
          <Text style={T.h3}>{category.name}</Text>
        </View>
        <View style={Layout.row}>
          <Text style={[T.caption, { marginRight: Spacing[2] }]}>
            {category.completedCount}/{category.totalCount}
          </Text>
          <Text style={[T.xs, {
            color: pct === 1 ? Colors.success : Colors.textMuted,
          }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
      </View>

      {/* Habits */}
      {category.habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onLongPress={onLongPressHabit} />
      ))}

      {/* Category complete banner — uses the category's own color, not accent */}
      {pct === 1 && category.totalCount > 0 && (
        <Animated.View entering={ZoomIn.duration(300)} style={[Cards.accentBorder, { borderColor: category.color, shadowColor: category.color }, { alignItems: 'center', paddingVertical: Spacing[3], flexDirection: 'row', justifyContent: 'center', gap: Spacing[2] }]}>
          <Text style={{ fontSize: 20 }}>🎉</Text>
          <Text style={[T.bodyMedium, { color: category.color }]}>{category.name} complete!</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Mood Logger ───────────────────────────────────────────────────────────────
const MOOD_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function MoodLogger({ sheetRef, selectedDate }: {
  sheetRef: React.RefObject<BottomSheetRef>;
  selectedDate: string;
}) {
  const logMood = useMoodStore((s) => s.logMood);
  const deleteMood = useMoodStore((s) => s.deleteMood);
  const moodByDate = useMoodStore((s) => s.moodByDate);
  const moodForDate = moodByDate.get(selectedDate) ?? null;
  const isToday = selectedDate === todayString();

  const handleMood = async (score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (moodForDate?.score === score) {
      await deleteMood(selectedDate);
    } else {
      await logMood({ score, date: selectedDate });
    }
    sheetRef.current?.close();
  };

  return (
    <View style={{ gap: Spacing[4], paddingBottom: Spacing[8] }}>
      <Text style={[T.body, { color: Colors.textSecondary, textAlign: 'center' }]}>
        {isToday ? 'How are you feeling today?' : `Mood for ${formatDisplayDate(selectedDate)}`}
      </Text>
      {moodForDate && (
        <View style={[Cards.compact, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 28 }}>{moodEmoji(moodForDate.score)}</Text>
          <Text style={[T.caption, { marginTop: Spacing[1] }]}>
            {isToday ? 'Current' : 'Logged'} mood: {moodForDate.score}/10
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing[2] }}>
        {MOOD_SCORES.map((score) => (
          <TouchableOpacity
            key={score}
            onPress={() => handleMood(score)}
            style={{
              width: 54, height: 54, borderRadius: Radius.lg,
              backgroundColor: Colors.surfaceElevated,
              borderWidth: 2,
              borderColor: moodForDate?.score === score ? moodColor(score) : Colors.border,
              alignItems: 'center', justifyContent: 'center',
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 18 }}>{moodEmoji(score)}</Text>
            <Text style={[T.xs, { color: Colors.textMuted }]}>{score}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}


// ── Context Menu (long press) ─────────────────────────────────────────────────
function HabitContextMenu({
  habit,
  sheetRef,
  onClose,
  formRef,
}: {
  habit: HabitWithLog | null;
  sheetRef: React.RefObject<BottomSheetRef>;
  onClose: () => void;
  formRef: React.RefObject<HabitFormRef>;
}) {
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const ac = useAccentColors();

  if (!habit) return null;

  const handleEdit = () => {
    sheetRef.current?.close();
    setTimeout(() => {
      if (habit) formRef.current?.openEdit(habit);
    }, 300);
  };

  const handleArchive = () => {
    Alert.alert('Archive Habit', `Archive "${habit?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'default', onPress: async () => {
          sheetRef.current?.close();
          if (habit) await archiveHabit(habit.id);
          await loadHabits();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Habit', `Delete "${habit.name}" and all its data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          sheetRef.current?.close();
          await deleteHabit(habit.id);
          await loadHabits();
        },
      },
    ]);
  };

  return (
    <>
      <View style={{ gap: Spacing[2], paddingBottom: Spacing[8] }}>
        <View style={[Cards.compact, { marginBottom: Spacing[2] }]}>
          <Text style={T.h3} numberOfLines={1}>{habit.name}</Text>
          <Text style={T.caption}>{habit.type} habit</Text>
        </View>
        {[
          { icon: 'create-outline', label: 'Edit Habit', action: handleEdit, color: ac.accent },
          { icon: 'archive-outline', label: 'Archive', action: handleArchive, color: Colors.warning },
          { icon: 'trash-outline', label: 'Delete', action: handleDelete, color: Colors.danger },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.action}
            style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }]}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            <Text style={[T.bodyMedium, { color: item.color }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

// ── Today Screen ──────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const formRef = useRef<HabitFormRef>(null);
  const moodSheetRef = useRef<BottomSheetRef>(null);
  const contextSheetRef = useRef<BottomSheetRef>(null);
  const [contextHabit, setContextHabit] = React.useState<HabitWithLog | null>(null);

  const isLoading = useHabitStore((s) => s.isLoading);
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const habitsForDate = useHabitsForSelectedDate();
  const categoriesWithHabits = useCategoriesWithHabits();
  const uncategorizedHabits = useUncategorizedHabits();
  // Subscribe to the whole moodByDate map so we re-render on any mood change
  const moodByDate = useMoodStore((s) => s.moodByDate);
  const moodForDate = moodByDate.get(selectedDate) ?? null;
  const ac = useAccentColors();

  const completed = habitsForDate.filter((h) => h.isCompleted).length;
  const total = habitsForDate.length;
  const pct = total > 0 ? completed / total : 0;

  const handleLongPress = useCallback((habit: HabitWithLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setContextHabit(habit);
    contextSheetRef.current?.open();
  }, []);

  const nonEmptyCategories = categoriesWithHabits.filter((s) => s.habits.length > 0);

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      {/* ── Fixed header ── */}
      <Animated.View entering={FadeIn.duration(350)}>
        <View style={[Layout.spaceBetween, { paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[4] }]}>
          <View>
            {/* <Text style={T.label}>{getRelativeLabel(selectedDate)}</Text> */}
            <Text style={T.h1}>
              {selectedDate === todayString() ? 'Today' : formatDisplayDate(selectedDate)}
            </Text>
          </View>
          <View style={Layout.row}>
            {/* Mood button */}
            <TouchableOpacity
              onPress={() => moodSheetRef.current?.open()}
              style={[Buttons.icon, { backgroundColor: moodForDate ? ac.accentMuted : Colors.surfaceElevated, borderColor: moodForDate ? ac.accentDim : Colors.border }]}
            >
              <Text style={{ fontSize: 18 }}>
                {moodForDate ? moodEmoji(moodForDate.score) : '😐'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => formRef.current?.openCreate(selectedDate)}
              style={[Buttons.icon, { marginLeft: Spacing[2], backgroundColor: ac.accentMuted, borderColor: ac.accentDim }]}
            >
              <Ionicons name="add" size={22} color={ac.accentGlow} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── Scrollable habit list & calendar ── */}
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={5}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: Spacing[24] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        // keyboardDismissMode="on-drag"
        >
          <Animated.View entering={FadeIn.duration(350)}>
            {/* Monthly Calendar */}
            <View style={{ paddingHorizontal: Spacing[5] }}>
              <MonthCalendar />
            </View>

            {/* Progress summary */}
            {total > 0 && (
              <View style={[Cards.base, { margin: Spacing[5], marginTop: Spacing[2], flexDirection: 'row', alignItems: 'center', gap: Spacing[4] }]}>
                <ProgressRing progress={pct} size={60} strokeWidth={5} color={pct === 1 ? Colors.success : ac.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={T.h3}>
                    {completed}/{total} done
                    {pct === 1 ? ' 🎉' : ''}
                  </Text>
                  <Text style={T.caption}>{Math.round(pct * 100)}% complete</Text>
                </View>
                {pct === 1 && (
                  <Animated.View entering={ZoomIn.duration(400)}>
                    <Text style={{ fontSize: 28 }}>⚡</Text>
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>

          <View style={{ paddingHorizontal: Spacing[5], paddingTop: Spacing[2] }}>
            {total === 0 && !isLoading ? (
              <Animated.View
                entering={FadeInDown.delay(200).duration(400)}
                style={[Cards.base, Layout.center, { paddingVertical: Spacing[12], gap: Spacing[3] }]}
              >
                <Text style={{ fontSize: 42 }}>🌱</Text>
                <Text style={T.h3}>No habits yet</Text>
                <Text style={[T.caption, { textAlign: 'center' }]}>
                  Tap the + button to create your first habit and start building momentum.
                </Text>
                <TouchableOpacity
                  onPress={() => formRef.current?.openCreate(selectedDate)}
                  style={[Buttons.primary, { marginTop: Spacing[2], backgroundColor: ac.accent }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={[T.bodyMedium, { color: '#fff' }]}>Create First Habit</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <>
                {/* Categorized habits */}
                {nonEmptyCategories.map((category, i) => (
                  <Animated.View key={category.id} entering={FadeInDown.delay(i * 80).duration(350)}>
                    <CategorySection category={category} onLongPressHabit={handleLongPress} />
                  </Animated.View>
                ))}

                {/* Uncategorized habits */}
                {uncategorizedHabits.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(nonEmptyCategories.length * 80).duration(350)}>
                    {nonEmptyCategories.length > 0 && (
                      <Text style={[T.label, { marginBottom: Spacing[3] }]}>Other Habits</Text>
                    )}
                    {uncategorizedHabits.map((habit) => (
                      <HabitCard key={habit.id} habit={habit} onLongPress={handleLongPress} />
                    ))}
                  </Animated.View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      {/* ── Sheets ── */}
      <HabitForm ref={formRef} />
      <BottomSheet ref={moodSheetRef} title="Daily Mood">
        <MoodLogger sheetRef={moodSheetRef as React.RefObject<BottomSheetRef>} selectedDate={selectedDate} />
      </BottomSheet>
      <BottomSheet ref={contextSheetRef} title="Habit Options">
        <HabitContextMenu
          habit={contextHabit}
          sheetRef={contextSheetRef as React.RefObject<BottomSheetRef>}
          onClose={() => contextSheetRef.current?.close()}
          formRef={formRef as React.RefObject<HabitFormRef>}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
