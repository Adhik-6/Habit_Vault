import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHabitsForSelectedDate, useStacksWithHabits, useUnstackedHabits } from '@/hooks/use-habits-for-date';
import { archiveHabit, deleteHabit } from '@services/habitService';
import type { Habit, HabitWithLog, StackWithHabits } from '@src/types';
import { useHabitStore } from '@store/useHabitStore';
import { useMoodStore } from '@store/useMoodStore';

import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { ProgressRing } from '@src/components/common/ProgressRing';
import { HabitCard } from '@src/components/habits/HabitCard';
import { HabitForm, type HabitFormRef } from '@src/components/habits/HabitForm';

import { Buttons, Cards, Layout, Text as T } from '@design/components';
import { Colors, moodColor, Radius, Spacing } from '@design/tokens';
import { scoreToEmoji as moodEmoji } from '@services/moodService';
import {
  formatDisplayDate,
  getDayOfWeek,
  getLastNDays,
  getRelativeLabel,
  getShortDayName,
  todayString,
} from '@src/utils/dateUtils';

// ── Date Strip ────────────────────────────────────────────────────────────────
function DateStrip() {
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const setSelectedDate = useHabitStore((s) => s.setSelectedDate);
  const last7 = getLastNDays(7);

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing[2], paddingHorizontal: Spacing[5], paddingVertical: Spacing[2] }}
    >
      {last7.map((date) => {
        const isSelected = date === selectedDate;
        const isToday = date === todayString();
        const dow = getDayOfWeek(date);
        const dayNum = date.split('-')[2];

        return (
          <TouchableOpacity
            key={date}
            onPress={() => { Haptics.selectionAsync(); setSelectedDate(date); }}
            style={{
              width: 44, alignItems: 'center', paddingVertical: Spacing[2],
              borderRadius: Radius.lg,
              backgroundColor: isSelected ? Colors.accent : 'transparent',
              borderWidth: isSelected ? 0 : 1,
              borderColor: isToday && !isSelected ? Colors.accentDim : Colors.border,
            }}
          >
            <Text style={[T.xs, { color: isSelected ? '#fff' : Colors.textMuted }]}>
              {getShortDayName(dow).charAt(0)}
            </Text>
            <Text style={[T.smMedium, {
              color: isSelected ? '#fff' : isToday ? Colors.accentGlow : Colors.text,
              marginTop: 2,
            }]}>
              {parseInt(dayNum, 10)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Stack Section ─────────────────────────────────────────────────────────────
function StackSection({ stack, onLongPressHabit }: {
  stack: StackWithHabits;
  onLongPressHabit: (h: HabitWithLog) => void;
}) {
  const pct = stack.totalCount > 0 ? stack.completedCount / stack.totalCount : 0;

  return (
    <View style={{ marginBottom: Spacing[5] }}>
      {/* Stack header */}
      <View style={[Layout.spaceBetween, { marginBottom: Spacing[3] }]}>
        <View style={Layout.row}>
          <View style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: stack.color, marginRight: Spacing[2],
          }} />
          <Text style={T.h3}>{stack.name}</Text>
        </View>
        <View style={Layout.row}>
          <Text style={[T.caption, { marginRight: Spacing[2] }]}>
            {stack.completedCount}/{stack.totalCount}
          </Text>
          <Text style={[T.xs, {
            color: pct === 1 ? Colors.success : Colors.textMuted,
          }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
      </View>

      {/* Habits */}
      {stack.habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onLongPress={onLongPressHabit} />
      ))}

      {/* Stack complete banner */}
      {pct === 1 && stack.totalCount > 0 && (
        <Animated.View entering={ZoomIn.duration(300)} style={[Cards.accentBorder, { alignItems: 'center', paddingVertical: Spacing[3], flexDirection: 'row', justifyContent: 'center', gap: Spacing[2] }]}>
          <Text style={{ fontSize: 20 }}>🎉</Text>
          <Text style={[T.bodyMedium, { color: Colors.accentGlow }]}>{stack.name} complete!</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Mood Logger ───────────────────────────────────────────────────────────────
const MOOD_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function MoodLogger({ sheetRef }: { sheetRef: React.RefObject<BottomSheetRef> }) {
  const logMood = useMoodStore((s) => s.logMood);
  const todayMood = useMoodStore((s) => s.todayMood);

  const handleMood = async (score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logMood({ score });
    sheetRef.current?.close();
  };

  return (
    <View style={{ gap: Spacing[4], paddingBottom: Spacing[8] }}>
      <Text style={[T.body, { color: Colors.textSecondary, textAlign: 'center' }]}>
        How are you feeling today?
      </Text>
      {todayMood && (
        <View style={[Cards.compact, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 28 }}>{moodEmoji(todayMood.score)}</Text>
          <Text style={[T.caption, { marginTop: Spacing[1] }]}>
            Current mood: {todayMood.score}/10
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
              borderColor: todayMood?.score === score ? moodColor(score) : Colors.border,
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
function HabitContextMenu({ habit, sheetRef, onClose }: {
  habit: HabitWithLog | null;
  sheetRef: React.RefObject<BottomSheetRef>;
  onClose: () => void;
}) {
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const formRef = useRef<HabitFormRef>(null);

  if (!habit) return null;

  const handleEdit = () => {
    sheetRef.current?.close();
    setTimeout(() => formRef.current?.openEdit(habit as unknown as Habit), 300);
  };

  const handleArchive = async () => {
    sheetRef.current?.close();
    await archiveHabit(habit.id);
    await loadHabits();
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
          { icon: 'create-outline', label: 'Edit Habit', action: handleEdit, color: Colors.accent },
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
      <HabitForm ref={formRef} onSaved={onClose} />
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
  const stacksWithHabits = useStacksWithHabits();
  const unstackedHabits = useUnstackedHabits();
  const todayMood = useMoodStore((s) => s.todayMood);

  const completed = habitsForDate.filter((h) => h.isCompleted).length;
  const total = habitsForDate.length;
  const pct = total > 0 ? completed / total : 0;

  const handleLongPress = useCallback((habit: HabitWithLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setContextHabit(habit);
    contextSheetRef.current?.open();
  }, []);

  const nonEmptyStacks = stacksWithHabits.filter((s) => s.habits.length > 0);

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      {/* ── Fixed header ── */}
      <Animated.View entering={FadeIn.duration(350)}>
        <View style={[Layout.spaceBetween, { paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[2] }]}>
          <View>
            <Text style={T.label}>{getRelativeLabel(selectedDate)}</Text>
            <Text style={T.h1}>
              {selectedDate === todayString() ? 'Today' : formatDisplayDate(selectedDate)}
            </Text>
          </View>
          <View style={Layout.row}>
            {/* Mood button */}
            <TouchableOpacity
              onPress={() => moodSheetRef.current?.open()}
              style={[Buttons.icon, { marginRight: Spacing[2], backgroundColor: todayMood ? Colors.accentMuted : Colors.surfaceElevated, borderColor: todayMood ? Colors.accentDim : Colors.border }]}
            >
              <Text style={{ fontSize: 18 }}>
                {todayMood ? moodEmoji(todayMood.score) : '😐'}
              </Text>
            </TouchableOpacity>
            {/* Add habit */}
            <TouchableOpacity
              onPress={() => formRef.current?.openCreate()}
              style={[Buttons.icon, { backgroundColor: Colors.accentMuted, borderColor: Colors.accentDim }]}
            >
              <Ionicons name="add" size={22} color={Colors.accentGlow} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date strip */}
        <DateStrip />

        {/* Progress summary */}
        {total > 0 && (
          <View style={[Cards.base, { margin: Spacing[5], marginTop: Spacing[2], flexDirection: 'row', alignItems: 'center', gap: Spacing[4] }]}>
            <ProgressRing progress={pct} size={60} strokeWidth={5} color={pct === 1 ? Colors.success : Colors.accent} />
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

      {/* ── Scrollable habit list ── */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing[5], paddingBottom: Spacing[24], paddingTop: Spacing[5] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              onPress={() => formRef.current?.openCreate()}
              style={[Buttons.primary, { marginTop: Spacing[2] }]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={[T.bodyMedium, { color: '#fff' }]}>Create First Habit</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* Stacked habits */}
            {nonEmptyStacks.map((stack, i) => (
              <Animated.View key={stack.id} entering={FadeInDown.delay(i * 80).duration(350)}>
                <StackSection stack={stack} onLongPressHabit={handleLongPress} />
              </Animated.View>
            ))}

            {/* Unstacked habits */}
            {unstackedHabits.length > 0 && (
              <Animated.View entering={FadeInDown.delay(nonEmptyStacks.length * 80).duration(350)}>
                {nonEmptyStacks.length > 0 && (
                  <Text style={[T.label, { marginBottom: Spacing[3] }]}>Other Habits</Text>
                )}
                {unstackedHabits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} onLongPress={handleLongPress} />
                ))}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Floating action button ── */}
      <Animated.View entering={FadeIn.delay(400).duration(300)} style={Buttons.fab}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); formRef.current?.openCreate(); }}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Sheets ── */}
      <HabitForm ref={formRef} />
      <BottomSheet ref={moodSheetRef} title="Daily Mood">
        <MoodLogger sheetRef={moodSheetRef as React.RefObject<BottomSheetRef>} />
      </BottomSheet>
      <BottomSheet ref={contextSheetRef} title="Habit Options">
        <HabitContextMenu
          habit={contextHabit}
          sheetRef={contextSheetRef as React.RefObject<BottomSheetRef>}
          onClose={() => contextSheetRef.current?.close()}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
