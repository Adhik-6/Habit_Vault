import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Text as T } from '@design/components';
import { useSettingsStore } from '@store/useSettingsStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_OPTIONS: { color: string; label: string }[] = [
  { color: '#6366F1', label: 'Indigo' },
  { color: '#EC4899', label: 'Pink' },
  { color: '#F59E0B', label: 'Amber' },
  { color: '#10B981', label: 'Emerald' },
  { color: '#38BDF8', label: 'Sky' },
  { color: '#A855F7', label: 'Purple' },
  { color: '#EF4444', label: 'Red' },
  { color: '#84CC16', label: 'Lime' },
];

export const AccentColorSheet = React.forwardRef<BottomSheetRef, {}>((props, ref) => {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const ac = useAccentColors();

  return (
    <BottomSheet ref={ref} title="Accent Color">
      <View style={{ paddingBottom: Spacing[8] }}>
        <Text style={[T.body, { color: Colors.textSecondary, marginBottom: Spacing[4] }]}>
          Choose a theme color. It affects buttons, heatmap, calendar highlights, and other accented elements throughout the app.
        </Text>

        {/* Live preview strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing[3],
            backgroundColor: ac.accentMuted,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: ac.accentDim,
            padding: Spacing[3],
            marginBottom: Spacing[5],
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: Radius.full,
              backgroundColor: ac.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[T.bodyMedium, { color: ac.accentGlow }]}>Preview</Text>
            <Text style={[T.caption, { color: Colors.textSecondary }]}>
              This is how your accent color looks
            </Text>
          </View>
          {/* Mini heatmap swatch */}
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {ac.heatmapTiers.slice(1).map((c, i) => (
              <View
                key={i}
                style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: c }}
              />
            ))}
          </View>
        </View>

        {/* Color grid */}
        <View style={{ flexDirection: 'row', gap: Spacing[3], flexWrap: 'wrap' }}>
          {ACCENT_OPTIONS.map(({ color, label }) => {
            const isSelected = accentColor === color;
            return (
              <TouchableOpacity
                key={color}
                onPress={() => setAccentColor(color)}
                style={{ alignItems: 'center', gap: Spacing[1] }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: '#fff',
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.6 : 0,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 0,
                  }}
                >
                  {isSelected && <Ionicons name="checkmark" size={22} color="#fff" />}
                </View>
                <Text style={[T.xs, { color: isSelected ? color : Colors.textMuted }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
});
