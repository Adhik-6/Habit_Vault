/**
 * Calendar Screen stub.
 * Full interactive monthly calendar in Step 3.
 */
import { useHabitsForSelectedDate } from '@/hooks/use-habits-for-date';
import { Cards, Layout, Text as T } from '@design/components';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import {
  getDayOfWeek,
  getMonthDates, getMonthName,
  todayString
} from '@src/utils/dateUtils';
import { useHabitStore } from '@store/useHabitStore';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const today = todayString();
  const [viewDate, setViewDate] = useState(new Date());
  const selectedDate = useHabitStore((s) => s.selectedDate);
  const setSelectedDate = useHabitStore((s) => s.setSelectedDate);
  const habitsForDate = useHabitsForSelectedDate();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthDates = getMonthDates(year, month);
  const firstDayOffset = getDayOfWeek(monthDates[0]);

  const completedOnSelected = habitsForDate.filter((h) => h.isCompleted).length;
  const totalOnSelected = habitsForDate.length;

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: Spacing[5] }}>
          <Text style={T.label}>History</Text>
          <Text style={T.h1}>Calendar</Text>
        </Animated.View>

        {/* ── Month navigator ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[Cards.base, { marginBottom: Spacing[4] }]}>
          <View style={[Layout.spaceBetween, { marginBottom: Spacing[4] }]}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: Spacing[2] }}>
              <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={T.h3}>{getMonthName(month)} {year}</Text>
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
            {/* Leading empty cells */}
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
            ))}

            {/* Day cells */}
            {monthDates.map((date) => {
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
                        ? Colors.accent
                        : isToday
                          ? Colors.accentMuted
                          : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: Colors.accent,
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
                                ? Colors.accentGlow
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
        </Animated.View>

        {/* ── Selected date detail ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <Text style={[T.label, { marginBottom: Spacing[3] }]}>
            {selectedDate === today ? "Today's Habits" : `Habits on ${selectedDate}`}
          </Text>

          {totalOnSelected === 0 ? (
            <View style={[Cards.compact, { alignItems: 'center', paddingVertical: Spacing[6] }]}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
              <Text style={[T.caption, { marginTop: Spacing[2] }]}>No habits tracked on this date</Text>
            </View>
          ) : (
            <>
              <View style={[Cards.compact, { marginBottom: Spacing[3] }]}>
                <Text style={T.bodyMedium}>
                  {completedOnSelected}/{totalOnSelected} completed
                  {' '}({Math.round((completedOnSelected / totalOnSelected) * 100)}%)
                </Text>
              </View>
              {habitsForDate.map((h) => (
                <View
                  key={h.id}
                  style={[
                    Cards.compact,
                    {
                      marginBottom: Spacing[2],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing[3],
                    },
                  ]}
                >
                  <Ionicons
                    name={h.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={h.isCompleted ? Colors.success : Colors.textMuted}
                  />
                  <Text
                    style={[
                      T.bodyMedium,
                      { color: h.isCompleted ? Colors.textSecondary : Colors.text },
                    ]}
                  >
                    {h.name}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
