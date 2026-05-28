import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate, runOnJS, withTiming, interpolateColor
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { HabitWithLog } from '@src/types';
import { useHabitStore } from '@store/useHabitStore';
import { Colors, Spacing, Radius, Shadows } from '@design/tokens';
import { Cards, Text as T, Buttons } from '@design/components';
import { useHabitColor } from '@/hooks/use-habit-color';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { todayString } from '@src/utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';

const SWIPE_THRESHOLD = 80;

interface HabitCardProps {
  habit: HabitWithLog;
  onLongPress?: (habit: HabitWithLog) => void;
  onLogReason?: (habitId: string) => void;
}

export function HabitCard({ habit, onLongPress, onLogReason }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [inputVal, setInputVal] = useState(String(habit.todayLog?.value ?? 0));

  React.useEffect(() => {
    if (!isFocused) {
      setInputVal(String(habit.todayLog?.value ?? 0));
    }
  }, [habit.todayLog?.value, isFocused]);

  const toggleHabit = useHabitStore((s) => s.toggleHabit);
  const logQuantityHabit = useHabitStore((s) => s.logQuantityHabit);
  const toggleCompositeStepAction = useHabitStore((s) => s.toggleCompositeStep);
  const logCounterHabit = useHabitStore((s) => s.logCounterHabit);
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const ac = useAccentColors();

  const habitColor = useHabitColor(habit.categoryId);
  const isBad = habit.isBadHabit;
  // For bad habits: use red tones when triggered (occurrence logged)
  const effectiveColor = isBad && habit.isCompleted ? Colors.danger : habitColor;
  const accentMuted = effectiveColor + '1A';
  const accentDim = effectiveColor + '33';
  const accentGlow = effectiveColor;

  const translateX = useSharedValue(0);
  const checkScale = useSharedValue(1);
  const flashScale = useSharedValue(0);

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
      // Only boolean supports swipe-right-to-complete
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

  const inputFlashStyle = useAnimatedStyle(() => ({
    borderColor: flashScale.value > 0 ? interpolateColor(flashScale.value, [0, 1], ['transparent', Colors.danger]) : 'transparent',
    borderWidth: flashScale.value > 0 ? 1 : 0,
    borderRadius: Radius.sm,
  }));

  const handleQuantityChange = async (delta: number) => {
    const current = habit.todayLog?.value ?? 0;
    const newVal = Math.max(0, current + delta);
    Haptics.selectionAsync();
    await logQuantityHabit(habit.id, newVal);
  };

  const handleCounterChange = async (delta: number) => {
    Haptics.selectionAsync();
    await logCounterHabit(habit.id, delta);
  };

  const handleCompositeStep = async (stepId: string) => {
    Haptics.selectionAsync();
    await toggleCompositeStepAction(habit.id, stepId);
  };

  const handleQuantitySubmit = async () => {
    Keyboard.dismiss();
    const val = parseFloat(inputVal);
    if (isNaN(val) || val < 0 || inputVal.trim() === '') {
      // Invalid input -> revert & flash
      setInputVal(String(habit.todayLog?.value ?? 0));
      flashScale.value = withTiming(1, { duration: 150 }, () => {
        flashScale.value = withTiming(0, { duration: 150 });
      });
    } else {
      Haptics.selectionAsync();
      await logQuantityHabit(habit.id, val);
    }
  };

  const bgColor = habit.isCompleted
    ? (isBad ? Colors.danger + '1A' : accentMuted)
    : Colors.surface;
  const borderColor = habit.isCompleted
    ? (isBad ? Colors.danger + '33' : accentDim)
    : Colors.border;

  // Quantity progress pct
  const quantityPct = habit.targetValue > 0
    ? Math.min(1, (habit.todayLog?.value ?? 0) / habit.targetValue) : 0;

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
                  backgroundColor: habit.isCompleted ? habitColor : Colors.surfaceElevated,
                  borderWidth: 2,
                  borderColor: habit.isCompleted ? habitColor : Colors.border,
                  alignItems: 'center', justifyContent: 'center',
                },
                habit.isCompleted ? { shadowColor: habitColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 } : {},
                checkStyle,
                ]}>
                  {habit.isCompleted && (
                    <Ionicons
                      name={isBad ? 'alert' : 'checkmark'}
                      size={15}
                      color="#fff"
                    />
                  )}
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
                  <Text style={T.caption}>
                    {isBad ? '🛡️' : '🔥'} {habit.streak.current}d{isBad ? ' clean' : ''}
                  </Text>
                )}
                {habit.type === 'quantity' && (
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
                {habit.type === 'counter' && (
                  <Text style={T.caption}>
                    {habit.todayLog?.value ?? 0} today
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Quantity input */}
            {habit.type === 'quantity' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Animated.View style={[{ minWidth: 60 }, inputFlashStyle]}>
                  <TextInput
                    style={[T.bodyMedium, { textAlign: 'center', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 8, borderWidth: 1, borderColor: habitColor, color: habitColor }]}
                    value={inputVal}
                    onChangeText={setInputVal}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      setIsFocused(false);
                      handleQuantitySubmit();
                    }}
                    onSubmitEditing={handleQuantitySubmit}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </Animated.View>
              </View>
            )}

            {/* Counter stepper — no target, just accumulates */}
            {habit.type === 'counter' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <TouchableOpacity
                  onPress={() => handleCounterChange(-1)}
                  style={[Buttons.icon, { width: 30, height: 30, borderRadius: 8 }]}
                >
                  <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[T.bodyMedium, { minWidth: 30, textAlign: 'center', color: habitColor }]}>
                  {habit.todayLog?.value ?? 0}
                </Text>
                <TouchableOpacity
                  onPress={() => handleCounterChange(1)}
                  style={[Buttons.icon, { width: 30, height: 30, borderRadius: 8, backgroundColor: accentMuted, borderColor: accentDim }]}
                >
                  <Ionicons name="add" size={14} color={accentGlow} />
                </TouchableOpacity>
              </View>
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

            {/* Failure reason button */}
            {selectedDate < todayString() && (isBad ? habit.isCompleted : !habit.isCompleted) && onLogReason && (
              <TouchableOpacity
                onPress={() => onLogReason(habit.id)}
                style={isBad ? {} : [Buttons.icon, { 
                  width: 28, height: 28, borderRadius: 14, 
                  backgroundColor: habit.todayLog?.failureReason ? ac.accent : 'transparent', 
                  borderWidth: 1, borderColor: ac.accent 
                }]}
              >
                {isBad ? (
                  <LinearGradient
                    colors={['#000000', Colors.danger]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ width: 28, height: 28, borderRadius: 14, padding: habit.todayLog?.failureReason ? 0 : 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {habit.todayLog?.failureReason ? (
                      <Ionicons name="help" size={16} color="#fff" />
                    ) : (
                      <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 13, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="help" size={16} color={Colors.danger} />
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <Ionicons 
                    name="help" 
                    size={16} 
                    color={habit.todayLog?.failureReason ? "#fff" : ac.accent} 
                  />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Progress bar (quantity) ── */}
          {habit.type === 'quantity' && (
            <View style={{ marginTop: Spacing[2], backgroundColor: Colors.border, height: 4, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{
                width: `${quantityPct * 100}%`,
                height: 4,
                backgroundColor: habit.isCompleted ? Colors.success : habitColor,
                borderRadius: 2,
              }} />
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
                      backgroundColor: done ? habitColor : Colors.surfaceElevated,
                      borderWidth: 1.5, borderColor: done ? habitColor : Colors.border,
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
