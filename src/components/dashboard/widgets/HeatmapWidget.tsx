/**
 * HeatmapWidget — LeetCode/GitHub-style 52-week contribution graph.
 * 5-tier intensity gradient. Tap a cell to view day details.
 * Pure View-based (no Skia needed) — works in Expo Go.
 */
import { useHabitsForSelectedDate } from '@/hooks/use-habits-for-date';
import { Cards, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import type { DayIntensity } from '@src/types';
import {
  formatDisplayDate,
  getMonthName,
  toDateString
} from '@src/utils/dateUtils';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

const TIER_COLORS = ['transparent', '#1E1B4B', '#3730A3', '#4F46E5', '#6366F1'];
const CELL = 11; // px per cell
const GAP = 2;

// ── Build a 364-day (52 week) grid ──────────────────────────────────────────

function buildWeekGrid(intensities: DayIntensity[]): DayIntensity[][] {
  // intensities is oldest-first, length up to 365
  // We want exactly 52 weeks (364 days), aligned to Sunday
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun

  // Start from the Sunday 52 weeks ago
  const start = new Date(today);
  start.setDate(today.getDate() - todayDow - 51 * 7);

  const intensityMap = new Map(intensities.map((d) => [d.date, d]));
  const weeks: DayIntensity[][] = [];

  for (let w = 0; w < 52; w++) {
    const week: DayIntensity[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const dateStr = toDateString(cur);
      week.push(
        intensityMap.get(dateStr) ?? {
          date: dateStr,
          completedCount: 0,
          totalCount: 0,
          completionRate: 0,
          intensityTier: 0,
          moodScore: null,
        },
      );
    }
    weeks.push(week);
  }
  return weeks;
}

// ── Month label positions ────────────────────────────────────────────────────

function getMonthLabels(weeks: DayIntensity[][]): Array<{ col: number; label: string }> {
  const labels: Array<{ col: number; label: string }> = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const month = new Date(week[0].date + 'T12:00:00').getMonth();
    if (month !== lastMonth) {
      labels.push({ col, label: getMonthName(month).substring(0, 3) });
      lastMonth = month;
    }
  });
  return labels;
}

// ── Day detail modal ─────────────────────────────────────────────────────────

function DayDetail({ day, onClose }: { day: DayIntensity; onClose: () => void }) {
  const habitsForDate = useHabitsForSelectedDate();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing[5] }}
        activeOpacity={1} onPress={onClose}
      >
        <Animated.View entering={ZoomIn.duration(250)} style={[Cards.elevated, { gap: Spacing[3] }]}>
          <Text style={T.h3}>{formatDisplayDate(day.date)}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing[4] }}>
            <View>
              <Text style={T.label}>Completed</Text>
              <Text style={T.scoreSm}>{day.completedCount}/{day.totalCount}</Text>
            </View>
            <View>
              <Text style={T.label}>Rate</Text>
              <Text style={T.scoreSm}>{Math.round(day.completionRate * 100)}%</Text>
            </View>
            {day.moodScore !== null && (
              <View>
                <Text style={T.label}>Mood</Text>
                <Text style={T.scoreSm}>{day.moodScore}/10</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end' }}>
            <Text style={[T.sm, { color: Colors.accent }]}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main widget ──────────────────────────────────────────────────────────────

interface HeatmapWidgetProps {
  habitId?: string; // undefined = global
}

export function HeatmapWidget({ habitId }: HeatmapWidgetProps) {
  const dayIntensities = useAnalyticsStore((s) => s.dayIntensities);
  const [selectedDay, setSelectedDay] = useState<DayIntensity | null>(null);

  const weeks = useMemo(() => buildWeekGrid(dayIntensities), [dayIntensities]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const totalActive = dayIntensities.filter((d) => d.intensityTier > 0).length;
  const avgCompletion = dayIntensities.length > 0
    ? Math.round(
      (dayIntensities.reduce((s, d) => s + d.completionRate, 0) / dayIntensities.length) * 100,
    )
    : 0;

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing[3] }}>
        <View>
          <Text style={T.label}>Activity Heatmap</Text>
          <Text style={[T.caption, { marginTop: 2 }]}>
            {totalActive} active days · {avgCompletion}% avg
          </Text>
        </View>
        {/* Legend */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={[T.xs, { color: Colors.textDim, marginRight: 4 }]}>Less</Text>
          {TIER_COLORS.map((c, i) => (
            <View
              key={i}
              style={{
                width: CELL, height: CELL, borderRadius: 2,
                backgroundColor: c === 'transparent' ? Colors.border : c,
              }}
            />
          ))}
          <Text style={[T.xs, { color: Colors.textDim, marginLeft: 4 }]}>More</Text>
        </View>
      </View>

      {/* Month labels + grid container */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels (Positioned absolutely above the grid) */}
          <View style={{ flexDirection: 'row', marginBottom: 4, height: 14, position: 'relative', marginLeft: 16 /* Add margin to account for the width of the day labels */ }}>
            {monthLabels.map((m) => (
              <Text
                key={`${m.col}-${m.label}`}
                style={[T.xs, {
                  color: Colors.textMuted,
                  position: 'absolute',
                  left: m.col * (CELL + GAP),
                  fontSize: 9,
                }]}
              >
                {m.label}
              </Text>
            ))}
          </View>

          {/* ✅ FIX: Wrap the Day Labels and the Grid in a Row */}
          <View style={{ flexDirection: 'row' }}>

            {/* Day-of-week labels (Moved BEFORE the grid) */}
            <View style={{ flexDirection: 'column', gap: GAP, marginRight: 6, justifyContent: 'space-between' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={[T.xs, { color: Colors.textDim, fontSize: 8, height: CELL, lineHeight: CELL }]}>
                  {i % 2 === 1 ? d : ''}
                </Text>
              ))}
            </View>

            {/* 52-column × 7-row grid */}
            <View style={{ flexDirection: 'row', gap: GAP }}>
              {weeks.map((week, col) => (
                <View key={col} style={{ flexDirection: 'column', gap: GAP }}>
                  {week.map((day) => {
                    const color = day.intensityTier === 0
                      ? Colors.border
                      : TIER_COLORS[day.intensityTier];
                    const isToday = day.date === toDateString();
                    return (
                      <TouchableOpacity
                        key={day.date}
                        onPress={() => setSelectedDay(day)}
                        style={{
                          width: CELL, height: CELL, borderRadius: 2,
                          backgroundColor: color,
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: Colors.accentGlow,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

          </View>
        </View>
      </ScrollView>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetail day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </View>
  );
}
