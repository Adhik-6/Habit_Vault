import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { HabitWithLog } from '@src/types';
import { useHabitStore } from '@store/useHabitStore';
import { Colors, Spacing, Radius, Shadows } from '@design/tokens';
import { Cards, Text as T, Buttons } from '@design/components';

const SWIPE_THRESHOLD = 80;

interface HabitCardProps {
  habit: HabitWithLog;
  onLongPress?: (habit: HabitWithLog) => void;
}

export function HabitCard({ habit, onLongPress }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDurationInput, setShowDurationInput] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('');

  const toggleHabit = useHabitStore((s) => s.toggleHabit);
  const logQuantityHabit = useHabitStore((s) => s.logQuantityHabit);
  const logDurationHabit = useHabitStore((s) => s.logDurationHabit);
  const toggleCompositeStepAction = useHabitStore((s) => s.toggleCompositeStep);

  const translateX = useSharedValue(0);
  const checkScale = useSharedValue(1);

  const handleToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkScale.value = withSpring(1.35, { damping: 8 }, () => {
      checkScale.value = withSpring(1, { damping: 12 });
    });
    await toggleHabit(habit.id);
  }, [habit.id, toggleHabit]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (habit.type === 'boolean' && e.translationX > 0) {
        translateX.value = Math.min(100, e.translationX);
      }
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && habit.type === 'boolean') {
        runOnJS(handleToggle)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const swipeHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.6, 1], 'clamp') }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleQuantityChange = async (delta: number) => {
    const current = habit.todayLog?.value ?? 0;
    const newVal = Math.max(0, current + delta);
    Haptics.selectionAsync();
    await logQuantityHabit(habit.id, newVal);
  };

  const handleCompositeStep = async (stepId: string) => {
    Haptics.selectionAsync();
    await toggleCompositeStepAction(habit.id, stepId);
  };

  const handleDurationSubmit = async () => {
    Keyboard.dismiss();
    const mins = parseInt(durationMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logDurationHabit(habit.id, mins * 60);
    }
    setShowDurationInput(false);
    setDurationMinutes('');
  };

  const bgColor = habit.isCompleted ? Colors.accentMuted : Colors.surface;
  const borderColor = habit.isCompleted ? Colors.accentDim : Colors.border;

  // Quantity/duration progress pct
  const quantityPct = habit.targetValue > 0
    ? Math.min(1, (habit.todayLog?.value ?? 0) / habit.targetValue) : 0;
  const durationPct = habit.targetValue > 0
    ? Math.min(1, (habit.todayLog?.durationSeconds ?? 0) / (habit.targetValue * 60)) : 0;

  return (
    <View style={{ position: 'relative', marginBottom: Spacing[3] }}>
      {/* Swipe-right glow hint */}
      <Animated.View
        style={[{
          position: 'absolute', left: Spacing[3], top: 0, bottom: 0,
          justifyContent: 'center', zIndex: 0,
        }, swipeHintStyle]}
      >
        <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[Cards.compact, { backgroundColor: bgColor, borderColor }, cardStyle]}>

          {/* ── Main row ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>

            {/* Boolean toggle circle */}
            {habit.type === 'boolean' && (
              <TouchableOpacity onPress={handleToggle} hitSlop={10}>
                <Animated.View style={[{
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: habit.isCompleted ? Colors.accent : Colors.surfaceElevated,
                  borderWidth: 2,
                  borderColor: habit.isCompleted ? Colors.accent : Colors.border,
                  alignItems: 'center', justifyContent: 'center',
                },
                habit.isCompleted ? Shadows.glow : {},
                checkStyle,
                ]}>
                  {habit.isCompleted && <Ionicons name="checkmark" size={15} color="#fff" />}
                </Animated.View>
              </TouchableOpacity>
            )}

            {/* Habit info */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => habit.type === 'composite' && setExpanded((v) => !v)}
              onLongPress={() => onLongPress?.(habit)}
              activeOpacity={habit.type === 'composite' ? 0.7 : 1}
            >
              <Text
                style={[T.bodyMedium, {
                  color: habit.isCompleted ? Colors.textMuted : Colors.text,
                  textDecorationLine: (habit.isCompleted && habit.type === 'boolean') ? 'line-through' : 'none',
                }]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: 2 }}>
                {habit.streak.current > 0 && (
                  <Text style={T.caption}>🔥 {habit.streak.current}d</Text>
                )}
                {(habit.type === 'quantity' || habit.type === 'duration') && (
                  <Text style={T.caption}>
                    {habit.todayLog?.value ?? 0}{habit.unit ? ` ${habit.unit}` : ''}
                    {' / '}{habit.targetValue}{habit.unit ? ` ${habit.unit}` : ''}
                  </Text>
                )}
                {habit.type === 'composite' && (
                  <Text style={T.caption}>
                    {Object.values(habit.todayLog?.compositeProgress ?? {}).filter(Boolean).length}
                    /{habit.compositeSteps.length} steps
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Quantity stepper */}
            {habit.type === 'quantity' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(-1)}
                  style={[Buttons.icon, { width: 30, height: 30, borderRadius: 8 }]}
                >
                  <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[T.bodyMedium, { minWidth: 26, textAlign: 'center' }]}>
                  {habit.todayLog?.value ?? 0}
                </Text>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(1)}
                  style={[Buttons.icon, { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.accentMuted, borderColor: Colors.accentDim }]}
                >
                  <Ionicons name="add" size={14} color={Colors.accentGlow} />
                </TouchableOpacity>
              </View>
            )}

            {/* Duration timer button */}
            {habit.type === 'duration' && (
              <TouchableOpacity
                style={[Buttons.icon, { backgroundColor: Colors.accentMuted, borderColor: Colors.accentDim }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDurationInput((v) => !v);
                }}
              >
                <Ionicons
                  name={habit.isCompleted ? 'checkmark-circle' : 'timer-outline'}
                  size={18}
                  color={habit.isCompleted ? Colors.success : Colors.accentGlow}
                />
              </TouchableOpacity>
            )}

            {/* Composite expand */}
            {habit.type === 'composite' && (
              <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18} color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}

            {/* Strength score */}
            <View style={{ paddingHorizontal: 5, paddingVertical: 2, backgroundColor: Colors.surfaceElevated, borderRadius: 5 }}>
              <Text style={[T.xs, { color: Colors.textDim }]}>{habit.strengthScore}</Text>
            </View>
          </View>

          {/* ── Progress bar (quantity / duration) ── */}
          {(habit.type === 'quantity' || habit.type === 'duration') && (
            <View style={{ marginTop: Spacing[2], backgroundColor: Colors.border, height: 4, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{
                width: `${(habit.type === 'quantity' ? quantityPct : durationPct) * 100}%`,
                height: 4,
                backgroundColor: habit.isCompleted ? Colors.success : Colors.accent,
                borderRadius: 2,
              }} />
            </View>
          )}

          {/* ── Duration Input ── */}
          {habit.type === 'duration' && showDurationInput && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing[3], gap: Spacing[2] }}>
              <TextInput
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="Minutes completed..."
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                style={{ flex: 1, backgroundColor: Colors.surface, color: Colors.text, padding: Spacing[2], borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border }}
                autoFocus
              />
              <TouchableOpacity onPress={handleDurationSubmit} style={{ backgroundColor: Colors.accent, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.sm }}>
                <Text style={[T.sm, { color: '#fff' }]}>Log</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Composite steps ── */}
          {habit.type === 'composite' && expanded && (
            <View style={{ marginTop: Spacing[3], gap: Spacing[2] }}>
              {habit.compositeSteps.map((step) => {
                const done = habit.todayLog?.compositeProgress[step.id] ?? false;
                return (
                  <TouchableOpacity
                    key={step.id}
                    onPress={() => handleCompositeStep(step.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingVertical: 2 }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4,
                      backgroundColor: done ? Colors.accent : Colors.surfaceElevated,
                      borderWidth: 1.5, borderColor: done ? Colors.accent : Colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                    <Text style={[T.sm, {
                      flex: 1,
                      color: done ? Colors.textMuted : Colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }]}>
                      {step.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
