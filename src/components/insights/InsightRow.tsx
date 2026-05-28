import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Text as T } from '@design/components';
import { useAccentColors } from '@/hooks/use-accent-colors';
import type { HabitInsight } from '@src/types';

interface InsightRowProps {
  insight: HabitInsight;
  isLast?: boolean;
}

export function InsightRow({ insight, isLast = false }: InsightRowProps) {
  const ac = useAccentColors();

  const { icon, color } = ({
    improving: { icon: 'trending-up', color: Colors.success },
    declining: { icon: 'trending-down', color: Colors.danger },
    streak_risk: { icon: 'flame-outline', color: Colors.warning },
    worst_day: { icon: 'warning-outline', color: Colors.warning },
    pattern: { icon: 'repeat-outline', color: Colors.info },
    best_time: { icon: 'time-outline', color: ac.accent },
  } as Record<string, { icon: string; color: string }>)[insight.type] ?? { icon: 'bulb-outline', color: ac.accent };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing[3],
        paddingVertical: Spacing[2],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: Colors.border,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: Radius.md,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <Text style={[T.sm, { flex: 1, color: Colors.text, lineHeight: 20 }]}>
        {insight.message}
      </Text>
    </View>
  );
}
