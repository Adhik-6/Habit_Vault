import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cards, Layout, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { getMonthDates, getMonthName, getDayOfWeek, todayString } from '@src/utils/dateUtils';
import { useHabitStore } from '@store/useHabitStore';
import { useAccentColors } from '@/hooks/use-accent-colors';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendar() {
  const today = todayString();
  const [viewDate, setViewDate] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(true);
  const ac = useAccentColors();
  
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const setSelectedDate = useHabitStore((s) => s.setSelectedDate);

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
  function nextMonth() {
    if (isCollapsed) {
      setSelectedDate(new Date(new Date(selectedDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    } else {
      setViewDate(new Date(year, month + 1, 1));
    }
  }

  // Week view dates: based on selectedDate
  const weekDates = getMonthDates(year, month).slice(0, 7); // placeholder, will calculate actual week
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

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
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

        <TouchableOpacity onPress={nextMonth} style={{ padding: Spacing[2] }}>
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
