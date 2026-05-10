/**
 * WeekdayBarChart — SVG bar chart showing completion rate by weekday.
 * LineChart — mood/completion trend with proper x/y axis labels.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withDelay, withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing } from '@design/tokens';
import { Cards, Text as T } from '@design/components';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BarChartProps {
  data: Array<{ dayIndex: number; completionRate: number; totalAttempts: number }>;
  width?: number;
  height?: number;
  color?: string;
  title?: string;
}

function AnimatedBar({
  x, maxH, y, w, rate, color, delay,
}: {
  x: number; maxH: number; y: number; w: number; rate: number; color: string; delay: number;
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(delay, withTiming(rate, { duration: 700 }));
  }, [rate]);

  const animatedProps = useAnimatedProps(() => {
    const barH = Math.max(2, progress.value * maxH);
    return {
      y: y - barH,
      height: barH,
    };
  });

  return (
    <AnimatedRect
      x={x} width={w}
      fill={color}
      rx={3}
      animatedProps={animatedProps}
    />
  );
}

export function WeekdayBarChart({ data, height = 140, color, title }: BarChartProps) {
  const [chartWidth, setChartWidth] = React.useState<number | null>(null);

  const padL = 32, padR = 8, padT = 12, padB = 28;
  const chartW = chartWidth ? chartWidth - padL - padR : 0;
  const chartH = height - padT - padB;
  const barW = chartW > 0 ? chartW / data.length - 6 : 0;

  // Y-axis ticks at 0%, 50%, 100%
  const yTicks = [0, 0.5, 1];

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      {title && <Text style={[T.label, { marginBottom: Spacing[3] }]}>{title}</Text>}
      <View style={{ width: '100%' }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        {chartWidth !== null && chartWidth > 0 && (
          <Svg width={chartWidth} height={height}>
            {/* Y-axis ticks + labels */}
            {yTicks.map((tick) => {
              const yPos = padT + chartH - tick * chartH;
              return (
                <React.Fragment key={tick}>
                  <Line
                    x1={padL} y1={yPos}
                    x2={padL + chartW} y2={yPos}
                    stroke={Colors.border} strokeWidth={1}
                    strokeDasharray={tick === 0 ? undefined : '3,3'}
                  />
                  <SvgText
                    x={padL - 4} y={yPos + 4}
                    textAnchor="end"
                    fontSize={8}
                    fill={Colors.textMuted}
                  >
                    {`${Math.round(tick * 100)}%`}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {data.map((d, i) => {
              const x = padL + i * (chartW / data.length) + 3;
              const barColor = d.completionRate > 0.7
                ? Colors.success
                : d.completionRate > 0.4
                ? (color ?? Colors.accent)
                : Colors.dangerDim;

              return (
                <React.Fragment key={d.dayIndex}>
                  <AnimatedBar
                    x={x} w={barW}
                    maxH={chartH} y={padT + chartH}
                    rate={d.completionRate}
                    color={barColor}
                    delay={i * 80}
                  />
                  <SvgText
                    x={x + barW / 2} y={padT + chartH + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fill={Colors.textMuted}
                  >
                    {DAY_LABELS[d.dayIndex].charAt(0)}
                  </SvgText>
                  <SvgText
                    x={x + barW / 2} y={padT + chartH - (d.completionRate * chartH) - 4}
                    textAnchor="middle"
                    fontSize={8}
                    fill={Colors.textMuted}
                  >
                    {d.totalAttempts > 0 ? `${Math.round(d.completionRate * 100)}` : ''}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
    </View>
  );
}

// ── Line chart for mood / completion trends ──────────────────────────────────

import { Path, Circle } from 'react-native-svg';

interface LineChartProps {
  data: Array<{ value: number; label?: string }>;
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
  title?: string;
}

export function LineChart({ data, height = 140, color, min = 0, max = 10, title }: LineChartProps) {
  const [chartWidth, setChartWidth] = React.useState<number | null>(null);

  if (data.length < 2) return null;

  // Left padding large enough for Y-axis labels ("10")
  const padL = 28, padR = 8, padT = 12, padB = 24;
  const chartW = chartWidth ? chartWidth - padL - padR : 0;
  const chartH = height - padT - padB;
  const range = max - min || 1;

  const points = chartW > 0 ? data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - ((d.value - min) / range) * chartH,
  })) : [];

  // Build SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
    : '';

  const lineColor = color ?? Colors.accent;

  // Y-axis ticks: 1, 3, 5, 7, 9 (or 4 evenly-spaced ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => min + Math.round((i / 4) * (max - min)));

  // X-axis: show every ~3rd label to avoid crowding
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabelIndices = new Set<number>([0, data.length - 1]);
  for (let i = step; i < data.length - 1; i += step) xLabelIndices.add(i);

  return (
    <View style={[Cards.base, { marginBottom: Spacing[4] }]}>
      {title && <Text style={[T.label, { marginBottom: Spacing[3] }]}>{title}</Text>}
      <View style={{ width: '100%' }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        {chartWidth !== null && chartWidth > 0 && (
          <Svg width={chartWidth} height={height}>
            {/* Y-axis gridlines + labels */}
            {yTicks.map((tick) => {
              const yPos = padT + chartH - ((tick - min) / range) * chartH;
              return (
                <React.Fragment key={tick}>
                  <Line
                    x1={padL} y1={yPos}
                    x2={padL + chartW} y2={yPos}
                    stroke={Colors.border} strokeWidth={1}
                    strokeDasharray={tick === min ? undefined : '3,3'}
                  />
                  <SvgText
                    x={padL - 4} y={yPos + 4}
                    textAnchor="end"
                    fontSize={8}
                    fill={Colors.textMuted}
                  >
                    {tick}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Area fill */}
            <Path d={areaD} fill={lineColor} fillOpacity={0.08} />
            {/* Line */}
            <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {/* Data points */}
            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
            ))}
            {/* X-axis labels (every ~nth) */}
            {data.map((d, i) => {
              if (!xLabelIndices.has(i)) return null;
              return (
                <SvgText
                  key={i}
                  x={points[i].x}
                  y={padT + chartH + 16}
                  textAnchor="middle"
                  fontSize={8}
                  fill={Colors.textMuted}
                >
                  {d.label ?? ''}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </View>
    </View>
  );
}
