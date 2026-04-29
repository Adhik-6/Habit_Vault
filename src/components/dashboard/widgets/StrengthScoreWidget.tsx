/**
 * StrengthScoreWidget — Animated gauge for the global habit strength score.
 * Also shows top 5 habits ranked by score.
 */
import { Cards, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreGauge({ score }: { score: number }) {
  const SIZE = 120;
  const SW = 10;
  const R = (SIZE - SW) / 2;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  // Semi-circle: from 180° to 0° (bottom to top via top)
  const circumference = Math.PI * R; // half circumference for semi
  const fullCircumference = 2 * Math.PI * R;

  const animatedScore = useSharedValue(0);
  React.useEffect(() => {
    animatedScore.value = withTiming(score / 100, { duration: 1000 });
  }, [score]);

  const animatedProps = useAnimatedProps(() => {
    const offset = fullCircumference * (1 - (animatedScore.value * 0.5));
    return { strokeDashoffset: offset };
  });

  // Color based on score
  const scoreColor =
    score >= 75 ? Colors.success :
      score >= 50 ? Colors.accent :
        score >= 25 ? Colors.warning : Colors.danger;

  return (
    <Svg width={SIZE} height={SIZE / 2 + 16} style={{ overflow: 'visible' }}>
      {/* Track semi-circle */}
      <Circle
        cx={CX} cy={CY} r={R}
        stroke={Colors.border} strokeWidth={SW}
        fill="none"
        strokeDasharray={`${circumference} ${fullCircumference}`}
        strokeDashoffset={fullCircumference * 0.5}
        strokeLinecap="round"
        transform={`rotate(180 ${CX} ${CY})`}
      />
      {/* Animated fill */}
      <AnimatedCircle
        cx={CX} cy={CY} r={R}
        stroke={scoreColor} strokeWidth={SW}
        fill="none"
        strokeDasharray={`${fullCircumference} ${fullCircumference}`}
        animatedProps={animatedProps}
        strokeLinecap="round"
        transform={`rotate(180 ${CX} ${CY})`}
      />
    </Svg>
  );
}

export function StrengthScoreWidget() {
  const globalScore = useAnalyticsStore((s) => s.globalScore);
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const habits = useHabitStore((s) => s.habits);

  const top5 = [...strengthScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const habitMap = new Map(habits.map((h) => [h.id, h]));

  const scoreLabel =
    globalScore >= 80 ? 'Elite' :
      globalScore >= 60 ? 'Strong' :
        globalScore >= 40 ? 'Growing' :
          globalScore >= 20 ? 'Starting' : 'New';

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <Text style={[T.label, { marginBottom: Spacing[3] }]}>Habit Strength</Text>

      {/* Gauge + score */}
      <View style={{ alignItems: 'center', marginBottom: Spacing[3] }}>
        <View style={{ position: 'relative', alignItems: 'center' }}>
          <ScoreGauge score={globalScore} />
          <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>
            <Text style={T.score}>{globalScore}</Text>
            <Text style={[T.caption, { marginTop: -4 }]}>{scoreLabel}</Text>
          </View>
        </View>
      </View>

      {/* Top habits */}
      {top5.length > 0 && (
        <View style={{ gap: Spacing[2] }}>
          <Text style={[T.label, { marginBottom: Spacing[1] }]}>Top Habits</Text>
          {top5.map((s, i) => {
            const habit = habitMap.get(s.habitId);
            if (!habit) return null;
            const pct = s.score / 100;
            return (
              <View key={s.habitId} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Text style={[T.xs, { color: Colors.textDim, minWidth: 20 }]} numberOfLines={1}>#{i + 1}</Text>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: habit.color ?? Colors.accent,
                }} />
                <Text style={[T.sm, { flex: 1 }]} numberOfLines={1}>{habit.name}</Text>
                {/* Mini bar */}
                <View style={{ width: 60, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{
                    width: `${pct * 100}%`,
                    height: 4,
                    backgroundColor: habit.color ?? Colors.accent,
                    borderRadius: 2,
                  }} />
                </View>
                <Text style={[T.xs, { color: Colors.textMuted, width: 24, textAlign: 'right' }]}>
                  {s.score}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
