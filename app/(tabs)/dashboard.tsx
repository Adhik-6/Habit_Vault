/**
 * Dashboard Screen — Modular widget grid with heatmap, streaks,
 * strength score, weekday chart, mood trend, and auto-insights.
 */
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHabitsForSelectedDate } from '@/hooks/use-habits-for-date';
import { useMoodTimeline } from '@/hooks/use-mood-for-date';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import { filterHabitsForDate } from '@src/services/habitService';
import { getLogsForDate } from '@src/services/logService';
import { todayString } from '@src/utils/dateUtils';
import { getCompletionWeight } from '@src/utils/analytics';

import { LineChart, WeekdayBarChart } from '@src/components/charts/Charts';
import { DashboardGrid, type WidgetId } from '@src/components/dashboard/DashboardGrid';
import { HeatmapWidget } from '@src/components/dashboard/widgets/HeatmapWidget';
import { StreakWidget } from '@src/components/dashboard/widgets/StreakWidget';
import { StrengthScoreWidget } from '@src/components/dashboard/widgets/StrengthScoreWidget';
import { CategoryAnalysisWidget } from '@src/components/dashboard/widgets/CategoryAnalysisWidget';
import { InsightRow } from '@src/components/insights/InsightRow';

import { Cards, Layout, Text as T } from '@design/components';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAccentColors } from '@/hooks/use-accent-colors';

// ── Insights widget ────────────────────────────────────────────────────────────

function InsightsWidget() {
  const insights = useAnalyticsStore((s) => s.insights);
  const ac = useAccentColors();

  if (insights.length === 0) {
    return (
      <View style={[Cards.base, { alignItems: 'center', paddingVertical: Spacing[6], marginBottom: Spacing[4] }]}>
        <Ionicons name="bulb-outline" size={32} color={Colors.textMuted} />
        <Text style={[T.caption, { marginTop: Spacing[2], textAlign: 'center' }]}>
          Track habits for 7+ days to unlock personalized insights
        </Text>
      </View>
    );
  }

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <Text style={[T.label, { marginBottom: Spacing[3] }]}>Auto Insights</Text>
      {insights.slice(0, 5).map((insight, i) => (
        <InsightRow key={i} insight={insight} isLast={i === Math.min(insights.length, 5) - 1} />
      ))}
    </View>
  );
}

// ── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const weekdayStats = useAnalyticsStore((s) => s.weekdayStats);
  const moodTimeline = useMoodTimeline(30);
  const globalScore = useAnalyticsStore((s) => s.globalScore);
  const habits = useHabitStore((s) => s.habits);

  const habitsForDate = useHabitsForSelectedDate();
  const todayTotal = habitsForDate.length;
  const todayCompleted = habitsForDate.reduce((sum, h) => sum + h.completionWeight, 0);

  // Mood line chart data
  const moodChartData = useMemo(
    () =>
      moodTimeline.map((m) => ({
        value: m.score,
        label: m.date.slice(5),
      })),
    [moodTimeline],
  );

  const renderWidget = (id: WidgetId, index: number): React.ReactNode => {
    switch (id) {
      case 'strength':
        return <StrengthScoreWidget key={id} />;
      case 'heatmap':
        return <HeatmapWidget key={id} />;
      case 'streak':
        return <StreakWidget key={id} />;
      case 'weekday':
        return (
          <WeekdayBarChart
            key={id}
            data={weekdayStats}
            title="Completion by Weekday"
            info="Average daily completion rate this month."
          />
        );
      case 'mood_trend':
        return moodChartData.length >= 2 ? (
          <LineChart
            key={id}
            data={moodChartData}
            title="Mood Trend (This Month)"
            min={1}
            max={10}
            color={Colors.info}
            xAxisLabel="Date"
            yAxisLabel="Mood Score"
          />
        ) : (
          <View key={id} style={[Cards.base, { marginBottom: Spacing[4], alignItems: 'center', paddingVertical: Spacing[6] }]}>
            <Ionicons name="happy-outline" size={32} color={Colors.textMuted} />
            <Text style={[T.caption, { marginTop: Spacing[2] }]}>
              Log mood daily to see the trend chart
            </Text>
          </View>
        );
      case 'insights':
        return <InsightsWidget key={id} />;
      case 'category_analysis':
        return <CategoryAnalysisWidget key={id} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={Layout.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[5], paddingBottom: Spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: Spacing[4] }}>
          <Text style={T.label}>Overview</Text>
          <Text style={T.h1}>Dashboard</Text>
        </Animated.View>

        {/* ── Summary bar ── */}
        <Animated.View style={[Cards.base, { marginBottom: Spacing[4] }]}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>{globalScore}</Text>
              <Text style={T.caption}>Strength</Text>
            </View>
            <View style={{ width: 1, backgroundColor: Colors.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>{habits.length}</Text>
              <Text style={T.caption}>Habits</Text>
            </View>
            <View style={{ width: 1, backgroundColor: Colors.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={T.scoreSm}>{todayTotal > 0 ? `${Math.round((todayCompleted / todayTotal) * 100)}%` : '—'}</Text>
              <Text style={T.caption}>Today</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Widget grid ── */}
        <DashboardGrid renderWidget={renderWidget} />
      </ScrollView>
    </SafeAreaView>
  );
}

