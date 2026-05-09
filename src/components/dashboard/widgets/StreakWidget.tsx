/**
 * StreakWidget — Current + longest streak with milestone glow animation.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Colors, Spacing, Shadows } from '@design/tokens';
import { Cards, Text as T } from '@design/components';

const MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365];

function getMilestone(streak: number): { next: number; label: string } | null {
  const next = MILESTONES.find((m) => m > streak);
  if (!next) return { next: 365, label: '🏆 Legendary' };
  return { next, label: `🎯 ${next}-day goal` };
}

interface StreakWidgetProps {
  habitId?: string; // undefined = highest global streak
}

export function StreakWidget({ habitId }: StreakWidgetProps) {
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const habits = useHabitStore((s) => s.habits);
  const ac = useAccentColors();

  // Find the best streak (or habit-specific)
  let current = 0;
  let longest = 0;
  let habitName = 'Best Habit';

  if (habitId) {
    const scoreObj = strengthScores.find(s => s.habitId === habitId);
    const habit = habits.find((h) => h.id === habitId);
    current = scoreObj?.streak?.current ?? 0;
    longest = scoreObj?.streak?.longest ?? 0;
    habitName = habit?.name ?? '';
  } else {
    // Find habit with highest current streak
    for (const score of strengthScores) {
      if (score.streak.current > current) {
        current = score.streak.current;
        longest = score.streak.longest;
        const h = habits.find((h) => h.id === score.habitId);
        habitName = h?.name ?? '';
      }
    }
  }

  const milestone = getMilestone(current);
  const pctToMilestone = milestone ? Math.min(1, current / milestone.next) : 1;
  const isOnFire = current >= 7;

  // Pulse glow for milestone streaks
  const glowOpacity = useSharedValue(0.4);
  React.useEffect(() => {
    if (isOnFire) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [isOnFire]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={T.label}>Current Streak</Text>
          <Text style={T.caption} numberOfLines={1}>{habitName}</Text>
        </View>

        {/* Flame icon with pulse */}
        <View style={{ alignItems: 'center' }}>
          {isOnFire && (
            <Animated.View
              style={[{
                position: 'absolute', width: 52, height: 52, borderRadius: 26,
                backgroundColor: Colors.warning,
              }, glowStyle]}
            />
          )}
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: isOnFire ? Colors.warningDim : Colors.surfaceElevated,
            borderWidth: 1.5,
            borderColor: isOnFire ? Colors.warning : Colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>{isOnFire ? '🔥' : '💤'}</Text>
          </View>
        </View>
      </View>

      {/* Streak number */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[3], marginVertical: Spacing[3] }}>
        <Text style={[T.score, { color: isOnFire ? Colors.warning : Colors.text }]}>
          {current}
        </Text>
        <Text style={[T.body, { color: Colors.textMuted, paddingBottom: 4 }]}>days</Text>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={T.label}>Longest</Text>
          <Text style={T.scoreSm}>{longest}</Text>
        </View>
      </View>

      {/* Progress to next milestone */}
      {milestone && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[1] }}>
            <Text style={[T.caption, { color: Colors.textMuted }]}>{milestone.label}</Text>
            <Text style={[T.caption, { color: Colors.textMuted }]}>
              {milestone.next - current} days to go
            </Text>
          </View>
          <View style={{ backgroundColor: Colors.border, height: 5, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{
              width: `${pctToMilestone * 100}%`,
              height: 5,
              backgroundColor: isOnFire ? Colors.warning : ac.accent,
              borderRadius: 3,
            }} />
          </View>
        </View>
      )}
    </Animated.View>
  );
}
