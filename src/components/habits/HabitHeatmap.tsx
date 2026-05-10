/**
 * HabitHeatmap — 365-day per-habit intensity heatmap.
 *
 * Fixed issues:
 *  • All colors derived from habitColor (not accent)
 *  • Month labels use absolute x offset — no wrapping
 *  • Empty cells render a dim background (always visible)
 *  • Counter intensity is truly relative (GitHub-style) using stored rawValue
 *  • Tooltip shows rich per-type progress details
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Text as T } from '@design/components';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { buildHabitDayIntensities } from '@src/utils/analytics';
import { getLogsForHabit } from '@src/services/logService';
import { todayString } from '@src/utils/dateUtils';
import type { Habit, DayIntensity } from '@src/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL_SIZE = 13;
const CELL_GAP = 3;
const WEEK_W = CELL_SIZE + CELL_GAP;
const DAY_LABEL_W = 18; // width for "M"/"W"/"F" labels on left

// ── Colour helpers ────────────────────────────────────────────────────────────

/**
 * Build 5-tier palette from a base hex color:
 * tier 0 = near-invisible dark bg, tiers 1-4 = increasingly saturated.
 */
function buildTiers(hex: string): string[] {
  return [
    hex + '18', // 0 — empty (always visible as a dim square)
    hex + '44', // 1 — low
    hex + '77', // 2 — medium
    hex + 'BB', // 3 — high
    hex + 'FF', // 4 — max (full opacity)
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Returns a rich human-readable description of what happened that day. */
function buildProgressDetail(day: DayIntensity, habit: Habit): {
  primary: string;
  secondary?: string;
  steps?: Array<{ title: string; done: boolean }>;
} {
  switch (habit.type) {
    case 'boolean':
      return { primary: day.rawValue ? '✓ Completed' : '✗ Not done' };

    case 'quantity': {
      const val = day.rawValue ?? 0;
      const target = habit.targetValue;
      const unit = habit.unit ? ` ${habit.unit}` : '';
      return {
        primary: `${val}${unit} logged`,
        secondary: `Target: ${target}${unit} (${Math.round(day.completionRate * 100)}%)`,
      };
    }

    case 'duration': {
      const totalSec = day.rawValue ?? 0;
      const mins = Math.round(totalSec / 60);
      const target = habit.targetValue;
      return {
        primary: `${mins} min logged`,
        secondary: `Target: ${target} min (${Math.round(day.completionRate * 100)}%)`,
      };
    }

    case 'composite': {
      const progress = day.compositeProgress ?? {};
      const steps = habit.compositeSteps.map((s) => ({
        title: s.title,
        done: progress[s.id] ?? false,
      }));
      const doneCount = steps.filter((s) => s.done).length;
      return {
        primary: `${doneCount}/${steps.length} steps completed`,
        secondary: `${Math.round(day.completionRate * 100)}% done`,
        steps,
      };
    }

    case 'counter':
      return {
        primary: `${day.rawValue ?? 0} count`,
        secondary: day.intensityTier === 0 ? 'No activity'
          : day.intensityTier === 1 ? 'Low activity'
          : day.intensityTier === 2 ? 'Moderate activity'
          : day.intensityTier === 3 ? 'High activity'
          : 'Peak activity',
      };

    default:
      return { primary: 'No data' };
  }
}

// ── Heatmap cell ─────────────────────────────────────────────────────────────

interface CellProps {
  day: DayIntensity;
  isToday: boolean;
  habitColor: string;
  tiers: string[];
  onPress: (day: DayIntensity) => void;
}

function HeatmapCell({ day, isToday, habitColor, tiers, onPress }: CellProps) {
  const bg = tiers[day.intensityTier] ?? tiers[0];
  return (
    <TouchableOpacity
      onPress={() => onPress(day)}
      activeOpacity={0.75}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: 3,
        backgroundColor: bg,
        borderWidth: isToday ? 2 : 0,
        borderColor: isToday ? habitColor : 'transparent',
        margin: CELL_GAP / 2,
      }}
    />
  );
}

// ── Tooltip modal ─────────────────────────────────────────────────────────────

interface TooltipProps {
  day: DayIntensity | null;
  habit: Habit;
  habitColor: string;
  onClose: () => void;
}

function DayTooltip({ day, habit, habitColor, onClose }: TooltipProps) {
  if (!day) return null;
  const isToday = day.date === todayString();
  const detail = buildProgressDetail(day, habit);

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)} style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center', alignItems: 'center',
          }}
          onPress={onClose}
        >
          <Pressable
          style={{
            backgroundColor: Colors.surface,
            borderRadius: Radius.lg,
            padding: Spacing[4],
            width: 260,
            borderWidth: 1,
            borderColor: habitColor + '55',
            shadowColor: habitColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 10,
          }}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[3] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: habitColor }} />
            <Text style={[T.bodyMedium, { flex: 1 }]}>
              {formatDate(day.date)}{isToday ? '  •  Today' : ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Primary metric */}
          <View style={{
            backgroundColor: habitColor + '18', borderRadius: Radius.md,
            padding: Spacing[3], marginBottom: Spacing[2],
          }}>
            <Text style={[T.h3, { color: habitColor, textAlign: 'center' }]}>{detail.primary}</Text>
            {detail.secondary && (
              <Text style={[T.caption, { textAlign: 'center', marginTop: 2 }]}>{detail.secondary}</Text>
            )}
          </View>

          {/* Progress bar (non-counter, non-boolean) */}
          {(habit.type === 'quantity' || habit.type === 'duration' || habit.type === 'composite') && (
            <View style={{ backgroundColor: Colors.border, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing[2] }}>
              <View style={{
                width: `${Math.round(day.completionRate * 100)}%`,
                height: 6,
                backgroundColor: day.completionRate >= 1 ? Colors.success : habitColor,
                borderRadius: 3,
              }} />
            </View>
          )}

          {/* Composite step list */}
          {detail.steps && detail.steps.length > 0 && (
            <View style={{ gap: 4, marginBottom: Spacing[2] }}>
              {detail.steps.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                  <Ionicons
                    name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={s.done ? habitColor : Colors.textDim}
                  />
                  <Text style={[T.xs, { flex: 1, color: s.done ? Colors.text : Colors.textDim,
                    textDecorationLine: s.done ? 'line-through' : 'none' }]}>
                    {s.title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Intensity badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{
              paddingHorizontal: Spacing[2], paddingVertical: 2,
              backgroundColor: habitColor + '22', borderRadius: Radius.sm,
            }}>
              <Text style={[T.xs, { color: habitColor }]}>
                {day.intensityTier === 0 ? '◦ None'
                  : day.intensityTier === 1 ? '▪ Low'
                  : day.intensityTier === 2 ? '▪▪ Medium'
                  : day.intensityTier === 3 ? '▪▪▪ High'
                  : '▪▪▪▪ Max'}
              </Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface HabitHeatmapProps {
  habit: Habit;
  habitColor: string;
}

export function HabitHeatmap({ habit, habitColor }: HabitHeatmapProps) {
  const [intensities, setIntensities] = useState<DayIntensity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayIntensity | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const today = todayString();

  // Build color tiers from the habit's own color
  const tiers = buildTiers(habitColor);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLogsForHabit(habit.id).then((logs) => {
      if (!cancelled) {
        setIntensities(buildHabitDayIntensities(logs, habit));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [habit.id, habit.type, habit.targetValue, habit.compositeSteps]);

  const handleCellPress = useCallback((day: DayIntensity) => {
    setSelectedDay(day);
  }, []);

  // Scroll to the right end (most recent weeks) after render
  const handleLayout = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, []);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: Spacing[4] }}>
        <Text style={T.caption}>Loading heatmap…</Text>
      </View>
    );
  }

  // ── Build week columns ────────────────────────────────────────────────────
  const firstDate = intensities[0]?.date;
  const firstDow = firstDate ? new Date(firstDate + 'T12:00:00').getDay() : 0;
  const padded: (DayIntensity | null)[] = [
    ...Array(firstDow).fill(null),
    ...intensities,
  ];

  const weeks: (DayIntensity | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // ── Month label positions (x offset in the scroll) ─────────────────────────
  type MonthLabel = { x: number; label: string };
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstReal = weeks[w].find((d) => d !== null);
    if (!firstReal) continue;
    const month = new Date(firstReal.date + 'T12:00:00').getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        x: w * WEEK_W,
        label: new Date(firstReal.date + 'T12:00:00').toLocaleString('default', { month: 'short' }),
      });
      lastMonth = month;
    }
  }

  const totalGridW = weeks.length * WEEK_W;
  const MONTH_ROW_H = 16;
  const GRID_H = 7 * (CELL_SIZE + CELL_GAP);

  return (
    <View>
      {/* Row labels: Mon / Wed / Fri */}
      <View style={{ flexDirection: 'row' }}>
        {/* Fixed day-of-week labels */}
        <View style={{ width: DAY_LABEL_W, height: GRID_H + MONTH_ROW_H, justifyContent: 'flex-end' }}>
          {/* Offset: Mon=1, Wed=3, Fri=5 */}
          {[
            { label: 'M', row: 1 },
            { label: 'W', row: 3 },
            { label: 'F', row: 5 },
          ].map(({ label, row }) => (
            <View
              key={label}
              style={{
                position: 'absolute',
                top: MONTH_ROW_H + row * (CELL_SIZE + CELL_GAP) + (CELL_SIZE - 10) / 2,
                left: 0,
                width: DAY_LABEL_W - 2,
                alignItems: 'flex-end',
              }}
            >
              <Text style={{ fontSize: 9, color: Colors.textDim, lineHeight: 10 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Scrollable grid */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={handleLayout}
        >
          <View style={{ width: totalGridW }}>
            {/* Month labels row — absolutely positioned so they never wrap */}
            <View style={{ height: MONTH_ROW_H, position: 'relative' }}>
              {monthLabels.map((ml) => (
                <Text
                  key={ml.x}
                  style={{
                    position: 'absolute',
                    left: ml.x,
                    top: 2,
                    fontSize: 9,
                    color: Colors.textDim,
                    lineHeight: 12,
                  }}
                >
                  {ml.label}
                </Text>
              ))}
            </View>

            {/* Grid cells */}
            <View style={{ flexDirection: 'row' }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'column' }}>
                  {week.map((day, di) =>
                    day ? (
                      <HeatmapCell
                        key={day.date}
                        day={day}
                        isToday={day.date === today}
                        habitColor={habitColor}
                        tiers={tiers}
                        onPress={handleCellPress}
                      />
                    ) : (
                      <View
                        key={`e-${wi}-${di}`}
                        style={{ width: CELL_SIZE, height: CELL_SIZE, margin: CELL_GAP / 2 }}
                      />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Legend — uses habitColor tiers */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginTop: Spacing[2], paddingLeft: DAY_LABEL_W }}>
        <Text style={[T.xs, { color: Colors.textDim }]}>Less</Text>
        {tiers.map((color, i) => (
          <View
            key={i}
            style={{
              width: CELL_SIZE, height: CELL_SIZE, borderRadius: 3,
              backgroundColor: color,
              borderWidth: i === 0 ? 1 : 0,
              borderColor: Colors.border,
            }}
          />
        ))}
        <Text style={[T.xs, { color: Colors.textDim }]}>More</Text>
      </View>

      {/* Tooltip modal */}
      <DayTooltip
        day={selectedDay}
        habit={habit}
        habitColor={habitColor}
        onClose={() => setSelectedDay(null)}
      />
    </View>
  );
}
