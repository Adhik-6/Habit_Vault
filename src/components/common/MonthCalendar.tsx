import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cards, Layout, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { getMonthDates, getMonthName, getDayOfWeek, todayString } from '@src/utils/dateUtils';
import { useHabitStore } from '@store/useHabitStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { getLogsForDateRange } from '@services/logService';
import { filterHabitsForDate } from '@services/habitService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import type { HabitLog } from '@src/types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function CyclingDot({ colors }: { colors: string[] }) {
  const [idx, setIdx] = React.useState(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (colors.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % colors.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [colors.length]);

  React.useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.2, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    );
  }, [idx]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const c = colors[idx];
  return (
    <Animated.View style={[{ width: 4, height: 4, borderRadius: 2, overflow: 'hidden' }, animatedStyle]}>
      {c === 'BAD_HABIT' ? (
        <LinearGradient
          colors={['#000000', Colors.danger]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 4, height: 4, borderRadius: 2 }}
        />
      ) : (
        <View style={{ flex: 1, borderRadius: 2, backgroundColor: c }} />
      )}
    </Animated.View>
  );
}

export function MonthCalendar() {
  const today = todayString();
  const [viewDate, setViewDate] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(true);
  const ac = useAccentColors();
  
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const setSelectedDate = useHabitStore((s) => s.setSelectedDate);
  const todayLogsMap = useHabitStore((s) => s.todayLogsMap);
  const habits = useHabitStore((s) => s.habits);
  const categories = useHabitStore((s) => s.categories);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthDates = getMonthDates(year, month);
  const firstDayOffset = getDayOfWeek(monthDates[0]);

  function prevMonth() {
    if (isCollapsed) {
      setSelectedDate(new Date(new Date(selectedDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    } else {
      setViewDate(new Date(year, month - 1, 1));
    }
  }
  // Week view dates: based on selectedDate
  const weekStart = new Date(selectedDate);
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dow);
  const currentWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const displayedDates = isCollapsed ? currentWeekDates : monthDates;

  const disableNext = isCollapsed && currentWeekDates.includes(today);

  function nextMonth() {
    if (disableNext) return;
    if (isCollapsed) {
      const nextDate = new Date(new Date(selectedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setSelectedDate(nextDate > today ? today : nextDate);
    } else {
      setViewDate(new Date(year, month + 1, 1));
    }
  }

  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([]);

  React.useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      const from = displayedDates[0];
      const to = displayedDates[displayedDates.length - 1];
      if (from && to) {
        const logs = await getLogsForDateRange(from, to);
        if (active) setMonthLogs(logs);
      }
    };
    fetchLogs();
    return () => { active = false; };
  }, [displayedDates, todayLogsMap]);

  // Precompute category colors for habits
  const habitCategoryColors = React.useMemo(() => {
    const map = new Map<string, string>();
    habits.forEach(h => {
      if (h.isBadHabit) {
        map.set(h.id, 'BAD_HABIT');
      } else if (h.categoryId) {
        const c = categories.find(cat => cat.id === h.categoryId);
        if (c) map.set(h.id, c.color);
        else map.set(h.id, h.color);
      } else {
        map.set(h.id, h.color);
      }
    });
    return map;
  }, [habits, categories]);

  // Merge monthLogs with todayLogsMap to ensure latest today data
  const effectiveLogs = React.useMemo(() => {
    const map = new Map<string, HabitLog>();
    monthLogs.forEach(l => map.set(`${l.habitId}-${l.date}`, l));
    todayLogsMap.forEach(l => map.set(`${l.habitId}-${l.date}`, l));
    return Array.from(map.values());
  }, [monthLogs, todayLogsMap]);

  // Group completed habit colors by date
  const dotsByDate = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    // 1. Add dots for completed good habits
    effectiveLogs.forEach(l => {
      if (l.completedAt) {
        const color = habitCategoryColors.get(l.habitId);
        if (!color || color === 'BAD_HABIT') return; // Ignore bad habit failures

        if (!map.has(l.date)) map.set(l.date, new Set());
        map.get(l.date)!.add(color);
      }
    });

    // 2. Add dot for bad habits ONLY on clean days (successes)
    displayedDates.forEach(date => {
      if (date > today) return; // Cannot have a clean day in the future
      
      const scheduled = filterHabitsForDate(habits, date);
      const badScheduled = scheduled.filter(h => h.isBadHabit);
      
      if (badScheduled.length > 0) {
        // Did the user fail ANY of the scheduled bad habits on this date?
        const failedAny = badScheduled.some(h => {
          const log = effectiveLogs.find(l => l.habitId === h.id && l.date === date);
          return !!log?.completedAt; // completedAt means it was performed (failed)
        });
        
        // If they didn't fail any, they get the BAD_HABIT dot!
        if (!failedAny) {
          if (!map.has(date)) map.set(date, new Set());
          map.get(date)!.add('BAD_HABIT');
        }
      }
    });

    return map;
  }, [effectiveLogs, habitCategoryColors, displayedDates, habits, today]);

  return (
    <View style={[Cards.base, { paddingBottom: Spacing[2], marginBottom: Spacing[4] }]}>
      <View style={[Layout.spaceBetween, { marginBottom: Spacing[4] }]}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: Spacing[2] }}>
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setIsCollapsed(!isCollapsed)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}
        >
          <Text style={T.h3}>
            {isCollapsed ? `${getMonthName(new Date(selectedDate).getMonth())} ${new Date(selectedDate).getFullYear()}` : `${getMonthName(month)} ${year}`}
          </Text>
          <Ionicons name={isCollapsed ? "chevron-down" : "chevron-up"} size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={nextMonth} disabled={disableNext} style={{ padding: Spacing[2], opacity: disableNext ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={{ flexDirection: 'row', marginBottom: Spacing[2] }}>
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[T.xs, { color: Colors.textMuted }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {/* Leading empty cells (only in expanded mode) */}
        {!isCollapsed && Array.from({ length: firstDayOffset }, (_, i) => (
          <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
        ))}

        {/* Day cells */}
        {displayedDates.map((date) => {
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const isFuture = date > today;
          const allDots = Array.from(dotsByDate.get(date) ?? []);

          return (
            <TouchableOpacity
              key={date}
              onPress={() => !isFuture && setSelectedDate(date)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={isFuture ? 1 : 0.7}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: Radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? ac.accent
                    : isToday
                      ? ac.accentMuted
                      : 'transparent',
                  borderWidth: isToday && !isSelected ? 1 : 0,
                  borderColor: ac.accent,
                }}
              >
                <Text
                  style={[
                    T.sm,
                    {
                      color: isSelected
                        ? '#fff'
                        : isFuture
                          ? Colors.textDim
                          : isToday
                            ? ac.accentGlow
                            : Colors.text,
                      fontFamily: isToday || isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    },
                  ]}
                >
                  {parseInt(date.split('-')[2], 10)}
                </Text>
              </View>
              {/* Colored Dots */}
              {allDots.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4, alignItems: 'center' }}>
                  {allDots.slice(0, 2).map((c, i) => (
                    c === 'BAD_HABIT' ? (
                      <LinearGradient
                        key={i}
                        colors={['#000000', Colors.danger]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: 4, height: 4, borderRadius: 2 }}
                      />
                    ) : (
                      <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c }} />
                    )
                  ))}
                  {allDots.length > 2 && (
                    <CyclingDot colors={allDots.slice(2)} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
