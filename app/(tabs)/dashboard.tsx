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

import { LineChart, WeekdayBarChart } from '@src/components/charts/Charts';
import { DashboardGrid, type WidgetId } from '@src/components/dashboard/DashboardGrid';
import { HeatmapWidget } from '@src/components/dashboard/widgets/HeatmapWidget';
import { StreakWidget } from '@src/components/dashboard/widgets/StreakWidget';
import { StrengthScoreWidget } from '@src/components/dashboard/widgets/StrengthScoreWidget';
import { CategoryAnalysisWidget } from '@src/components/dashboard/widgets/CategoryAnalysisWidget';

import { Cards, Layout, Text as T } from '@design/components';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';

// ── Insights widget ────────────────────────────────────────────────────────────

function InsightsWidget() {
  const insights = useAnalyticsStore((s) => s.insights);

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
      {insights.slice(0, 5).map((insight, i) => {
        const iconName =
          insight.type === 'improving' ? 'trending-up' :
            insight.type === 'declining' ? 'trending-down' :
              insight.type === 'streak_risk' ? 'flame-outline' :
                insight.type === 'worst_day' ? 'warning-outline' : 'bulb-outline';

        const iconColor =
          insight.type === 'improving' ? Colors.success :
            insight.type === 'declining' ? Colors.danger :
              insight.type === 'streak_risk' ? Colors.warning : Colors.accent;

        return (
          <View
            key={i}
            style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3],
              paddingVertical: Spacing[2],
              borderBottomWidth: i < insights.length - 1 ? 1 : 0,
              borderBottomColor: Colors.border,
            }}
          >
            <View style={{
              width: 28, height: 28, borderRadius: Radius.md,
              backgroundColor: iconColor + '22',
              alignItems: 'center', justifyContent: 'center', marginTop: 1,
            }}>
              <Ionicons name={iconName as any} size={15} color={iconColor} />
            </View>
            <Text style={[T.sm, { flex: 1, color: Colors.text, lineHeight: 20 }]}>
              {insight.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const weekdayStats = useAnalyticsStore((s) => s.weekdayStats);
  const moodTimeline = useMoodTimeline(30);
  const globalScore = useAnalyticsStore((s) => s.globalScore);
  const habits = useHabitStore((s) => s.habits);

  const [todayCompleted, setTodayCompleted] = React.useState(0);
  const [todayTotal, setTodayTotal] = React.useState(0);

  React.useEffect(() => {
    async function fetchTodayStats() {
      const today = todayString();
      const scheduled = filterHabitsForDate(habits, today);
      const logs = await getLogsForDate(today);
      const completed = logs.filter(l => l.completedAt).length;
      setTodayTotal(scheduled.length);
      setTodayCompleted(completed);
    }
    fetchTodayStats();
  }, [habits]);

  // Mood line chart data
  const moodChartData = useMemo(
    () =>
      moodTimeline.slice(-14).map((m, i) => ({
        value: m.score,
        label: i === 0 || i === moodTimeline.length - 1 ? m.date.slice(5) : '',
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
            title="Weekday Performance"
          />
        );
      case 'mood_trend':
        return moodChartData.length >= 2 ? (
          <LineChart
            key={id}
            data={moodChartData}
            title="Mood Trend (14 days)"
            min={1}
            max={10}
            color={Colors.info}
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

