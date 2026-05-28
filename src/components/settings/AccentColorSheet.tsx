import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Text as T } from '@design/components';
import { useSettingsStore } from '@store/useSettingsStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_OPTIONS: { color: string; label: string }[] = [
  { color: '#818CF8', label: 'Indigo' },
  { color: '#F472B6', label: 'Pink' },
  { color: '#FBBF24', label: 'Amber' },
  { color: '#34D399', label: 'Emerald' },
  { color: '#38BDF8', label: 'Sky' },
  { color: '#C084FC', label: 'Purple' },
  { color: '#F87171', label: 'Coral' },
  { color: '#A3E635', label: 'Lime' },
];

export const AccentColorSheet = React.forwardRef<BottomSheetRef, {}>((props, ref) => {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const ac = useAccentColors();
  
  const [customHex, setCustomHex] = React.useState('');

  const handleCustomHexSubmit = () => {
    let hex = customHex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(hex);
    if (isValidHex) {
      setAccentColor(hex.toUpperCase());
      setCustomHex('');
    }
  };

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

        {/* Custom Hex Input */}
        <View style={{ marginTop: Spacing[6] }}>
          <Text style={[T.label, { marginBottom: Spacing[2] }]}>Custom Color (HEX)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
            <View style={{ flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderWidth: 1, borderColor: Colors.border }}>
              <TextInput
                style={[T.body, { color: Colors.text }]}
                placeholder="#FF0000"
                placeholderTextColor={Colors.textMuted}
                value={customHex}
                onChangeText={setCustomHex}
                autoCapitalize="characters"
                onSubmitEditing={handleCustomHexSubmit}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity 
              onPress={handleCustomHexSubmit}
              style={{ backgroundColor: ac.accent, paddingVertical: Spacing[3], paddingHorizontal: Spacing[4], borderRadius: Radius.md }}
            >
              <Text style={[T.smMedium, { color: '#fff' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
});
