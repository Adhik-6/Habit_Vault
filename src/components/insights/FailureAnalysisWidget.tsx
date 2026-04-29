/**
 * FailureAnalysisWidget — Donut-style breakdown of why habits are missed,
 * with per-category counts and a peak-day indicator.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Cards, Text as T } from '@design/components';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const REASON_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  tired:    { label: 'Too Tired',    icon: 'bed-outline',         color: '#6366F1' },
  busy:     { label: 'Too Busy',     icon: 'briefcase-outline',   color: '#F59E0B' },
  forgot:   { label: 'Forgot',       icon: 'notifications-off-outline', color: '#38BDF8' },
  lazy:     { label: 'Low Motivation', icon: 'sad-outline',       color: '#EC4899' },
  custom:   { label: 'Other',        icon: 'ellipsis-horizontal', color: '#94A3B8' },
};

function DonutSegment({
  cx, cy, r, startAngle, endAngle, color, stroke,
}: {
  cx: number; cy: number; r: number;
  startAngle: number; endAngle: number;
  color: string; stroke: number;
}) {
  const circumference = 2 * Math.PI * r;
  const arc = ((endAngle - startAngle) / 360) * circumference;
  const dashOffset = circumference - arc;
  const rotation = startAngle - 90;

  return (
    <Circle
      cx={cx} cy={cy} r={r}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeDasharray={`${arc} ${circumference}`}
      strokeDashoffset={dashOffset}
      strokeLinecap="butt"
      transform={`rotate(${rotation} ${cx} ${cy})`}
    />
  );
}

export function FailureAnalysisWidget() {
  const failurePatterns = useAnalyticsStore((s) => s.failurePatterns);

  if (failurePatterns.length === 0) {
    return (
      <View style={[Cards.base, { marginBottom: Spacing[4], alignItems: 'center', paddingVertical: Spacing[6] }]}>
        <Ionicons name="shield-checkmark-outline" size={32} color={Colors.success} />
        <Text style={[T.bodyMedium, { marginTop: Spacing[2], color: Colors.success }]}>
          No failures recorded yet!
        </Text>
        <Text style={[T.caption, { marginTop: Spacing[1], textAlign: 'center' }]}>
          When you miss habits and log reasons, patterns will appear here.
        </Text>
      </View>
    );
  }

  const total = failurePatterns.reduce((s, p) => s + p.count, 0);

  // Build donut segments
  const SIZE = 140;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 48;
  const SW = 18;

  let cumAngle = 0;
  const segments = failurePatterns.map((p) => {
    const angle = (p.count / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    const cfg = REASON_CONFIG[p.reason] ?? REASON_CONFIG.custom;
    return { ...p, startAngle: start, endAngle: cumAngle, color: cfg.color };
  });

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      <Text style={[T.label, { marginBottom: Spacing[1] }]}>Why You Miss Habits</Text>
      <Text style={[T.caption, { marginBottom: Spacing[4] }]}>
        Based on {total} logged failure reason{total !== 1 ? 's' : ''}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[4] }}>
        {/* Donut */}
        <View style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE}>
            {/* Track */}
            <Circle cx={CX} cy={CY} r={R} fill="none" stroke={Colors.border} strokeWidth={SW} />
            {/* Segments */}
            {segments.map((seg, i) => (
              <DonutSegment
                key={i}
                cx={CX} cy={CY} r={R}
                startAngle={seg.startAngle}
                endAngle={seg.endAngle}
                color={seg.color}
                stroke={SW}
              />
            ))}
            {/* Center text */}
            <SvgText x={CX} y={CY - 4} textAnchor="middle" fontSize={18} fontWeight="700" fill={Colors.text}>
              {total}
            </SvgText>
            <SvgText x={CX} y={CY + 14} textAnchor="middle" fontSize={10} fill={Colors.textMuted}>
              misses
            </SvgText>
          </Svg>
        </View>

        {/* Legend */}
        <View style={{ flex: 1, gap: Spacing[2] }}>
          {failurePatterns.slice(0, 5).map((p) => {
            const cfg = REASON_CONFIG[p.reason] ?? REASON_CONFIG.custom;
            return (
              <View key={p.reason} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
                <View style={{ flex: 1 }}>
                  <Text style={T.sm} numberOfLines={1}>{cfg.label}</Text>
                  {p.peakDayIndex !== undefined && (
                    <Text style={[T.xs, { color: Colors.textDim }]}>
                      Peaks {DAY_NAMES[p.peakDayIndex]}
                    </Text>
                  )}
                </View>
                <Text style={[T.sm, { fontFamily: 'Inter_600SemiBold', color: cfg.color }]}>
                  {Math.round(p.percentage * 100)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Most common failure insight */}
      {failurePatterns[0] && (
        <View style={{
          marginTop: Spacing[4], padding: Spacing[3],
          backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
          flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
        }}>
          <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
          <Text style={[T.sm, { flex: 1, color: Colors.textSecondary }]}>
            You most often miss due to{' '}
            <Text style={{ color: Colors.text, fontFamily: 'Inter_600SemiBold' }}>
              {REASON_CONFIG[failurePatterns[0].reason]?.label ?? 'other reasons'}
            </Text>
            {failurePatterns[0].peakDayIndex !== undefined
              ? `, especially on ${DAY_NAMES[failurePatterns[0].peakDayIndex]}s.`
              : '.'}
          </Text>
        </View>
      )}
    </View>
  );
}
