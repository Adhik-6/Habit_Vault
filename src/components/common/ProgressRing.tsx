import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, withTiming, useSharedValue } from 'react-native-reanimated';
import { Colors } from '@design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0-1
  color?: string;
  trackColor?: string;
  isBadHabitGradient?: boolean;
}

export function ProgressRing({
  size = 64,
  strokeWidth = 5,
  progress,
  color = Colors.accent,
  trackColor = Colors.border,
  isBadHabitGradient = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const animatedProgress = useSharedValue(0);

  // Animate to new progress value whenever prop changes
  React.useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 600 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {isBadHabitGradient && (
          <Defs>
            <LinearGradient id="badGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1A1A1A" stopOpacity="1" />
              <Stop offset="1" stopColor={Colors.danger} stopOpacity="1" />
            </LinearGradient>
          </Defs>
        )}
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <AnimatedCircle
          cx={cx} cy={cy} r={radius}
          stroke={isBadHabitGradient ? 'url(#badGradient)' : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
