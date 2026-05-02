/**
 * Insights Screen — Full behavioural analytics hub.
 * Tabs: Overview | Habits | Mood | Patterns
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHabitsForSelectedDate } from '@/hooks/use-habits-for-date';
import { useMoodScoreMap, useMoodTimeline } from '@/hooks/use-mood-for-date';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';

import { LineChart, WeekdayBarChart } from '@src/components/charts/Charts';
import { ProgressRing } from '@src/components/common/ProgressRing';
import { FailureAnalysisWidget } from '@src/components/insights/FailureAnalysisWidget';
import { useRouter } from 'expo-router';
import { MoodCorrelationWidget } from '@src/components/insights/MoodCorrelationWidget';

import { Cards, Layout, Text as T } from '@design/components';
import { Colors, moodColor, Radius, Spacing } from '@design/tokens';
import { scoreToEmoji } from '@services/moodService';
import type { HabitWithLog } from '@src/types';

// ── Tab definition ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'habits', label: 'Habits', icon: 'list-outline' },
  { id: 'mood', label: 'Mood', icon: 'happy-outline' },
  { id: 'patterns', label: 'Patterns', icon: 'stats-chart-outline' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { globalScore, insights, weekdayStats, isComputing } = useAnalyticsStore();
  const recomputeAll = useAnalyticsStore((s) => s.recomputeAll);
  const habits = useHabitStore((s) => s.habits);
  const habitsForDate = useHabitsForSelectedDate();
  const completed = habitsForDate.filter((h) => h.isCompleted).length;
  const total = habitsForDate.length;

  const scoreColor =
    globalScore >= 75 ? Colors.success :
      globalScore >= 50 ? Colors.accent :
        globalScore >= 25 ? Colors.warning : Colors.danger;

  const scoreLabel =
    globalScore >= 80 ? 'Elite 🏆' :
      globalScore >= 60 ? 'Strong 💪' :
        globalScore >= 40 ? 'Growing 🌱' :
          globalScore >= 20 ? 'Starting 🚀' : 'New ✨';

  return (
    <View style={{ gap: Spacing[4] }}>

      {/* Global score hero card */}
      <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[Cards.accentBorder]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[4] }}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing progress={globalScore / 100} size={80} strokeWidth={7} color={scoreColor} />
            <View style={{ position: 'absolute' }}>
              <Text style={[T.scoreSm, { textAlign: 'center', color: scoreColor }]}>{globalScore}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Global Strength</Text>
            <Text style={T.h2}>{scoreLabel}</Text>
            <Text style={T.caption}>{habits.length} habits · {total > 0 ? `${Math.round((completed / total) * 100)}% today` : 'no habits today'}</Text>
          </View>
          {isComputing && <ActivityIndicator size="small" color={Colors.accent} />}
        </View>
        <TouchableOpacity
          onPress={recomputeAll}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[3], alignSelf: 'flex-end' }}
        >
          <Ionicons name="refresh-outline" size={14} color={Colors.textMuted} />
          <Text style={[T.xs, { color: Colors.textMuted }]}>Refresh analytics</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick stats row */}
      <Animated.View entering={FadeInDown.delay(160).duration(350)}>
        <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
          {[
            { label: 'Habits', value: habits.length, icon: 'list', color: Colors.accent },
            { label: 'Insights', value: insights.length, icon: 'bulb', color: Colors.warning },
          ].map((stat) => (
            <View key={stat.label} style={[Cards.base, { flex: 1, alignItems: 'center', gap: Spacing[1] }]}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              <Text style={T.scoreSm}>{stat.value}</Text>
              <Text style={T.caption}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Top insights */}
      <Animated.View entering={FadeInDown.delay(240).duration(350)}>
        {insights.length === 0 ? (
          <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[6] }]}>
            <Text style={{ fontSize: 32 }}>📊</Text>
            <Text style={[T.bodyMedium, { marginTop: Spacing[2] }]}>No insights yet</Text>
            <Text style={[T.caption, { textAlign: 'center', marginTop: Spacing[1] }]}>
              Track habits for at least 7 days to generate behavioral insights
            </Text>
          </View>
        ) : (
          <View style={[Cards.base]}>
            <Text style={[T.label, { marginBottom: Spacing[3] }]}>Key Insights</Text>
            {insights.slice(0, 6).map((insight, i) => {
              const { icon, color } = ({
                improving: { icon: 'trending-up', color: Colors.success },
                declining: { icon: 'trending-down', color: Colors.danger },
                streak_risk: { icon: 'flame-outline', color: Colors.warning },
                worst_day: { icon: 'warning-outline', color: Colors.warning },
                pattern: { icon: 'repeat-outline', color: Colors.info },
                best_time: { icon: 'time-outline', color: Colors.accent },
              } as Record<string, { icon: string; color: string }>)[insight.type] ?? { icon: 'bulb-outline', color: Colors.accent };

              return (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3],
                  paddingVertical: Spacing[2],
                  borderBottomWidth: i < Math.min(insights.length, 6) - 1 ? 1 : 0,
                  borderBottomColor: Colors.border,
                }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: Radius.md,
                    backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={icon as any} size={14} color={color} />
                  </View>
                  <Text style={[T.sm, { flex: 1, lineHeight: 20, color: Colors.text }]}>
                    {insight.message}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

    </View>
  );
}

// ── Habits Tab ────────────────────────────────────────────────────────────────

function HabitsTab({ onHabitPress }: { onHabitPress: (h: HabitWithLog) => void }) {
  const strengthScores = useAnalyticsStore((s) => s.strengthScores);
  const habits = useHabitStore((s) => s.habits);
  const habitsForDate = useHabitsForSelectedDate();
  const habitMap = new Map(habitsForDate.map((h) => [h.id, h]));

  const sorted = [...strengthScores].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[8] }]}>
        <Text style={{ fontSize: 36 }}>🌱</Text>
        <Text style={[T.bodyMedium, { marginTop: Spacing[2] }]}>No data yet</Text>
        <Text style={[T.caption, { textAlign: 'center' }]}>Start tracking habits to see performance</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing[3] }}>
      <Text style={[T.label, { marginBottom: Spacing[1] }]}>All Habits — Ranked by Strength</Text>
      {sorted.map((s, i) => {
        const habit = habits.find((h) => h.id === s.habitId);
        const habitWithLog = habitMap.get(s.habitId);
        const streak = s.streak;
        if (!habit) return null;

        const rank = i + 1;
        const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

        return (
          <TouchableOpacity
            key={s.habitId}
            onPress={() => habitWithLog && onHabitPress(habitWithLog)}
            activeOpacity={0.75}
          >
            <View style={[Cards.compact, {
              flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
              borderColor: rank <= 3 ? Colors.accentDim : Colors.border,
            }]}>
              {/* Rank */}
              <View style={{ width: 28, alignItems: 'center' }}>
                {medalEmoji ? (
                  <Text style={{ fontSize: 18 }}>{medalEmoji}</Text>
                ) : (
                  <Text style={[T.xs, { color: Colors.textDim }]}>#{rank}</Text>
                )}
              </View>

              {/* Color dot */}
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: habit.color }} />

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={T.bodyMedium} numberOfLines={1}>{habit.name}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing[3], marginTop: 2 }}>
                  <Text style={T.caption}>{Math.round(s.completionRate * 100)}% rate</Text>
                  {streak && streak.current > 0 && (
                    <Text style={T.caption}>🔥 {streak.current}d</Text>
                  )}
                </View>
              </View>

              {/* Score + progress */}
              <View style={{ alignItems: 'flex-end', gap: Spacing[1] }}>
                <ProgressRing progress={s.score / 100} size={36} strokeWidth={4} color={habit.color} />
                <Text style={[T.xs, { color: Colors.textMuted }]}>{s.score}/100</Text>
              </View>

              <Ionicons name="chevron-forward" size={14} color={Colors.textDim} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Mood Tab ──────────────────────────────────────────────────────────────────

function MoodTab() {
  const moodTimeline = useMoodTimeline(30);
  const moodByDate = useMoodScoreMap();

  const avg = moodTimeline.length > 0
    ? moodTimeline.reduce((s, m) => s + m.score, 0) / moodTimeline.length
    : 0;

  const chartData = moodTimeline.slice(-14).map((m, i) => ({
    value: m.score,
    label: i === 0 || i === moodTimeline.length - 1 ? m.date.slice(5) : '',
  }));

  // Mood distribution (how many days at each score)
  const dist = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: moodTimeline.filter((m) => m.score === i + 1).length,
  }));
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  return (
    <View style={{ gap: Spacing[4] }}>
      {/* Mood summary card */}
      <Animated.View entering={FadeInDown.delay(80).duration(350)} style={[Cards.base, { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] }]}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: moodColor(Math.round(avg)) + '33',
          borderWidth: 2, borderColor: moodColor(Math.round(avg)),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 28 }}>{scoreToEmoji(Math.round(avg))}</Text>
        </View>
        <View>
          <Text style={T.label}>30-Day Avg Mood</Text>
          <Text style={[T.score, { color: moodColor(Math.round(avg)) }]}>{avg.toFixed(1)}</Text>
          <Text style={T.caption}>from {moodTimeline.length} logged days</Text>
        </View>
      </Animated.View>

      {/* Line chart */}
      {chartData.length >= 2 && (
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <LineChart
            data={chartData}
            title="Mood Trend — Last 14 Days"
            min={1} max={10}
            color={Colors.info}
            height={140}
          />
        </Animated.View>
      )}

      {/* Score distribution */}
      <Animated.View entering={FadeInDown.delay(240).duration(350)} style={[Cards.base]}>
        <Text style={[T.label, { marginBottom: Spacing[3] }]}>Score Distribution</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60 }}>
          {dist.map((d) => (
            <View key={d.score} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                width: '100%',
                height: Math.max(3, (d.count / maxCount) * 48),
                borderRadius: 3,
                backgroundColor: d.count > 0 ? moodColor(d.score) : Colors.border,
                opacity: d.count > 0 ? 0.85 : 0.3,
              }} />
              <Text style={[T.xs, { color: Colors.textDim, marginTop: 3, fontSize: 8 }]}>
                {d.score}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Correlation */}
      <Animated.View entering={FadeInDown.delay(320).duration(350)}>
        <MoodCorrelationWidget />
      </Animated.View>
    </View>
  );
}

// ── Patterns Tab ──────────────────────────────────────────────────────────────

function PatternsTab() {
  const { failurePatterns, weekdayStats } = useAnalyticsStore();

  // Best and worst days
  const bestDay = weekdayStats.length > 0
    ? weekdayStats.reduce((b, d) => d.completionRate > b.completionRate ? d : b)
    : null;
  const worstDay = weekdayStats.length > 0
    ? weekdayStats.reduce((w, d) => d.completionRate < w.completionRate ? d : w)
    : null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <View style={{ gap: Spacing[4] }}>

      {/* Best/Worst day callout */}
      {bestDay && worstDay && (
        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={{ flexDirection: 'row', gap: Spacing[3] }}>
          <View style={[Cards.base, { flex: 1, alignItems: 'center', gap: Spacing[1] }]}>
            <Text style={{ fontSize: 24 }}>⭐</Text>
            <Text style={T.label}>Best Day</Text>
            <Text style={[T.bodyMedium, { color: Colors.success }]}>{dayNames[bestDay.dayIndex]}</Text>
            <Text style={T.caption}>{Math.round(bestDay.completionRate * 100)}% rate</Text>
          </View>
          <View style={[Cards.base, { flex: 1, alignItems: 'center', gap: Spacing[1] }]}>
            <Text style={{ fontSize: 24 }}>⚠️</Text>
            <Text style={T.label}>Needs Work</Text>
            <Text style={[T.bodyMedium, { color: Colors.warning }]}>{dayNames[worstDay.dayIndex]}</Text>
            <Text style={T.caption}>{Math.round(worstDay.completionRate * 100)}% rate</Text>
          </View>
        </Animated.View>
      )}

      {/* Weekday bars */}
      <Animated.View entering={FadeInDown.delay(160).duration(350)}>
        <WeekdayBarChart data={weekdayStats} title="Completion by Weekday" />
      </Animated.View>

      {/* Failure analysis */}
      <Animated.View entering={FadeInDown.delay(240).duration(350)}>
        <FailureAnalysisWidget />
      </Animated.View>

      {/* Tips based on failure patterns */}
      {failurePatterns.length > 0 && (
        <Animated.View entering={FadeInDown.delay(320).duration(350)} style={[Cards.elevated, { gap: Spacing[3] }]}>
          <Text style={T.label}>💡 Personalized Tips</Text>
          {failurePatterns.slice(0, 3).map((p) => {
            const tip =
              p.reason === 'tired' ? 'Consider moving energy-intensive habits to mornings when you\'re fresh.' :
                p.reason === 'busy' ? 'Try "habit stacking" — attach habits to existing routines.' :
                  p.reason === 'forgot' ? 'Set time-based reminders for your most-missed habits.' :
                    p.reason === 'lazy' ? 'Reduce friction — lay out gear the night before.' :
                      'Review if this habit aligns with your current goals.';
            return (
              <View key={p.reason} style={{ flexDirection: 'row', gap: Spacing[3], alignItems: 'flex-start' }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: Colors.accent, marginTop: 7,
                }} />
                <Text style={[T.sm, { flex: 1, color: Colors.textSecondary, lineHeight: 20 }]}>{tip}</Text>
              </View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

// ── Insights Screen ───────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const router = useRouter();

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(350)}>
        <View style={[Layout.spaceBetween, { paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: Spacing[3] }]}>
          <View>
            <Text style={T.label}>Analytics</Text>
            <Text style={T.h1}>Insights</Text>
          </View>
        </View>

        {/* Tab strip */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing[5], gap: Spacing[2] }}
          style={{ marginBottom: Spacing[2] }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
                  paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
                  borderRadius: Radius.lg,
                  backgroundColor: isActive ? Colors.accent : Colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: isActive ? Colors.accent : Colors.border,
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? '#fff' : Colors.textSecondary}
                />
                <Text style={[T.sm, { color: isActive ? '#fff' : Colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Tab content ── */}
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'habits' && (
          <HabitsTab onHabitPress={(h) => router.push(`/habit/${h.id}` as any)} />
        )}
        {activeTab === 'mood' && <MoodTab />}
        {activeTab === 'patterns' && <PatternsTab />}
      </ScrollView>

    </SafeAreaView>
  );
}
