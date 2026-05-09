/**
 * DashboardGrid — Persisted, reorderable widget list.
 * Long-press a widget card header to enter drag mode and swap positions.
 * Widget order saved to AsyncStorage.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  LayoutAnimation, UIManager, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Cards, Text as T, Buttons } from '@design/components';
import { useAccentColors } from '@/hooks/use-accent-colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = '@habitvault/dashboard_order';

export type WidgetId =
  | 'heatmap'
  | 'streak'
  | 'strength'
  | 'weekday'
  | 'mood_trend'
  | 'insights'
  | 'category_analysis';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  icon: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'strength', title: 'Strength Score', icon: 'trophy-outline', visible: true },
  { id: 'heatmap', title: 'Activity Heatmap', icon: 'calendar-outline', visible: true },
  { id: 'streak', title: 'Best Streak', icon: 'flame-outline', visible: true },
  { id: 'weekday', title: 'Weekday Performance', icon: 'bar-chart-outline', visible: true },
  { id: 'category_analysis', title: 'Category Analysis', icon: 'pie-chart-outline', visible: true },
  { id: 'mood_trend', title: 'Mood Trend', icon: 'happy-outline', visible: true },
  { id: 'insights', title: 'Auto Insights', icon: 'bulb-outline', visible: true },
];

interface DashboardGridProps {
  renderWidget: (id: WidgetId, index: number) => React.ReactNode;
}

export function DashboardGrid({ renderWidget }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const ac = useAccentColors();

  // Load persisted order on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved: WidgetConfig[] = JSON.parse(raw);
        // Merge saved with defaults (in case new widgets were added)
        const merged = saved.filter((s) => DEFAULT_WIDGETS.find((d) => d.id === s.id));
        const newOnes = DEFAULT_WIDGETS.filter((d) => !saved.find((s) => s.id === d.id));
        setWidgets([...merged, ...newOnes]);
      } catch {
        /* use defaults */
      }
    });
  }, []);

  const persist = useCallback((newWidgets: WidgetConfig[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    Haptics.selectionAsync();
    Haptics.selectionAsync();
    setWidgets((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      persist(next);
      return next;
    });
  }, [persist]);

  const moveDown = useCallback((index: number) => {
    setWidgets((prev) => {
      if (index === prev.length - 1) return prev;
      Haptics.selectionAsync();
      Haptics.selectionAsync();
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleVisibility = useCallback((id: WidgetId) => {
    Haptics.selectionAsync();
    setWidgets((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, visible: !w.visible } : w);
      persist(next);
      return next;
    });
  }, [persist]);

  const visibleWidgets = widgets.filter((w) => w.visible);

  return (
    <View>
      {/* Edit mode toggle */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing[3] }}>
        <TouchableOpacity
          onPress={() => { setEditMode((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[Buttons.ghost, {
            flexDirection: 'row', gap: Spacing[2],
            borderWidth: 1, borderColor: editMode ? ac.accent : Colors.border,
            borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
          }]}
        >
          <Ionicons
            name={editMode ? 'checkmark' : 'grid-outline'}
            size={16}
            color={editMode ? ac.accent : Colors.textSecondary}
          />
          <Text style={[T.sm, { color: editMode ? ac.accent : Colors.textSecondary }]}>
            {editMode ? 'Done' : 'Arrange'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit panel — all widgets with visibility and reorder */}
      {editMode && (
        <Animated.View entering={FadeIn.duration(250)} style={[Cards.base, { marginBottom: Spacing[4] }]}>
          <Text style={[T.label, { marginBottom: Spacing[3] }]}>Arrange Widgets</Text>
          {widgets.map((widget, index) => (
            <View
              key={widget.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
                paddingVertical: Spacing[2],
                borderBottomWidth: index < widgets.length - 1 ? 1 : 0,
                borderBottomColor: Colors.border,
              }}
            >
              {/* Icon + name */}
              <Ionicons name={widget.icon as any} size={18} color={Colors.textMuted} />
              <Text style={[T.bodyMedium, { flex: 1, color: widget.visible ? Colors.text : Colors.textDim }]}>
                {widget.title}
              </Text>

              {/* Visibility toggle */}
              <TouchableOpacity onPress={() => toggleVisibility(widget.id)}>
                <Ionicons
                  name={widget.visible ? 'eye' : 'eye-off-outline'}
                  size={18}
                  color={widget.visible ? ac.accent : Colors.textDim}
                />
              </TouchableOpacity>

              {/* Up / down */}
              <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
                <Ionicons name="chevron-up" size={18} color={index === 0 ? Colors.textDim : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(index)} disabled={index === widgets.length - 1}>
                <Ionicons name="chevron-down" size={18} color={index === widgets.length - 1 ? Colors.textDim : Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Visible widgets */}
      {visibleWidgets.map((widget, i) => (
        <Animated.View key={widget.id} entering={FadeInDown.delay(i * 60).duration(350)} layout={LinearTransition.springify()}>
          {renderWidget(widget.id, i)}
        </Animated.View>
      ))}

      {visibleWidgets.length === 0 && (
        <View style={[Cards.compact, { alignItems: 'center', paddingVertical: Spacing[8] }]}>
          <Ionicons name="eye-off-outline" size={32} color={Colors.textMuted} />
          <Text style={[T.caption, { marginTop: Spacing[2] }]}>All widgets are hidden. Tap Arrange to show them.</Text>
        </View>
      )}
    </View>
  );
}
